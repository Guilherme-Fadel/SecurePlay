import { DataSource } from 'typeorm';
import { UsuarioAula } from './usuario-aula.entity';

export const usuarioAulaProviders = [
  {
    provide: 'USUARIO_AULA_REPOSITORY',
    useFactory: (dataSource: DataSource) => dataSource.getRepository(UsuarioAula),
    inject: ['DATA_SOURCE'],
  },
];
