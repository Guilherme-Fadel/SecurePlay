import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  OnModuleInit,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { ArcadeGame, ArcadeGameType } from './entities/arcade-game.entity';
import {
  PhishingSample,
  PhishingKind,
} from './entities/phishing-sample.entity';
import { DataItem, DataLevel } from './entities/data-item.entity';
import { RedisService } from '../redis/redis.service';
import { XpService } from '../common/gamification/xp.service';
import { TokenService } from './token.service';
import { ttlUntilEndOfDay } from '../common/utils/date.utils';
import { GameHandler } from './games/game-handler';
import { QuizRelampagoHandler } from './games/quiz-relampago.handler';
import { PhishingHandler } from './games/phishing.handler';
import { DataClassifyHandler } from './games/data-classify.handler';
import { SubmitRunDto } from './dto/arcade.dto';
import { UsuarioArcadeStats } from './entities/usuario-arcade-stats.entity';
const RUN_TTL_SECONDS = 30 * 60;
const XP_FLOOR = 10;
interface StoredRun {
  usuario_id: number;
  slug: string;
  game_type: ArcadeGameType;
  xp_base: number;
  answerKey: unknown;
}
@Injectable()
export class ArcadeService implements OnModuleInit {
  constructor(
    @Inject('ARCADE_GAME_REPOSITORY')
    private readonly gameRepository: Repository<ArcadeGame>,
    private readonly redisService: RedisService,
    private readonly xpService: XpService,
    private readonly tokenService: TokenService,
    private readonly quizHandler: QuizRelampagoHandler,
    private readonly phishingHandler: PhishingHandler,
    private readonly dataClassifyHandler: DataClassifyHandler,
    @Inject('PHISHING_SAMPLE_REPOSITORY')
    private readonly phishingRepository: Repository<PhishingSample>,
    @Inject('DATA_ITEM_REPOSITORY')
    private readonly dataItemRepository: Repository<DataItem>,
    @Inject('USUARIO_ARCADE_STATS_REPOSITORY')
    private readonly usuarioArcadeStatsRepository: Repository<UsuarioArcadeStats>,
  ) {}
  async onModuleInit() {
    const seeds: Partial<ArcadeGame>[] = [
      {
        slug: 'quiz-relampago',
        game_type: ArcadeGameType.QUIZ,
        title: 'Quiz Relampago',
        description: 'Rodada cronometrada de perguntas rapidas de seguranca.',
        tag: 'Rodada rapida',
        xp_base: 100,
        color: '#1a9fd8',
        color_dark: '#1478a3',
        image: '/challenges/quiz-relampago.svg',
        active: true,
      },
      {
        slug: 'caca-phishing',
        game_type: ArcadeGameType.PHISHING,
        title: 'Caca ao Phishing',
        description:
          'Analise mensagens e decida: confiar ou denunciar o golpe.',
        tag: 'Analise',
        xp_base: 120,
        color: '#e0555f',
        color_dark: '#b23b44',
        image: '/challenges/caca-phishing.svg',
        active: true,
      },
      {
        slug: 'classificacao-dados',
        game_type: ArcadeGameType.DATA_CLASSIFY,
        title: 'Classificacao de Dados',
        description:
          'Classifique cada informacao pelo nivel de sigilo correto.',
        tag: 'Classificacao',
        xp_base: 110,
        color: '#2e9e6b',
        color_dark: '#237a52',
        image: '/challenges/classificacao-dados.svg',
        active: true,
      },
      {
        slug: 'termotech',
        game_type: ArcadeGameType.CLIENT_ONLY,
        title: 'Termo Tech',
        description: 'Decifre a palavra de tecnologia do dia em 6 tentativas.',
        tag: 'Puzzle diario',
        xp_base: 120,
        color: '#1a9fd8',
        color_dark: '#1478a3',
        image: '/challenges/termotech.png',
        active: true,
      },
    ];
    // O jogo "worldmap" (Mapa de Treinamento) foi descontinuado junto com o
    // prototipo do mapa. Remove o registro caso ja tenha sido semeado, para
    // nao servir um card que aponta para arte inexistente.
    await this.gameRepository.delete({ slug: 'worldmap' });
    for (const seed of seeds) {
      const existing = await this.gameRepository.findOne({
        where: { slug: seed.slug },
      });
      if (!existing) {
        await this.gameRepository.save(this.gameRepository.create(seed));
      } else if (!existing.image && seed.image) {
        existing.image = seed.image;
        await this.gameRepository.save(existing);
      }
    }
    await this.seedPhishingSamples();
    await this.seedDataItems();
  }
  private async seedDataItems() {
    const count = await this.dataItemRepository.count();
    if (count > 0) return;
    const items: Partial<DataItem>[] = [
      {
        label: 'Comunicado publicado no site institucional',
        correct_level: DataLevel.PUBLICO,
        explanation: 'Informacao ja divulgada abertamente ao publico.',
      },
      {
        label: 'Organograma interno da empresa',
        correct_level: DataLevel.INTERNO,
        explanation: 'De uso interno; nao deve circular fora da organizacao.',
      },
      {
        label: 'CPF e dados pessoais de um cliente',
        correct_level: DataLevel.CONFIDENCIAL,
        explanation: 'Dado pessoal protegido pela LGPD; acesso restrito.',
      },
      {
        label: 'Senha de acesso ao servidor de producao',
        correct_level: DataLevel.SECRETO,
        explanation: 'Credencial critica; vazamento compromete todo o sistema.',
      },
      {
        label: 'Cardapio do refeitorio da semana',
        correct_level: DataLevel.PUBLICO,
        explanation: 'Sem sensibilidade; pode ser divulgado livremente.',
      },
      {
        label: 'Relatorio financeiro trimestral nao divulgado',
        correct_level: DataLevel.CONFIDENCIAL,
        explanation:
          'Informacao sensivel do negocio antes da divulgacao oficial.',
      },
      {
        label: 'Chave privada de assinatura de certificados',
        correct_level: DataLevel.SECRETO,
        explanation: 'Segredo criptografico; nunca deve ser compartilhado.',
      },
      {
        label: 'Ata de reuniao de equipe',
        correct_level: DataLevel.INTERNO,
        explanation: 'Uso interno da equipe; sem exposicao externa.',
      },
    ];
    await this.dataItemRepository.save(
      items.map((i) => this.dataItemRepository.create(i)),
    );
  }
  private async seedPhishingSamples() {
    const count = await this.phishingRepository.count();
    if (count > 0) return;
    const samples: Partial<PhishingSample>[] = [
      {
        kind: PhishingKind.EMAIL,
        content: {
          sender: 'suporte@bancoseguro-alertas.com',
          subject: 'ACAO URGENTE: sua conta sera bloqueada em 24h',
          body: 'Detectamos acesso suspeito. Confirme seus dados imediatamente no link abaixo para evitar o bloqueio.',
          url: 'http://bancoseguro-verificacao.link/login',
        },
        is_phishing: true,
        signals: ['sender', 'url', 'urgency'],
        explanation:
          'Dominio do remetente e da URL nao sao oficiais, e a mensagem usa urgencia para pressionar. Bancos nao pedem confirmacao de dados por link.',
      },
      {
        kind: PhishingKind.EMAIL,
        content: {
          sender: 'rh@suaempresa.com.br',
          subject: 'Holerite de referencia disponivel',
          body: 'Ola, seu holerite deste mes ja esta disponivel no portal interno. Acesse pelo sistema habitual.',
        },
        is_phishing: false,
        signals: [],
        explanation:
          'Remetente do dominio corporativo, sem link suspeito e sem pressao. Comunicacao interna legitima.',
      },
      {
        kind: PhishingKind.MESSAGE,
        content: {
          sender: '+55 11 90000-0000',
          body: 'Voce ganhou um premio! Clique para resgatar agora: bit.ly/premio-vc',
          url: 'http://bit.ly/premio-vc',
        },
        is_phishing: true,
        signals: ['url', 'reward'],
        explanation:
          'Premio inesperado e link encurtado escondendo o destino real sao sinais classicos de golpe.',
      },
      {
        kind: PhishingKind.SITE,
        content: {
          url: 'https://login-microsft365.com',
          body: 'Pagina de login identica a da Microsoft pedindo email e senha corporativos.',
        },
        is_phishing: true,
        signals: ['url'],
        explanation:
          'O dominio esta escrito errado (microsft) imitando o oficial. Sempre confira o endereco antes de digitar credenciais.',
      },
      {
        kind: PhishingKind.EMAIL,
        content: {
          sender: 'no-reply@github.com',
          subject: 'Novo login na sua conta',
          body: 'Detectamos um login no seu dispositivo. Se foi voce, ignore este email.',
        },
        is_phishing: false,
        signals: [],
        explanation:
          'Notificacao informativa de um dominio oficial, sem pedir clique nem dados. Comportamento legitimo.',
      },
    ];
    await this.phishingRepository.save(
      samples.map((s) => this.phishingRepository.create(s)),
    );
  }
  private handlerFor(type: ArcadeGameType): GameHandler {
    switch (type) {
      case ArcadeGameType.QUIZ:
        return this.quizHandler;
      case ArcadeGameType.PHISHING:
        return this.phishingHandler;
      case ArcadeGameType.DATA_CLASSIFY:
        return this.dataClassifyHandler;
      default:
        throw new BadRequestException('Jogo ainda nao disponivel.');
    }
  }
  async listGames() {
    const games = await this.gameRepository.find({ where: { active: true } });
    return games.map((g) => ({
      slug: g.slug,
      title: g.title,
      description: g.description,
      tag: g.tag,
      xp: g.xp_base,
      status: 'AVAILABLE' as const,
      color: g.color,
      colorDark: g.color_dark,
      image: g.image?.startsWith('s3://') ? null : g.image,
      gameType: g.game_type,
    }));
  }
  getTokens(usuario_id: number) {
    return this.tokenService.getState(usuario_id);
  }
  private runKey(usuario_id: number, runId: string): string {
    return `arcade-run:${usuario_id}:${runId}`;
  }
  async start(usuario_id: number, slug: string) {
    const game = await this.gameRepository.findOne({
      where: { slug, active: true },
    });
    if (!game) {
      throw new NotFoundException('Jogo nao encontrado ou indisponivel.');
    }
    if (game.game_type === ArcadeGameType.CLIENT_ONLY) {
      throw new BadRequestException('Este jogo nao usa economia de tokens.');
    }
    const tokens = await this.tokenService.getState(usuario_id);
    if (tokens.balance <= 0) {
      const secs = tokens.nextRegenInSeconds;
      throw new ForbiddenException(
        `Sem tentativas no momento. Proxima em ${Math.ceil(secs / 60)} min.`,
      );
    }
    const handler = this.handlerFor(game.game_type);
    const run = await handler.buildRun();
    const runId = randomUUID();
    const stored: StoredRun = {
      usuario_id,
      slug: game.slug,
      game_type: game.game_type,
      xp_base: game.xp_base,
      answerKey: run.answerKey,
    };
    await this.redisService.set(
      this.runKey(usuario_id, runId),
      JSON.stringify(stored),
      RUN_TTL_SECONDS,
    );
    return {
      runId,
      game: { slug: game.slug, title: game.title, gameType: game.game_type },
      payload: run.payload,
      tokens,
    };
  }
  async submit(usuario_id: number, runId: string, dto: SubmitRunDto) {
    const key = this.runKey(usuario_id, runId);
    const raw = await this.redisService.get(key);
    if (!raw) {
      throw new BadRequestException('Partida invalida ou ja finalizada.');
    }
    const stored = JSON.parse(raw) as StoredRun;
    const consumed = await this.tokenService.consume(usuario_id);
    if (!consumed.ok) {
      const secs = consumed.state.nextRegenInSeconds;
      throw new ForbiddenException(
        `Sem tentativas no momento. Proxima em ${Math.ceil(secs / 60)} min.`,
      );
    }
    const handler = this.handlerFor(stored.game_type);
    const correction = handler.correct(stored.answerKey, dto);
    const xpBase = Math.round(stored.xp_base * (correction.score / 100));
    const playsKey = `arcade-plays:${usuario_id}:${stored.slug}:${this.today()}`;
    const plays = await this.redisService.incrBy(
      playsKey,
      1,
      ttlUntilEndOfDay(),
    );
    const multiplier = plays <= 1 ? 1 : plays === 2 ? 0.5 : 0.25;
    let xpEarned = Math.round(xpBase * multiplier);
    if (xpBase > 0) {
      xpEarned = Math.max(XP_FLOOR, xpEarned);
    }
    await this.xpService.creditXp(usuario_id, xpEarned);
    let activity = await this.usuarioArcadeStatsRepository.findOne({
      where: { usuario_id, game_slug: stored.slug },
    });
    if (!activity) {
      activity = this.usuarioArcadeStatsRepository.create({
        usuario_id,
        game_slug: stored.slug,
        total_plays: 0,
        perfect_runs: 0,
        best_score: 0,
      });
    }
    activity.total_plays += 1;
    if (correction.score === 100) activity.perfect_runs += 1;
    activity.best_score = Math.max(activity.best_score, correction.score);
    activity.last_played_at = new Date();
    await this.usuarioArcadeStatsRepository.save(activity);
    await this.redisService.del(key);
    return {
      score: correction.score,
      xpBase,
      multiplier,
      xpEarned,
      playsToday: plays,
      feedback: correction.feedback,
      tokens: consumed.state,
    };
  }
  private today(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
