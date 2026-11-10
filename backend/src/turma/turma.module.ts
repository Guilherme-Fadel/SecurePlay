import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.molule';
import { turmaProviders } from './turma.providers';

@Module({
  imports: [DatabaseModule],
  providers: [...turmaProviders],
  exports: [...turmaProviders],
})
export class TurmaModule {}
