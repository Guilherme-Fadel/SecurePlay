import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.molule';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { usuarioStatsProviders } from '../entities/usuario-stats/usuario-stats.providers';
import { usuarioChallengeProviders } from '../entities/usuario-challenge/usuario-challenge.providers';

@Module({
  imports: [DatabaseModule],
  controllers: [DashboardController],
  providers: [
    ...usuarioStatsProviders,
    ...usuarioChallengeProviders,
    DashboardService,
  ],
  exports: [DashboardService],
})
export class DashboardModule {}
