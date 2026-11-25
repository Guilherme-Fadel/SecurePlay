import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { AdminAuditService } from '../admin/admin-audit.service';
import { S3Service } from '../conteudo/s3/s3.service';
import { CosmeticItem } from './entities/cosmetic-item.entity';
import { CosmeticKit } from './entities/cosmetic-kit.entity';
import { applyItemFields, applyKitFields } from './collectible-fields';
import {
  assertFestiveSchedule,
  assertItemVisual,
  assertKitArt,
  assertSlugUnchanged,
} from './collectible-rules';
import { assertUniqueSlots, syncKitPieces } from './collectible-kit-pieces';
import {
  isCurrentPiece,
  toItemView,
  toKitView,
  CollectibleItemView,
  CollectibleKitView,
} from './collectible-views';
import { CollectibleFilters } from './collectible-pagination';
import { listItems, listKits } from './collectible-listing';
import {
  asOwnersConflict,
  deleteUnusedArt,
  removeItem,
  removeKit,
} from './collectible-removal';
import type { CollectibleItemDto } from './dto/collectible-item.dto';
import type { CollectibleKitDto } from './dto/collectible-kit.dto';

export type { CollectibleFilters };
export type CollectibleKind = 'items' | 'kits';

type AuditAction = 'created' | 'updated' | 'published' | 'archived' | 'deleted';

/** Os colecionáveis são globais da plataforma: não pertencem a nenhuma empresa. */
const PLATFORM_AUDIT_SCOPE = 0;
const PIECE_OF_KIT = 'Peça de kit: edite pelo kit';
const LOCK = { mode: 'pessimistic_write' } as const;

@Injectable()
export class AdminCollectiblesService {
  private readonly logger = new Logger(AdminCollectiblesService.name);

  constructor(
    @Inject('DATA_SOURCE') private readonly dataSource: DataSource,
    private readonly audit: AdminAuditService,
    private readonly s3: S3Service,
  ) {}

  private readonly resolveArt = (key: string | null) =>
    this.s3.resolveImageUrl(key);

  /** A arte salva precisa estar no bucket configurado e existir (já confirmada). */
  private readonly assertArt = async (artKey: string) => {
    await this.s3.resolveImageUrl(artKey);
    const prefix = this.s3.toS3Uri('');
    const key = artKey.slice(prefix.length);
    if (!artKey.startsWith(prefix) || !(await this.s3.headObject(key))) {
      throw new BadRequestException(
        'Arte não encontrada: envie e confirme de novo.',
      );
    }
  };

  private record(
    manager: EntityManager,
    actorId: number,
    action: AuditAction,
    target: { kind: CollectibleKind; id: number; slug: string },
  ) {
    return this.audit.registrar(
      {
        empresaId: PLATFORM_AUDIT_SCOPE,
        atorId: actorId,
        acao: `collectible.${action}`,
        alvoTipo:
          target.kind === 'kits' ? 'collectible_kit' : 'collectible_item',
        alvoId: target.id,
        detalhes: { slug: target.slug },
      },
      manager,
    );
  }

  listItems(filters: CollectibleFilters) {
    return listItems(this.dataSource, filters, this.resolveArt);
  }

  listKits(filters: CollectibleFilters) {
    return listKits(this.dataSource, filters, this.resolveArt);
  }

  async createItem(actorId: number, dto: CollectibleItemDto) {
    this.assertNotKitPiece(dto);
    return this.dataSource.transaction(async (manager) => {
      const items = manager.getRepository(CosmeticItem);
      await this.assertSlugFree(manager, CosmeticItem, dto.slug);
      const item = items.create({ kit_id: null, active: false });
      await applyItemFields(item, dto, this.assertArt);
      await items.save(item);
      await this.record(manager, actorId, 'created', {
        kind: 'items',
        id: item.id,
        slug: item.slug,
      });
      return toItemView(item, this.resolveArt);
    });
  }

  async updateItem(actorId: number, id: number, dto: CollectibleItemDto) {
    this.assertNotKitPiece(dto);
    return this.dataSource.transaction(async (manager) => {
      const items = manager.getRepository(CosmeticItem);
      const item = await this.findItem(manager, id);
      assertSlugUnchanged(item.slug, dto.slug);
      await applyItemFields(item, dto, this.assertArt);
      if (item.active) {
        assertFestiveSchedule(item);
        assertItemVisual(item);
      }
      await items.save(item);
      await this.record(manager, actorId, 'updated', {
        kind: 'items',
        id: item.id,
        slug: item.slug,
      });
      return toItemView(item, this.resolveArt);
    });
  }

  async createKit(actorId: number, dto: CollectibleKitDto) {
    assertUniqueSlots(dto.pieces);
    return this.dataSource.transaction(async (manager) => {
      const kits = manager.getRepository(CosmeticKit);
      await this.assertSlugFree(manager, CosmeticKit, dto.slug);
      const kit = kits.create({ active: false });
      applyKitFields(kit, dto);
      await kits.save(kit);
      const pieces = await syncKitPieces(
        manager,
        kit,
        dto.pieces,
        this.assertArt,
      );
      await this.record(manager, actorId, 'created', {
        kind: 'kits',
        id: kit.id,
        slug: kit.slug,
      });
      return toKitView(kit, pieces, this.resolveArt);
    });
  }

  async updateKit(actorId: number, id: number, dto: CollectibleKitDto) {
    assertUniqueSlots(dto.pieces);
    return this.dataSource.transaction(async (manager) => {
      const kits = manager.getRepository(CosmeticKit);
      const kit = await this.findKit(manager, id);
      assertSlugUnchanged(kit.slug, dto.slug);
      applyKitFields(kit, dto);
      await kits.save(kit);
      const pieces = await syncKitPieces(
        manager,
        kit,
        dto.pieces,
        this.assertArt,
      );
      if (kit.active) {
        assertFestiveSchedule(kit);
        assertKitArt(pieces.filter(isCurrentPiece));
      }
      await this.record(manager, actorId, 'updated', {
        kind: 'kits',
        id: kit.id,
        slug: kit.slug,
      });
      return toKitView(kit, pieces, this.resolveArt);
    });
  }

  publish(actorId: number, kind: CollectibleKind, id: number) {
    return this.setActive(actorId, kind, id, true);
  }

  archive(actorId: number, kind: CollectibleKind, id: number) {
    return this.setActive(actorId, kind, id, false);
  }

  /** Exclui só o que nenhum aluno tem; a contagem e a exclusão ficam na mesma transação. */
  async remove(actorId: number, kind: CollectibleKind, id: number) {
    const removed = await this.dataSource
      .transaction(async (manager) => {
        const result =
          kind === 'items'
            ? await removeItem(manager, id)
            : await removeKit(manager, id);
        await this.record(manager, actorId, 'deleted', {
          kind,
          id,
          slug: result.slug,
        });
        return result;
      })
      .catch((error: unknown) => {
        throw asOwnersConflict(error);
      });
    await deleteUnusedArt(
      this.dataSource,
      this.s3,
      this.logger,
      removed.artKeys,
    );
    return { ok: true };
  }

  private setActive(
    actorId: number,
    kind: CollectibleKind,
    id: number,
    active: boolean,
  ): Promise<CollectibleKitView | CollectibleItemView> {
    return this.dataSource.transaction(async (manager) => {
      const view =
        kind === 'items'
          ? await this.setItemActive(manager, id, active)
          : await this.setKitActive(manager, id, active);
      await this.record(manager, actorId, active ? 'published' : 'archived', {
        kind,
        id,
        slug: view.slug,
      });
      return view;
    });
  }

  private async setItemActive(
    manager: EntityManager,
    id: number,
    active: boolean,
  ) {
    const item = await this.findItem(manager, id);
    if (active) {
      assertFestiveSchedule(item);
      assertItemVisual(item);
    }
    item.active = active;
    await manager.getRepository(CosmeticItem).save(item);
    return toItemView(item, this.resolveArt);
  }

  /** Peças atuais acompanham o kit; peças removidas ficam sempre arquivadas. */
  private async setKitActive(
    manager: EntityManager,
    id: number,
    active: boolean,
  ) {
    const kit = await this.findKit(manager, id);
    const items = manager.getRepository(CosmeticItem);
    const pieces = await items.find({ where: { kit_id: kit.id } });
    if (active) {
      assertFestiveSchedule(kit);
      assertKitArt(pieces.filter(isCurrentPiece));
    }
    kit.active = active;
    await manager.getRepository(CosmeticKit).save(kit);
    for (const piece of pieces) {
      piece.active = active && isCurrentPiece(piece);
      await items.save(piece);
    }
    return toKitView(kit, pieces, this.resolveArt);
  }

  private assertNotKitPiece(dto: CollectibleItemDto) {
    if (dto.kitId !== undefined && dto.kitId !== null) {
      throw new BadRequestException('Peça de kit: crie pelo kit');
    }
  }

  private async findItem(manager: EntityManager, id: number) {
    const item = await manager
      .getRepository(CosmeticItem)
      .findOne({ where: { id }, lock: LOCK });
    if (!item) throw new NotFoundException('Item não encontrado');
    if (item.kit_id !== null) throw new BadRequestException(PIECE_OF_KIT);
    return item;
  }

  private async findKit(manager: EntityManager, id: number) {
    const kit = await manager
      .getRepository(CosmeticKit)
      .findOne({ where: { id }, lock: LOCK });
    if (!kit) throw new NotFoundException('Kit não encontrado');
    return kit;
  }

  private async assertSlugFree(
    manager: EntityManager,
    entity: typeof CosmeticItem | typeof CosmeticKit,
    slug: string,
  ) {
    const taken = await manager
      .getRepository<{ id: number; slug: string }>(entity)
      .findOne({ where: { slug } });
    if (taken)
      throw new ConflictException('Já existe um registro com este slug');
  }
}
