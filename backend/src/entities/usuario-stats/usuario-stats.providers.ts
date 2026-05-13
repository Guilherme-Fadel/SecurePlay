import { DataSource } from 'typeorm';
import { UsuarioStats } from './usuario-stats.entity';

export const usuarioStatsProviders = [
  {
    provide: 'USUARIO_STATS_REPOSITORY',
    useFactory: (dataSource: DataSource) => dataSource.getRepository(UsuarioStats),
    inject: ['DATA_SOURCE'],
  },
];
