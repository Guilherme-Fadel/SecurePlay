import { BadRequestException } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { DataSource } from 'typeorm';
import { Empresa } from '../empresa/empresa.entity';
import { Usuario } from '../usuario/usuario.entity';
import { Role } from '../auth/roles.enum';
import { resolveCompanyParameters } from '../config/features';
import { Convite } from './entities/convite.entity';
import { CompanyRegistrationDto } from './dto/company-registration.dto';
import {
  normalizeRegistration,
  registrationConflict,
  saveRegistration,
} from './company-registration';

export async function createRegisteredCompany(
  source: DataSource,
  input: {
    nome: string;
    emailAdministrador: string;
    criadoPorId: number;
    cadastro: CompanyRegistrationDto;
  },
) {
  const registration = normalizeRegistration(input.cadastro, true);
  const nome = input.nome.trim();
  const email = input.emailAdministrador.trim().toLowerCase();
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + 7 * 86400000);
  const empresa = await source
    .transaction(async (manager) => {
      const companies = manager.getRepository(Empresa);
      if (await companies.findOne({ where: { nome } }))
        throw new BadRequestException('Já existe uma empresa com este nome');
      if (await manager.getRepository(Usuario).findOne({ where: { email } }))
        throw new BadRequestException(
          'Este e-mail já possui um acesso cadastrado',
        );
      const company = await companies.save(
        companies.create({
          nome,
          logo_url: null,
          paleta: null,
          parametros_funcionalidades: resolveCompanyParameters(),
        }),
      );
      await saveRegistration(
        manager,
        company.id,
        input.criadoPorId,
        registration,
      );
      const invites = manager.getRepository(Convite);
      await invites.save(
        invites.create({
          token_hash: createHash('sha256').update(token).digest('hex'),
          email,
          empresa_id: company.id,
          criado_por_id: input.criadoPorId,
          expires_at: expiresAt,
          max_uses: 1,
          role: Role.ADMIN,
        }),
      );
      return company;
    })
    .catch(registrationConflict);
  return {
    empresa: {
      id: empresa.id,
      nome: empresa.nome,
      paleta: empresa.paleta,
      logo_url: null,
      logo_preview_url: null,
    },
    token,
  };
}
