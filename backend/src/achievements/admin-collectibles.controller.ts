import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseEnumPipe,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
} from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/roles.enum';
import { AdminCollectiblesService } from './admin-collectibles.service';
import type { CollectibleKind } from './admin-collectibles.service';
import { AdminCollectiblesArtService } from './admin-collectibles-art.service';
import { CollectibleItemDto } from './dto/collectible-item.dto';
import { CollectibleKitDto } from './dto/collectible-kit.dto';
import { CollectibleListQueryDto } from './dto/collectible-list-query.dto';
import { ArtConfirmDto, ArtUploadDto } from './dto/collectible-art.dto';

type AdminRequest = { user: { userId: number } };

const KINDS = { items: 'items', kits: 'kits' } as const;
@Controller('admin/collectibles')
@Roles(Role.PLATFORM_ADMIN)
export class AdminCollectiblesController {
  constructor(
    private readonly collectibles: AdminCollectiblesService,
    private readonly art: AdminCollectiblesArtService,
  ) {}

  @Get('items')
  listItems(@Query() query: CollectibleListQueryDto) {
    return this.collectibles.listItems(this.filters(query));
  }

  @Get('kits')
  listKits(@Query() query: CollectibleListQueryDto) {
    return this.collectibles.listKits(this.filters(query));
  }

  private filters({ page, pageSize, ...rest }: CollectibleListQueryDto) {
    return { ...rest, page: Number(page), pageSize: Number(pageSize) };
  }

  @Post('items')
  createItem(@Request() req: AdminRequest, @Body() body: CollectibleItemDto) {
    return this.collectibles.createItem(req.user.userId, body);
  }

  @Patch('items/:id')
  updateItem(
    @Request() req: AdminRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CollectibleItemDto,
  ) {
    return this.collectibles.updateItem(req.user.userId, id, body);
  }

  @Post('kits')
  createKit(@Request() req: AdminRequest, @Body() body: CollectibleKitDto) {
    return this.collectibles.createKit(req.user.userId, body);
  }

  @Patch('kits/:id')
  updateKit(
    @Request() req: AdminRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CollectibleKitDto,
  ) {
    return this.collectibles.updateKit(req.user.userId, id, body);
  }

  @Post('art/upload')
  createArtUpload(@Body() body: ArtUploadDto) {
    return this.art.createUpload(body.contentType);
  }

  @Post('art/confirm')
  confirmArt(@Body() body: ArtConfirmDto) {
    return this.art.confirm(body.key);
  }

  @Post(':kind/:id/publish')
  publish(
    @Request() req: AdminRequest,
    @Param('kind', new ParseEnumPipe(KINDS)) kind: CollectibleKind,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.collectibles.publish(req.user.userId, kind, id);
  }

  @Post(':kind/:id/archive')
  archive(
    @Request() req: AdminRequest,
    @Param('kind', new ParseEnumPipe(KINDS)) kind: CollectibleKind,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.collectibles.archive(req.user.userId, kind, id);
  }

  @Delete(':kind/:id')
  remove(
    @Request() req: AdminRequest,
    @Param('kind', new ParseEnumPipe(KINDS)) kind: CollectibleKind,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.collectibles.remove(req.user.userId, kind, id);
  }
}
