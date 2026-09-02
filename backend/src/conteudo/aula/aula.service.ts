import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { LessThan, Repository } from 'typeorm';
import { Aula } from './aula.entity';
import { AulaQuiz } from '../aula-quiz/aula-quiz.entity';
import { UsuarioAula } from '../usuario-aula/usuario-aula.entity';
import { UsuarioStats } from '../../usuario-stats/usuario-stats.entity';
import { Modulo } from '../modulo/modulo.entity';
import { RedisService } from '../../redis/redis.service';
import { S3Service } from '../s3/s3.service';
import { ttlUntilEndOfDay } from '../../common/utils/date.utils';
import {
  CreateAulaDto,
  UpdateAulaDto,
  UpdateAulaProgressDto,
} from './dto/aula.dto';
import { SubmitQuizDto } from '../aula-quiz/dto/aula-quiz.dto';
import { NotificationService } from '../../notification/notification.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class AulaService {
  constructor(
    @Inject('AULA_REPOSITORY')
    private aulaRepository: Repository<Aula>,

    @Inject('AULA_QUIZ_REPOSITORY')
    private aulaQuizRepository: Repository<AulaQuiz>,

    @Inject('USUARIO_AULA_REPOSITORY')
    private usuarioAulaRepository: Repository<UsuarioAula>,

    @Inject('USUARIO_STATS_REPOSITORY')
    private statsRepository: Repository<UsuarioStats>,

    @Inject('MODULO_REPOSITORY')
    private moduloRepository: Repository<Modulo>,

    private redisService: RedisService,
    private s3Service: S3Service,
    private notificationService: NotificationService,
    private eventEmitter: EventEmitter2,
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
    if (aula.type === 'quadrinho') {
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
        ? await Promise.all(aula.pages.map((key) => this.resolveUrl(key)))
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

    const aula = this.aulaRepository.create(dto);
    return this.aulaRepository.save(aula);
  }

  async update(id: number, dto: UpdateAulaDto): Promise<Aula> {
    const aula = await this.aulaRepository.findOne({ where: { id } });

    if (!aula) {
      throw new NotFoundException('Aula não encontrada');
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

    let progress = await this.usuarioAulaRepository.findOne({
      where: { usuario_id, aula_id: aulaId },
    });
    const now = new Date();

    if (!progress) {
      progress = this.usuarioAulaRepository.create({
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

    const saved = await this.usuarioAulaRepository.save(progress);
    return {
      completed: saved.completed,
      percent: saved.progress_percent,
      lastVideoSecond: saved.last_video_second ?? 0,
      lastPage: saved.last_page ?? 0,
      startedAt: saved.started_at,
      lastAccessedAt: saved.last_accessed_at,
    };
  }

  async concluir(aulaId: number, usuario_id: number) {
    const aula = await this.aulaRepository.findOne({
      where: { id: aulaId, active: true },
    });

    if (!aula) {
      throw new NotFoundException('Aula não encontrada');
    }

    const existing = await this.usuarioAulaRepository.findOne({
      where: { usuario_id, aula_id: aulaId },
    });

    if (existing?.completed) {
      throw new BadRequestException('Aula já foi concluída');
    }

    await this.verificarDesbloqueio(aula, usuario_id);

    if (existing) {
      existing.completed = true;
      existing.completed_at = new Date();
      existing.last_accessed_at = existing.completed_at;
      existing.progress_percent = 100;
      await this.usuarioAulaRepository.save(existing);
    } else {
      await this.usuarioAulaRepository.save({
        usuario_id,
        aula_id: aulaId,
        completed: true,
        completed_at: new Date(),
        started_at: new Date(),
        last_accessed_at: new Date(),
        progress_percent: 100,
      });
    }

    await this.creditarXp(usuario_id, aula.xp);

    await this.verificarModuloConcluido(aula.modulo_id, usuario_id);
    await this.eventEmitter.emitAsync('progress.changed', {
      usuarioId: usuario_id,
    });

    return {
      sucesso: true,
      mensagem: 'Aula concluída com sucesso',
      xp_ganho: aula.xp,
    };
  }

  async submitQuiz(aulaId: number, usuario_id: number, dto: SubmitQuizDto) {
    const aula = await this.aulaRepository.findOne({
      where: { id: aulaId, active: true },
    });

    if (!aula) {
      throw new NotFoundException('Aula não encontrada');
    }

    if (aula.type !== 'quadrinho') {
      throw new BadRequestException('Esta aula não possui quiz');
    }

    const existing = await this.usuarioAulaRepository.findOne({
      where: { usuario_id, aula_id: aulaId },
    });

    if (existing?.completed) {
      throw new BadRequestException('Quiz já foi respondido');
    }

    await this.verificarDesbloqueio(aula, usuario_id);

    const questions = await this.aulaQuizRepository.find({
      where: { aula_id: aulaId },
    });

    if (questions.length === 0) {
      throw new NotFoundException('Nenhuma pergunta encontrada para esta aula');
    }

    const questionMap = new Map(questions.map((q) => [q.id, q]));

    let correctCount = 0;
    const corrections = dto.answers.map((answer) => {
      const question = questionMap.get(answer.questionId);

      if (!question) {
        return {
          questionId: answer.questionId,
          correct: false,
          correctIndex: -1,
        };
      }

      const isCorrect = answer.selectedIndex === question.correct_index;
      if (isCorrect) correctCount++;

      return {
        questionId: question.id,
        correct: isCorrect,
        correctIndex: question.correct_index,
      };
    });

    const totalQuestions = questions.length;
    const score = Math.round((correctCount / totalQuestions) * 100);
    const xpEarned = Math.round(aula.xp * (score / 100));

    const completedAt = new Date();
    await this.usuarioAulaRepository.save(
      existing
        ? {
            ...existing,
            completed: true,
            completed_at: completedAt,
            last_accessed_at: completedAt,
            progress_percent: 100,
          }
        : {
            usuario_id,
            aula_id: aulaId,
            completed: true,
            completed_at: completedAt,
            started_at: completedAt,
            last_accessed_at: completedAt,
            progress_percent: 100,
          },
    );

    if (xpEarned > 0) {
      await this.creditarXp(usuario_id, xpEarned);
    }

    await this.verificarModuloConcluido(aula.modulo_id, usuario_id);
    await this.eventEmitter.emitAsync('progress.changed', {
      usuarioId: usuario_id,
    });

    return {
      score,
      correctCount,
      totalQuestions,
      xpEarned,
      corrections,
    };
  }

  private async verificarDesbloqueio(
    aula: Aula,
    usuario_id: number,
  ): Promise<void> {
    const previousAula = await this.aulaRepository.findOne({
      where: {
        modulo_id: aula.modulo_id,
        order: LessThan(aula.order),
        active: true,
      },
      order: { order: 'DESC' },
    });

    if (!previousAula) return;

    const previousCompleted = await this.usuarioAulaRepository.findOne({
      where: { usuario_id, aula_id: previousAula.id, completed: true },
    });

    if (!previousCompleted) {
      throw new BadRequestException(
        'Aula anterior não foi concluída. Complete a aula anterior primeiro.',
      );
    }
  }

  private async creditarXp(usuario_id: number, xp: number): Promise<void> {
    let stats = await this.statsRepository.findOne({ where: { usuario_id } });

    if (!stats) {
      stats = this.statsRepository.create({ usuario_id, total_points: 0 });
    }

    stats.total_points += xp;
    await this.statsRepository.save(stats);

    const xpKey = `xp-today:${usuario_id}`;
    const currentXp = await this.redisService.get(xpKey);
    const newXp = (currentXp ? parseInt(currentXp, 10) : 0) + xp;
    const ttl = ttlUntilEndOfDay();
    await this.redisService.set(xpKey, String(newXp), ttl);
  }

  private async verificarModuloConcluido(
    modulo_id: number,
    usuario_id: number,
  ): Promise<void> {
    const totalAulas = await this.aulaRepository.count({
      where: { modulo_id, active: true },
    });

    const completedAulas = await this.usuarioAulaRepository
      .createQueryBuilder('ua')
      .innerJoin('ua.aula', 'aula')
      .where('aula.modulo_id = :moduloId', { moduloId: modulo_id })
      .andWhere('ua.usuario_id = :usuarioId', { usuarioId: usuario_id })
      .andWhere('ua.completed = :completed', { completed: true })
      .getCount();

    if (completedAulas >= totalAulas && totalAulas > 0) {
      const modulo = await this.moduloRepository.findOne({
        where: { id: modulo_id },
      });

      if (modulo && modulo.xp_bonus > 0) {
        await this.creditarXp(usuario_id, modulo.xp_bonus);
      }

      await this.notificationService.insertNotification({
        usuario_id,
        title: 'Módulo Concluído!',
        message: `Parabéns! Você completou o módulo "${modulo?.title}" e ganhou ${modulo?.xp_bonus || 0} XP bônus!`,
        type: 'achievement',
        readed: false,
      });
    }
  }
}
