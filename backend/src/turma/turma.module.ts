import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.molule';
import { turmaProviders } from './turma.providers';
import { JornadaTurmaService } from './jornada-turma.service';

@Module({
  imports: [DatabaseModule],
  providers: [...turmaProviders, JornadaTurmaService],
  exports: [...turmaProviders, JornadaTurmaService],
})
export class TurmaModule {}
