import { DataSource } from 'typeorm';
import { Modulo } from './modulo.entity';

export const moduloProviders = [
  {
    provide: 'MODULO_REPOSITORY',
    useFactory: (dataSource: DataSource) => dataSource.getRepository(Modulo),
    inject: ['DATA_SOURCE'],
  },
];
