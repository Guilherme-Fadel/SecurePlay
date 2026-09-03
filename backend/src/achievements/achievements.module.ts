import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.molule';
import { achievementsProviders } from './achievements.providers';
import { usuarioStatsProviders } from '../usuario-stats/usuario-stats.providers';
import { usuarioChallengeProviders } from '../usuario-challenge/usuario-challenge.providers';
import { usuarioAulaProviders } from '../conteudo/usuario-aula/usuario-aula.providers';
import { usuarioArcadeStatsProviders } from '../arcade/arcade.providers';
import { AchievementsController } from './achievements.controller';
import { AchievementsService } from './achievements.service';
import { S3Service } from '../conteudo/s3/s3.service';

@Module({
  imports: [DatabaseModule],
  controllers: [AchievementsController],
  providers: [
    ...achievementsProviders,
    ...usuarioStatsProviders,
    ...usuarioChallengeProviders,
    ...usuarioAulaProviders,
    ...usuarioArcadeStatsProviders,
    AchievementsService,
    S3Service,
  ],
  exports: [AchievementsService],
})
export class AchievementsModule {}
