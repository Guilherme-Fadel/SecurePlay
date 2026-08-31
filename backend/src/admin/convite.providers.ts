import { DataSource } from 'typeorm';
import { Convite } from './entities/convite.entity';

export const conviteProviders = [
  {
    provide: 'CONVITE_REPOSITORY',
    useFactory: (dataSource: DataSource) => dataSource.getRepository(Convite),
    inject: ['DATA_SOURCE'],
  },
];
