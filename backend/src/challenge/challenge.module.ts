import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.molule';
import { ChallengeService } from './challenge.service';
import { ChallengeController } from './challenge.controller';
import { challengeProviders } from './challenge.providers';
import { questionProviders } from '../question/question.providers';
import { usuarioChallengeProviders } from '../usuario-challenge/usuario-challenge.providers';
import { usuarioStatsProviders } from '../usuario-stats/usuario-stats.providers';
import { RedisModule } from '../redis/redis.module';
import { GamificationModule } from '../common/gamification/gamification.module';

@Module({
  imports: [DatabaseModule, RedisModule, GamificationModule],
  controllers: [ChallengeController],
  providers: [
    ...challengeProviders,
    ...questionProviders,
    ...usuarioChallengeProviders,
    ...usuarioStatsProviders,
    ChallengeService,
  ],
  exports: [ChallengeService],
})
export class ChallengeModule {}
