import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
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

  async forUser(
    userId: number,
    manager?: EntityManager,
  ): Promise<CompanyParameters> {
    // Query builder: uma consulta só. `findOne` com relations vira 2 consultas
    // (ids distintos + dados), e cada uma custa a latência de rede até o banco.
    const usuario = await (manager ?? this.dataSource)
      .getRepository(Usuario)
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.empresa', 'empresa')
      .where('u.id = :userId', { userId })
      .getOne();
    if (usuario?.role === Role.PLATFORM_ADMIN) return platformAdminParameters();
    const parameters = usuario?.empresa
      ? resolveCompanyParameters(usuario.empresa.parametros_funcionalidades)
      : noCompanyParameters();
    return usuario?.trial_started_at
      ? { ...parameters, globalRankingEnabled: false }
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

  async requireGame(userId: number, slug: string, manager?: EntityManager) {
    const parameters = await this.forUser(userId, manager);
    if (!parameters.enabledGames.some((game) => game === slug)) {
      throw new NotFoundException('Jogo não disponível para sua empresa');
    }
  }
}
