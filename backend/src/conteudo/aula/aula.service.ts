import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Aula } from './aula.entity';
import { AulaQuiz } from '../aula-quiz/aula-quiz.entity';
import { UsuarioAula } from '../usuario-aula/usuario-aula.entity';
import { UsuarioStats } from '../../usuario-stats/usuario-stats.entity';
import { Modulo } from '../modulo/modulo.entity';
import { RedisService } from '../../redis/redis.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ttlUntilEndOfDay } from '../../common/utils/date.utils';
import { CreateAulaDto, UpdateAulaDto } from './dto/aula.dto';
import { SubmitQuizDto } from '../aula-quiz/dto/aula-quiz.dto';

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
    private eventEmitter: EventEmitter2,
  ) {}

  async findOne(id: number, usuario_id: number) {
    const aula = await this.aulaRepository.findOne({
      where: { id, active: true },
    });

    if (!aula) {
      throw new NotFoundException('Aula não encontrada');
    }

    const isCompleted = await this.usuarioAulaRepository.findOne({
      where: { usuario_id, aula_id: id, completed: true },
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
      content_url: aula.content_url,
      pages: aula.pages,
      duration: aula.duration,
      xp: aula.xp,
      order: aula.order,
      section_name: aula.section_name,
      completed: !!isCompleted,
      quiz: quiz.map((q) => ({
        id: q.id,
        text: q.text,
        options: q.options,
        order: q.order,
      })),
    };
  }

  async create(dto: CreateAulaDto): Promise<Aula> {
    const modulo = await this.moduloRepository.findOne({ where: { id: dto.modulo_id } });
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

  async concluir(aulaId: number, usuario_id: number) {
    const aula = await this.aulaRepository.findOne({ where: { id: aulaId, active: true } });

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
      await this.usuarioAulaRepository.save(existing);
    } else {
      await this.usuarioAulaRepository.save({
        usuario_id,
        aula_id: aulaId,
        completed: true,
        completed_at: new Date(),
      });
    }

    await this.creditarXp(usuario_id, aula.xp);

    await this.verificarModuloConcluido(aula.modulo_id, usuario_id);

    return {
      sucesso: true,
      mensagem: 'Aula concluída com sucesso',
      xp_ganho: aula.xp,
    };
  }

  async submitQuiz(aulaId: number, usuario_id: number, dto: SubmitQuizDto) {
    const aula = await this.aulaRepository.findOne({ where: { id: aulaId, active: true } });

    if (!aula) {
      throw new NotFoundException('Aula não encontrada');
    }

    if (aula.type !== 'quadrinho') {
      throw new BadRequestException('Esta aula não possui quiz');
    }

    const existing = await this.usuarioAulaRepository.findOne({
      where: { usuario_id, aula_id: aulaId, completed: true },
    });

    if (existing) {
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
        return { questionId: answer.questionId, correct: false, correctIndex: -1 };
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

    await this.usuarioAulaRepository.save({
      usuario_id,
      aula_id: aulaId,
      completed: true,
      completed_at: new Date(),
    });

    if (xpEarned > 0) {
      await this.creditarXp(usuario_id, xpEarned);
    }

    await this.verificarModuloConcluido(aula.modulo_id, usuario_id);

    return {
      score,
      correctCount,
      totalQuestions,
      xpEarned,
      corrections,
    };
  }

  private async verificarDesbloqueio(aula: Aula, usuario_id: number): Promise<void> {
    if (aula.order === 0) return;

    const previousAula = await this.aulaRepository.findOne({
      where: { modulo_id: aula.modulo_id, order: aula.order - 1, active: true },
    });

    if (!previousAula) return;

    const previousCompleted = await this.usuarioAulaRepository.findOne({
      where: { usuario_id, aula_id: previousAula.id, completed: true },
    });

    if (!previousCompleted) {
      throw new BadRequestException('Aula anterior não foi concluída. Complete a aula anterior primeiro.');
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

  private async verificarModuloConcluido(modulo_id: number, usuario_id: number): Promise<void> {
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
      const modulo = await this.moduloRepository.findOne({ where: { id: modulo_id } });

      if (modulo && modulo.xp_bonus > 0) {
        await this.creditarXp(usuario_id, modulo.xp_bonus);
      }

      this.eventEmitter.emit('notification.created', {
        usuario_id,
        title: 'Módulo Concluído!',
        message: `Parabéns! Você completou o módulo "${modulo?.title}" e ganhou ${modulo?.xp_bonus || 0} XP bônus!`,
        type: 'achievement',
        created_at: new Date(),
      });
    }
  }
}
