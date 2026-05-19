import { DataSource } from 'typeorm';
import { UsuarioChallenge } from './usuario-challenge.entity';

export const usuarioChallengeProviders = [
  {
    provide: 'USUARIO_CHALLENGE_REPOSITORY',
    useFactory: (dataSource: DataSource) => dataSource.getRepository(UsuarioChallenge),
    inject: ['DATA_SOURCE'],
  },
];
