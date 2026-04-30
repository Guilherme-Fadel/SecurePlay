import { DataSource } from 'typeorm';
import { Benefits } from './benefits.entity';

export const benefitsProviders = [
  {
    provide: 'BENEFITS_REPOSITORY',
    useFactory: (dataSource: DataSource) => dataSource.getRepository(Benefits),
    inject: ['DATA_SOURCE'],
  },
];
