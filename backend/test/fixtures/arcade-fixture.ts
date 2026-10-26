import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DataSource } from 'typeorm';
import Redis from 'ioredis';
import { Empresa } from '../../src/empresa/empresa.entity';
import { Usuario } from '../../src/usuario/usuario.entity';
import { UsuarioStats } from '../../src/usuario-stats/usuario-stats.entity';
import { UsuarioChallenge } from '../../src/usuario-challenge/usuario-challenge.entity';
import { Challenge } from '../../src/challenge/challenge.entity';
import { Question } from '../../src/question/question.entity';
import { Modulo } from '../../src/conteudo/modulo/modulo.entity';
import { Aula } from '../../src/conteudo/aula/aula.entity';
import { AulaQuiz } from '../../src/conteudo/aula-quiz/aula-quiz.entity';
import { UsuarioAula } from '../../src/conteudo/usuario-aula/usuario-aula.entity';
import { Notification } from '../../src/notification/notification.entity';
import { RankingSeasonPoints } from '../../src/dashboard/ranking-season-points.entity';
import { RankingTracking } from '../../src/dashboard/ranking-tracking.entity';
import { RankingSeasonClose } from '../../src/dashboard/ranking-season-close.entity';
import { RankingSeasonSnapshot } from '../../src/dashboard/ranking-season-snapshot.entity';
import { ActivityCompletion } from '../../src/common/gamification/activity-completion.entity';
import { ActivityCompletionService } from '../../src/common/gamification/activity-completion.service';
import { RedisService } from '../../src/redis/redis.service';
import { ArcadeRun } from '../../src/arcade/entities/arcade-run.entity';
import { ArcadeDailyPlays } from '../../src/arcade/entities/arcade-daily-plays.entity';
import {
  ArcadeGame,
  ArcadeGameType,
} from '../../src/arcade/entities/arcade-game.entity';
import { UsuarioArcadeStats } from '../../src/arcade/entities/usuario-arcade-stats.entity';
import { DataItem } from '../../src/arcade/entities/data-item.entity';
import { PhishingSample } from '../../src/arcade/entities/phishing-sample.entity';
import { TokenService } from '../../src/arcade/token.service';
import { QuizRelampagoHandler } from '../../src/arcade/games/quiz-relampago.handler';
import { PhishingHandler } from '../../src/arcade/games/phishing.handler';
import { DataClassifyHandler } from '../../src/arcade/games/data-classify.handler';
import { CompanyFeaturesService } from '../../src/common/features/company-features.service';
import { ArcadeSubmissionService } from '../../src/arcade/arcade-submission.service';
import { ArcadeRunStore } from '../../src/arcade/arcade-run.store';
import { ArcadeService } from '../../src/arcade/arcade.service';
import { ActivityCompletion1793232000000 } from '../../src/database/migrations/1793232000000-activity-completion';
import { ArcadeRunCompletion1793318400000 } from '../../src/database/migrations/1793318400000-arcade-run-completion';

/** emitAsync aguarda Promises, embora on use ListenerFn:void nos tipos. */
export function listenProgress(
  events: EventEmitter2,
  listener: (payload: { usuarioId: number }) => Promise<void>,
): void {
  // eslint-disable-next-line @typescript-eslint/no-misused-promises -- produtor usa emitAsync para aguardar este listener
  events.on('progress.changed', listener);
}

function fixturePort(name: string) {
  if (process.env.RUN_ARCADE_INTEGRATION !== '1')
    throw new Error('Fixture C456 exige opt-in explícito');
  const port = Number(process.env[name]);
  if (!Number.isInteger(port) || port < 1024 || port > 65535)
    throw new Error('Informe as portas dos containers descartáveis C456');
  return port;
}

export async function openArcadeRedis() {
  const port = fixturePort('ARCADE_REDIS_PORT');
  const redis = new RedisService(
    new ConfigService({ REDIS_URL: `redis://127.0.0.1:${port}` }),
  );
  redis.onModuleInit();
  await redis.get('fixture-ready');
  return redis;
}

/** Descarta somente o banco/Redis dos containers C456. Nunca carrega .env/AppModule. */
export async function arcadeFixture() {
  const source = await new DataSource({
    type: 'mysql',
    host: '127.0.0.1',
    port: fixturePort('ARCADE_MYSQL_PORT'),
    username: 'root',
    password: 'arcade-fixture-only',
    database: 'arcade_completion_fixture',
    entities: [
      Empresa,
      Usuario,
      UsuarioStats,
      UsuarioChallenge,
      Challenge,
      Question,
      Modulo,
      Aula,
      AulaQuiz,
      UsuarioAula,
      Notification,
      RankingSeasonPoints,
      RankingTracking,
      RankingSeasonClose,
      RankingSeasonSnapshot,
      ActivityCompletion,
      ArcadeRun,
      ArcadeDailyPlays,
      ArcadeGame,
      UsuarioArcadeStats,
      DataItem,
      PhishingSample,
    ],
    timezone: '-03:00',
    synchronize: true,
    dropSchema: true,
    logging: false,
    poolSize: 20,
  }).initialize();
  const cleanup = new Redis({
    host: '127.0.0.1',
    port: fixturePort('ARCADE_REDIS_PORT'),
  });
  try {
    await cleanup.flushdb();
  } finally {
    await cleanup.quit();
  }
  const runner = source.createQueryRunner();
  try {
    await new ActivityCompletion1793232000000().up(runner);
    await new ArcadeRunCompletion1793318400000().up(runner);
  } finally {
    await runner.release();
  }
  const redis = await openArcadeRedis();
  const events = new EventEmitter2();
  const completions = new ActivityCompletionService(source, redis, events);
  const tokens = new TokenService(redis);
  const features = new CompanyFeaturesService(source);
  const quiz = new QuizRelampagoHandler(source.getRepository(Question));
  const phishing = new PhishingHandler(source.getRepository(PhishingSample));
  const classify = new DataClassifyHandler(source.getRepository(DataItem));
  const runs = new ArcadeRunStore(
    source,
    redis,
    completions,
    quiz,
    phishing,
    classify,
  );
  const submissions = new ArcadeSubmissionService(
    source,
    redis,
    tokens,
    completions,
    features,
    runs,
  );
  const arcade = new ArcadeService(
    source.getRepository(ArcadeGame),
    redis,
    tokens,
    quiz,
    phishing,
    classify,
    source.getRepository(DataItem),
    features,
    submissions,
  );
  const company = await source
    .getRepository(Empresa)
    .save({ nome: 'Escola Fixture' });
  const game = await source.getRepository(ArcadeGame).save({
    slug: 'quiz-relampago',
    title: 'Quiz Fixture',
    description: 'Fixture',
    tag: 'Fixture',
    game_type: ArcadeGameType.QUIZ,
    xp_base: 100,
    color: '#123456',
    color_dark: '#654321',
  });
  const challenge = await source.getRepository(Challenge).save({
    title: 'Questões Fixture',
    description: 'Fixture',
    duration: 30,
    points: 100,
  });
  for (let index = 0; index < 8; index++)
    await source.getRepository(Question).save({
      challenge_id: challenge.id,
      text: `Questão ${index}`,
      options: ['A', 'B'],
      correct_index: 0,
    });
  return {
    source,
    redis,
    events,
    completions,
    tokens,
    features,
    submissions,
    arcade,
    company,
    game,
    quiz,
    runs,
  };
}
