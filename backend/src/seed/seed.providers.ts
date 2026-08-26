import { DataSource } from 'typeorm';
import { Usuario } from '../usuario/usuario.entity';
import { UsuarioStats } from '../usuario-stats/usuario-stats.entity';

export const seedProviders = [
  {
    provide: 'USUARIO_REPOSITORY',
    useFactory: (dataSource: DataSource) => dataSource.getRepository(Usuario),
    inject: ['DATA_SOURCE'],
  },
  {
    provide: 'USUARIO_STATS_REPOSITORY',
    useFactory: (dataSource: DataSource) =>
      dataSource.getRepository(UsuarioStats),
    inject: ['DATA_SOURCE'],
  },
];
