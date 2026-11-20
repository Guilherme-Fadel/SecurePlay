import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.molule';
import { achievementsProviders } from './achievements.providers';
import { usuarioStatsProviders } from '../usuario-stats/usuario-stats.providers';
import { usuarioChallengeProviders } from '../usuario-challenge/usuario-challenge.providers';
import { usuarioAulaProviders } from '../conteudo/usuario-aula/usuario-aula.providers';
import { usuarioArcadeStatsProviders } from '../arcade/arcade.providers';
import { AchievementsController } from './achievements.controller';
import { AchievementsService } from './achievements.service';
import { UnlockFactsLoader } from './unlock-evaluator';
import { DashboardModule } from '../dashboard/dashboard.module';
import { RedisModule } from '../redis/redis.module';
import { S3Service } from '../conteudo/s3/s3.service';
import { AdminAuditService } from '../admin/admin-audit.service';
import { AdminCollectiblesController } from './admin-collectibles.controller';
import { AdminCollectiblesService } from './admin-collectibles.service';
import { AdminCollectiblesArtService } from './admin-collectibles-art.service';

@Module({
  imports: [DatabaseModule, DashboardModule, RedisModule],
  controllers: [AchievementsController, AdminCollectiblesController],
  providers: [
    ...achievementsProviders,
    ...usuarioStatsProviders,
    ...usuarioChallengeProviders,
    ...usuarioAulaProviders,
    ...usuarioArcadeStatsProviders,
    AchievementsService,
    UnlockFactsLoader,
    S3Service,
    // Serviço sem estado sobre DATA_SOURCE, como em TurmaModule; evita importar AdminModule.
    AdminAuditService,
    AdminCollectiblesService,
    AdminCollectiblesArtService,
  ],
  exports: [AchievementsService, UnlockFactsLoader],
})
export class AchievementsModule {}
