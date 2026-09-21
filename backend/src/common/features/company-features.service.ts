import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Usuario } from '../../usuario/usuario.entity';
import { Role } from '../../auth/roles.enum';
import {
  CompanyParameters,
  FeatureName,
  isFeatureEnabled,
  noCompanyParameters,
  platformAdminParameters,
  resolveCompanyParameters,
} from '../../config/features';

@Injectable()
export class CompanyFeaturesService {
  constructor(@Inject('DATA_SOURCE') private readonly dataSource: DataSource) {}

  async forUser(userId: number): Promise<CompanyParameters> {
    const usuario = await this.dataSource.getRepository(Usuario).findOne({
      where: { id: userId },
      relations: ['empresa'],
    });
    if (usuario?.role === Role.PLATFORM_ADMIN) return platformAdminParameters();
    const parameters = usuario?.empresa
      ? resolveCompanyParameters(usuario.empresa.parametros_funcionalidades)
      : noCompanyParameters();
    return usuario?.trial_started_at
      ? { ...parameters, rankingEnabled: false, globalRankingEnabled: false }
      : parameters;
  }

  async requireFeature(userId: number, feature: FeatureName) {
    const parameters = await this.forUser(userId);
    if (!isFeatureEnabled(parameters, feature)) {
      throw new NotFoundException(
        'Funcionalidade não disponível para sua empresa',
      );
    }
    return parameters;
  }

  async requireGame(userId: number, slug: string) {
    const parameters = await this.forUser(userId);
    if (!parameters.enabledGames.some((game) => game === slug)) {
      throw new NotFoundException('Jogo não disponível para sua empresa');
    }
  }
}
