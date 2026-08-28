import { DataSource } from 'typeorm';
import { Empresa } from './empresa.entity';

export const empresaProviders = [
  {
    provide: 'EMPRESA_REPOSITORY',
    useFactory: (dataSource: DataSource) => dataSource.getRepository(Empresa),
    inject: ['DATA_SOURCE'],
  },
];
