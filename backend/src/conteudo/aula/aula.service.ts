import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EntityManager, Not, Repository } from 'typeorm';
import { Aula, AulaType } from './aula.entity';
import { AulaQuiz } from '../aula-quiz/aula-quiz.entity';
import { UsuarioAula } from '../usuario-aula/usuario-aula.entity';
import { Modulo } from '../modulo/modulo.entity';
import { ModuloService } from '../modulo/modulo.service';
import { S3Service } from '../s3/s3.service';
import {
  CreateAulaDto,
  UpdateAulaDto,
  UpdateAulaProgressDto,
} from './dto/aula.dto';
import { SubmitQuizDto } from '../aula-quiz/dto/aula-quiz.dto';
import { Notification } from '../../notification/notification.entity';
import { sortAulasByModuleSequence } from './aula-order';
import { ActivityCompletionService } from '../../common/gamification/activity-completion.service';
import {
  ActivityCompletion,
  CompletionNotification,
} from '../../common/gamification/activity-completion.entity';
import { validateAnswers } from '../../common/gamification/validate-answers';

export interface LessonResult {
  sucesso: boolean;
  mensagem: string;
  xp_ganho: number;
}
export interface QuizResult {
  score: number;
  correctCount: number;
  totalQuestions: number;
  xpEarned: number;
  corrections: Array<{
    questionId: number;
    correct: boolean;
    correctIndex: number;
  }>;
}

@Injectable()
export class AulaService {
  constructor(
    @Inject('AULA_REPOSITORY')
    private aulaRepository: Repository<Aula>,

    @Inject('AULA_QUIZ_REPOSITORY')
    private aulaQuizRepository: Repository<AulaQuiz>,

    @Inject('USUARIO_AULA_REPOSITORY')
    private usuarioAulaRepository: Repository<UsuarioAula>,

    @Inject('MODULO_REPOSITORY')
    private moduloRepository: Repository<Modulo>,

    private s3Service: S3Service,
    private moduloService: ModuloService,
    private readonly completions: ActivityCompletionService,
  ) {}

  async findOne(id: number, usuario_id: number) {
    const aula = await this.aulaRepository.findOne({
      where: { id, active: true },
    });

    if (!aula) {
      throw new NotFoundException('Aula não encontrada');
    }

    await this.verificarDesbloqueio(aula, usuario_id);

    const userProgress = await this.usuarioAulaRepository.findOne({
      where: { usuario_id, aula_id: id },
    });

    let quiz: AulaQuiz[] = [];
    if (aula.type === AulaType.QUADRINHO || aula.type === AulaType.TEXTO) {
      quiz = await this.aulaQuizRepository.find({
        where: { aula_id: id },
        order: { order: 'ASC' },
      });
    }

    return {
      id: aula.id,
      modulo_id: aula.modulo_id,
      title: aula.title,
      description: aula.description,
      type: aula.type,
      content_url: aula.content_url
        ? await this.resolveUrl(aula.content_url)
        : null,
      pages: aula.pages
        ? aula.type === AulaType.TEXTO
          ? aula.pages
          : await Promise.all(aula.pages.map((key) => this.resolveUrl(key)))
        : null,
      duration: aula.duration,
      xp: aula.xp,
      order: aula.order,
      section_name: aula.section_name,
      completed: !!userProgress?.completed,
      progress: {
        percent: userProgress?.progress_percent ?? 0,
        lastVideoSecond: userProgress?.last_video_second ?? 0,
        lastPage: userProgress?.last_page ?? 0,
        startedAt: userProgress?.started_at ?? null,
        lastAccessedAt: userProgress?.last_accessed_at ?? null,
      },
      quiz: quiz.map((q) => ({
        id: q.id,
        text: q.text,
        options: q.options,
        order: q.order,
      })),
    };
  }

  private async resolveUrl(value: string): Promise<string> {
    if (value.startsWith('http://') || value.startsWith('https://')) {
      return value;
    }
    try {
      const url = await this.s3Service.generatePresignedGetUrl(value);
      return url;
    } catch (error) {
      console.error(
        `[AulaService] Erro ao gerar presigned URL para key "${value}":`,
        error?.message,
      );
      return value;
    }
  }

  async create(dto: CreateAulaDto): Promise<Aula> {
    const modulo = await this.moduloRepository.findOne({
      where: { id: dto.modulo_id },
    });
    if (!modulo) {
      throw new NotFoundException('Módulo não encontrado');
    }

    await this.assertOrderAvailable(dto.modulo_id, dto.order ?? 0);

    const aula = this.aulaRepository.create(dto);
    return this.aulaRepository.save(aula);
  }

  async update(id: number, dto: UpdateAulaDto): Promise<Aula> {
    const aula = await this.aulaRepository.findOne({ where: { id } });

    if (!aula) {
      throw new NotFoundException('Aula não encontrada');
    }

    if (dto.order !== undefined && dto.order !== aula.order) {
      await this.assertOrderAvailable(aula.modulo_id, dto.order, aula.id);
    }

    Object.assign(aula, dto);
    return this.aulaRepository.save(aula);
  }

  async delete(id: number): Promise<void> {
    const aula = await this.aulaRepository.findOne({ where: { id } });

    if (!aula) {
      throw new NotFoundException('Aula não encontrada');
    }

    await this.aulaRepository.delete(id);
  }

  async updateProgress(
    aulaId: number,
    usuario_id: number,
    dto: UpdateAulaProgressDto,
  ) {
    const aula = await this.aulaRepository.findOne({
      where: { id: aulaId, active: true },
    });

    if (!aula) {
      throw new NotFoundException('Aula não encontrada');
    }

    await this.verificarDesbloqueio(aula, usuario_id);

    return this.completions.updateProgress(usuario_id, async (manager) => {
      const repository = manager.getRepository(UsuarioAula);
      let progress = await repository.findOne({
        where: { usuario_id, aula_id: aulaId },
      });
      const now = new Date();

      if (!progress) {
        progress = repository.create({
          usuario_id,
          aula_id: aulaId,
          completed: false,
          started_at: now,
          progress_percent: 0,
        });
      }

      progress.started_at ??= now;
      progress.last_accessed_at = now;

      if (!progress.completed && dto.progress_percent !== undefined) {
        progress.progress_percent = Math.max(
          progress.progress_percent ?? 0,
          dto.progress_percent,
        );
      }
      if (dto.last_video_second !== undefined) {
        progress.last_video_second = dto.last_video_second;
      }
      if (dto.last_page !== undefined) {
        progress.last_page = dto.last_page;
      }

      const saved = await repository.save(progress);
      return {
        completed: saved.completed,
        percent: saved.progress_percent,
        lastVideoSecond: saved.last_video_second ?? 0,
        lastPage: saved.last_page ?? 0,
        startedAt: saved.started_at,
        lastAccessedAt: saved.last_accessed_at,
      };
    });
  }

  async concluir(aulaId: number, usuario_id: number): Promise<LessonResult> {
    const replay = await this.completions.replay<LessonResult>(
      usuario_id,
      'lesson',
      aulaId,
    );
    if (replay) return replay;
    const aula = await this.aulaRepository.findOne({
      where: { id: aulaId, active: true },
    });
    if (!aula) throw new NotFoundException('Aula não encontrada');
    if (aula.type === AulaType.QUADRINHO || aula.type === AulaType.TEXTO) {
      const count = await this.aulaQuizRepository.count({
        where: { aula_id: aulaId },
      });
      if (count > 0)
        throw new BadRequestException(
          'Responda ao quiz para concluir esta aula',
        );
    }
    return this.completions.complete(
      usuario_id,
      'lesson',
      aulaId,
      async (manager) => {
        await this.verificarDesbloqueio(aula, usuario_id, manager);
        await this.markCompleted(manager, aulaId, usuario_id);
        const bonus = await this.completeModule(
          manager,
          aula.modulo_id,
          usuario_id,
        );
        return {
          result: {
            sucesso: true,
            mensagem: 'Aula concluída com sucesso',
            xp_ganho: aula.xp,
          },
          xp: aula.xp + bonus.xp,
          notifications: bonus.notifications,
        };
      },
    );
  }

  async submitQuiz(
    aulaId: number,
    usuario_id: number,
    dto: SubmitQuizDto,
  ): Promise<QuizResult> {
    const replay = await this.completions.replay<QuizResult>(
      usuario_id,
      'lesson_quiz',
      aulaId,
    );
    if (replay) return replay;
    const aula = await this.aulaRepository.findOne({
      where: { id: aulaId, active: true },
    });
    if (!aula) throw new NotFoundException('Aula não encontrada');
    if (aula.type !== AulaType.QUADRINHO && aula.type !== AulaType.TEXTO) {
      throw new BadRequestException('Esta aula não possui quiz');
    }
    const questions = await this.aulaQuizRepository.find({
      where: { aula_id: aulaId },
    });
    if (!questions.length)
      throw new NotFoundException('Nenhuma pergunta encontrada para esta aula');
    validateAnswers(questions, dto.answers);
    const questionMap = new Map(
      questions.map((question) => [question.id, question]),
    );
    let correctCount = 0;
    const corrections = dto.answers.map((answer) => {
      const question = questionMap.get(answer.questionId)!;
      const correct = question.correct_index === answer.selectedIndex;
      if (correct) correctCount++;
      return {
        questionId: question.id,
        correct,
        correctIndex: question.correct_index,
      };
    });
    const score = Math.round((correctCount / questions.length) * 100);
    const xpEarned = Math.round((aula.xp * score) / 100);
    return this.completions.complete(
      usuario_id,
      'lesson_quiz',
      aulaId,
      async (manager) => {
        await this.verificarDesbloqueio(aula, usuario_id, manager);
        await this.markCompleted(manager, aulaId, usuario_id);
        const bonus = await this.completeModule(
          manager,
          aula.modulo_id,
          usuario_id,
        );
        return {
          result: {
            score,
            correctCount,
            totalQuestions: questions.length,
            xpEarned,
            corrections,
          },
          xp: xpEarned + bonus.xp,
          notifications: bonus.notifications,
        };
      },
    );
  }

  private async markCompleted(
    manager: EntityManager,
    aulaId: number,
    usuarioId: number,
  ): Promise<void> {
    const repository = manager.getRepository(UsuarioAula);
    const existing = await repository.findOne({
      where: { usuario_id: usuarioId, aula_id: aulaId },
    });
    if (existing?.completed)
      throw new BadRequestException('Aula já foi concluída');
    const now = new Date();
    await repository.save(
      repository.create({
        ...existing,
        usuario_id: usuarioId,
        aula_id: aulaId,
        completed: true,
        completed_at: now,
        started_at: existing?.started_at ?? now,
        last_accessed_at: now,
        progress_percent: 100,
      }),
    );
  }

  private async verificarDesbloqueio(
    aula: Aula,
    usuario_id: number,
    manager?: EntityManager,
  ): Promise<void> {
    const aulasRepository = manager?.getRepository(Aula) ?? this.aulaRepository;
    const progressRepository =
      manager?.getRepository(UsuarioAula) ?? this.usuarioAulaRepository;
    // bloqueio de modulo tem precedencia sobre o bloqueio sequencial de aula
    await this.moduloService.assertModuloDesbloqueado(
      aula.modulo_id,
      usuario_id,
      manager,
    );

    const aulas = sortAulasByModuleSequence(
      await aulasRepository.find({
        where: { modulo_id: aula.modulo_id, active: true },
        order: { order: 'ASC', id: 'ASC' },
      }),
    );
    const aulaIndex = aulas.findIndex((candidate) => candidate.id === aula.id);
    const previousAulas = aulaIndex > 0 ? aulas.slice(0, aulaIndex) : [];

    if (previousAulas.length === 0) return;

    const completedProgress = await progressRepository.find({
      where: { usuario_id, completed: true },
    });
    const completedAulaIds = new Set(
      completedProgress.map((progress) => progress.aula_id),
    );
    const hasIncompletePreviousAula = previousAulas.some(
      (previousAula) => !completedAulaIds.has(previousAula.id),
    );

    if (hasIncompletePreviousAula) {
      throw new BadRequestException(
        'Aula anterior não foi concluída. Complete a aula anterior primeiro.',
      );
    }
  }

  private async assertOrderAvailable(
    modulo_id: number,
    order: number,
    ignoredAulaId?: number,
  ): Promise<void> {
    const duplicate = await this.aulaRepository.findOne({
      where: {
        modulo_id,
        order,
        ...(ignoredAulaId === undefined ? {} : { id: Not(ignoredAulaId) }),
      },
    });

    if (duplicate) {
      throw new BadRequestException(
        `Já existe uma aula na posição ${order} deste módulo.`,
      );
    }
  }

  private async completeModule(
    manager: EntityManager,
    moduloId: number,
    usuarioId: number,
  ): Promise<{ xp: number; notifications: CompletionNotification[] }> {
    const rewards = manager.getRepository(ActivityCompletion);
    const key = {
      usuario_id: usuarioId,
      activity_type: 'module' as const,
      activity_id: moduloId,
    };
    if (await rewards.findOne({ where: key }))
      return { xp: 0, notifications: [] };
    const total = await manager
      .getRepository(Aula)
      .count({ where: { modulo_id: moduloId, active: true } });
    const completed = await manager
      .getRepository(UsuarioAula)
      .createQueryBuilder('ua')
      .innerJoin('ua.aula', 'aula')
      .where('aula.modulo_id = :moduloId AND aula.active = :active', {
        moduloId,
        active: true,
      })
      .andWhere('ua.usuario_id = :usuarioId AND ua.completed = :completed', {
        usuarioId,
        completed: true,
      })
      .getCount();
    if (!total || completed < total) return { xp: 0, notifications: [] };
    const modulo = await manager
      .getRepository(Modulo)
      .findOneByOrFail({ id: moduloId });
    const xp = Math.max(0, modulo.xp_bonus);
    // Marcador e notificação entram na mesma transação do crédito da aula.
    await rewards.save(
      rewards.create({
        ...key,
        result: { xp },
        xp: 0,
        previous_points: 0,
        effects_processed: true,
      }),
    );
    const notification = await manager.getRepository(Notification).save({
      usuario_id: usuarioId,
      title: 'Módulo Concluído!',
      message: `Parabéns! Você completou o módulo "${modulo.title}" e ganhou ${xp} XP bônus!`,
      type: 'achievement',
      readed: false,
    });
    return {
      xp,
      notifications: [
        {
          id: notification.id,
          usuario_id: usuarioId,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          created_at: notification.created_at,
        },
      ],
    };
  }
}
