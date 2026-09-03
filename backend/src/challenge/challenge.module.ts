import { Module } from '@nestjs/common';
import { S3Service } from '../conteudo/s3/s3.service';
import { DatabaseModule } from '../database/database.molule';
import { ChallengeService } from './challenge.service';
import { ChallengeController } from './challenge.controller';
import { challengeProviders } from './challenge.providers';
import { questionProviders } from '../question/question.providers';
import { usuarioChallengeProviders } from '../usuario-challenge/usuario-challenge.providers';
import { usuarioStatsProviders } from '../usuario-stats/usuario-stats.providers';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [DatabaseModule, RedisModule],
  controllers: [ChallengeController],
  providers: [
    S3Service,
    ...challengeProviders,
    ...questionProviders,
    ...usuarioChallengeProviders,
    ...usuarioStatsProviders,
    ChallengeService,
  ],
  exports: [ChallengeService],
})
export class ChallengeModule {}
