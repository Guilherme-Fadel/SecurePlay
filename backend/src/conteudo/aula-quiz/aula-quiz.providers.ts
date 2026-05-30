import { DataSource } from 'typeorm';
import { AulaQuiz } from './aula-quiz.entity';

export const aulaQuizProviders = [
  {
    provide: 'AULA_QUIZ_REPOSITORY',
    useFactory: (dataSource: DataSource) => dataSource.getRepository(AulaQuiz),
    inject: ['DATA_SOURCE'],
  },
];
