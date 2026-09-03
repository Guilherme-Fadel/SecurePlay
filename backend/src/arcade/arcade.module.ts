import { Module } from '@nestjs/common';
import { S3Service } from '../conteudo/s3/s3.service';
import { DatabaseModule } from '../database/database.molule';
import { RedisModule } from '../redis/redis.module';
import { GamificationModule } from '../common/gamification/gamification.module';
import { ArcadeController } from './arcade.controller';
import { ArcadeService } from './arcade.service';
import { TokenService } from './token.service';
import { arcadeProviders } from './arcade.providers';
import { questionProviders } from '../question/question.providers';
import { QuizRelampagoHandler } from './games/quiz-relampago.handler';
import { PhishingHandler } from './games/phishing.handler';
import { DataClassifyHandler } from './games/data-classify.handler';

@Module({
  imports: [DatabaseModule, RedisModule, GamificationModule],
  controllers: [ArcadeController],
  providers: [
    S3Service,
    ...arcadeProviders,
    ...questionProviders,
    TokenService,
    QuizRelampagoHandler,
    PhishingHandler,
    DataClassifyHandler,
    ArcadeService,
  ],
  exports: [TokenService],
})
export class ArcadeModule {}
