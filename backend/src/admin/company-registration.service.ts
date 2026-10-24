import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Usuario } from '../usuario/usuario.entity';
import { Role } from '../auth/roles.enum';
import { Empresa } from '../empresa/empresa.entity';
import { CompanyRegistration } from './entities/company-registration.entity';
import {
  emptyRegistration,
  normalizeCnpj,
  requiredRegistrationFields,
  validCnpj,
} from './company-registration';
import { BadRequestException } from '@nestjs/common';

@Injectable()
export class CompanyRegistrationService {
  constructor(@Inject('DATA_SOURCE') private readonly source: DataSource) {}

  private async actor(userId: number, role: Role) {
    const user = await this.source
      .getRepository(Usuario)
      .findOne({ where: { id: userId } });
    if (!user?.active || user.role !== role)
      throw new ForbiddenException('Acesso não permitido');
    return user;
  }

  async own(userId: number) {
    const actor = await this.actor(userId, Role.ADMIN);
    if (!actor.empresa_id) throw new ForbiddenException('Empresa indisponível');
    return this.view(actor.empresa_id);
  }

  async platform(userId: number, empresaId: number) {
    await this.actor(userId, Role.PLATFORM_ADMIN);
    return this.view(empresaId);
  }

  private async view(empresaId: number) {
    const empresa = await this.source
      .getRepository(Empresa)
      .findOne({ where: { id: empresaId } });
    if (!empresa) throw new NotFoundException('Empresa não encontrada');
    const registration = await this.source
      .getRepository(CompanyRegistration)
      .findOne({ where: { empresa_id: empresaId } });
    const cadastro = emptyRegistration();
    for (const field of Object.keys(cadastro) as (keyof typeof cadastro)[])
      cadastro[field] = registration?.[field] ?? null;
    return {
      empresa_id: empresaId,
      nome: empresa.nome,
      cadastro,
      completo: requiredRegistrationFields.every((field) =>
        Boolean(cadastro[field]),
      ),
      atualizado_em: registration?.updated_at ?? null,
    };
  }

  async findCnpj(userId: number, value: string) {
    await this.actor(userId, Role.PLATFORM_ADMIN);
    if (typeof value !== 'string' || !validCnpj(value))
      throw new BadRequestException('CNPJ inválido');
    const rows = await this.source.getRepository(CompanyRegistration).find({
      where: { cnpj: normalizeCnpj(value) },
      select: { empresa_id: true, unidade: true },
      take: 20,
    });
    return rows.map((row) => ({
      empresa_id: row.empresa_id,
      unidade: row.unidade,
    }));
  }
}
