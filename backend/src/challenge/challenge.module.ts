import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.molule';
import { ChallengeService } from './challenge.service';
import { ChallengeController } from './challenge.controller';
import { challengeProviders } from './challenge.providers';
import { questionProviders } from '../question/question.providers';
import { usuarioChallengeProviders } from '../usuario-challenge/usuario-challenge.providers';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [DatabaseModule, RedisModule],
  controllers: [ChallengeController],
  providers: [
    ...challengeProviders,
    ...questionProviders,
    ...usuarioChallengeProviders,
    ChallengeService,
  ],
  exports: [ChallengeService],
})
export class ChallengeModule {}
