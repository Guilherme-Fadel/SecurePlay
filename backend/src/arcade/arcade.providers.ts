import { DataSource } from 'typeorm';
import { ArcadeGame } from './entities/arcade-game.entity';
import { PhishingSample } from './entities/phishing-sample.entity';
import { DataItem } from './entities/data-item.entity';

export const arcadeProviders = [
  {
    provide: 'ARCADE_GAME_REPOSITORY',
    useFactory: (dataSource: DataSource) => dataSource.getRepository(ArcadeGame),
    inject: ['DATA_SOURCE'],
  },
  {
    provide: 'PHISHING_SAMPLE_REPOSITORY',
    useFactory: (dataSource: DataSource) => dataSource.getRepository(PhishingSample),
    inject: ['DATA_SOURCE'],
  },
  {
    provide: 'DATA_ITEM_REPOSITORY',
    useFactory: (dataSource: DataSource) => dataSource.getRepository(DataItem),
    inject: ['DATA_SOURCE'],
  },
];
