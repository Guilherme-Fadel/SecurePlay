import { Module } from '@nestjs/common';
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
import { TermoDictionaryService } from './termotech-dictionary.service';

@Module({
  imports: [DatabaseModule, RedisModule, GamificationModule],
  controllers: [ArcadeController],
  providers: [
    ...arcadeProviders,
    ...questionProviders,
    TokenService,
    QuizRelampagoHandler,
    PhishingHandler,
    DataClassifyHandler,
    TermoDictionaryService,
    ArcadeService,
  ],
  exports: [TokenService],
})
export class ArcadeModule {}
