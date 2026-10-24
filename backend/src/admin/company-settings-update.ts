import { NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Empresa } from '../empresa/empresa.entity';
import { EmpresaParametrosAudit } from '../empresa/empresa-parametros-audit.entity';
import { resolveCompanyParameters } from '../config/features';
import { UpdateCompanySettingsDto } from './dto/update-company-settings.dto';
import {
  registrationConflict,
  saveRegistration,
  type RegistrationData,
} from './company-registration';

export function updateRegisteredCompany(
  source: DataSource,
  input: {
    empresaId: number;
    userId: number;
    dto: UpdateCompanySettingsDto;
    validateLogo: (company: Empresa, key: string | null) => void;
  },
) {
  const { empresaId, userId, dto, validateLogo } = input;
  return source
    .transaction(async (manager) => {
      const target = await manager.findOne(Empresa, {
        where: { id: empresaId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!target) throw new NotFoundException('Empresa não encontrada');
      const oldName = target.nome;
      const anterior = resolveCompanyParameters(
        target.parametros_funcionalidades,
      );
      if (dto.nome !== undefined) target.nome = dto.nome.trim();
      if (dto.paleta) target.paleta = dto.paleta;
      if (dto.logo_url !== undefined) {
        validateLogo(target, dto.logo_url);
        target.logo_url = dto.logo_url;
      }
      if (dto.parametros)
        target.parametros_funcionalidades = resolveCompanyParameters(
          dto.parametros,
        );
      await manager.save(Empresa, target);
      let cadastro: RegistrationData | undefined;
      if (
        dto.cadastro !== undefined ||
        (dto.nome !== undefined && oldName !== target.nome)
      ) {
        cadastro = await saveRegistration(
          manager,
          empresaId,
          userId,
          dto.cadastro,
          oldName,
          target.nome,
        );
      }
      if (
        dto.parametros &&
        JSON.stringify(anterior) !==
          JSON.stringify(target.parametros_funcionalidades)
      ) {
        await manager.save(EmpresaParametrosAudit, {
          empresa_id: empresaId,
          alterado_por_id: userId,
          anterior,
          atual: resolveCompanyParameters(target.parametros_funcionalidades),
        });
      }
      return { target, cadastro };
    })
    .catch(registrationConflict);
}
