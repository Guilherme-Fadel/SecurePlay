import { Injectable, Inject } from '@nestjs/common';
import { Repository } from 'typeorm';
import { DataItem, DataLevel } from '../entities/data-item.entity';
import { GameHandler, GameRun, GameCorrection } from './game-handler';
import { SubmitRunDto } from '../dto/arcade.dto';

const ITEM_COUNT = 6; // itens por partida

interface DataAnswerKey {
  items: Record<
    number,
    { level: DataLevel; label: string; explanation: string }
  >;
  order: number[];
}

/**
 * Classificacao de Dados: o jogador classifica itens por nivel de sigilo
 * (publico/interno/confidencial/secreto). Correcao server-side; correct_level
 * nunca vai no payload.
 */
@Injectable()
export class DataClassifyHandler implements GameHandler {
  constructor(
    @Inject('DATA_ITEM_REPOSITORY')
    private readonly itemRepository: Repository<DataItem>,
  ) {}

  protected async pickItems(count: number): Promise<DataItem[]> {
    return this.itemRepository
      .createQueryBuilder('d')
      .where('d.active = :active', { active: true })
      .orderBy('RAND()')
      .limit(count)
      .getMany();
  }

  async buildRun(): Promise<GameRun> {
    const items = await this.pickItems(ITEM_COUNT);

    const key: DataAnswerKey = { items: {}, order: [] };
    for (const it of items) {
      key.items[it.id] = {
        level: it.correct_level,
        label: it.label,
        explanation: it.explanation,
      };
      key.order.push(it.id);
    }

    const payload = {
      // niveis disponiveis para o cliente montar os alvos de classificacao
      levels: Object.values(DataLevel),
      items: items.map((it) => ({ id: it.id, label: it.label })),
    };

    return { payload, answerKey: key };
  }

  correct(answerKey: unknown, dto: SubmitRunDto): GameCorrection {
    const key = answerKey as DataAnswerKey;
    const answers = dto.dataAnswers ?? [];
    const byId = new Map(answers.map((a) => [a.itemId, a.level]));

    const total = key.order.length;
    let correctCount = 0;

    const items = key.order.map((id) => {
      const gab = key.items[id];
      const chosen = byId.get(id);
      const isCorrect = chosen === gab.level;
      if (isCorrect) correctCount++;
      return {
        itemId: id,
        label: gab.label,
        correctLevel: gab.level,
        chosenLevel: chosen ?? null,
        correct: isCorrect,
        explanation: gab.explanation,
      };
    });

    const score = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    return { score, feedback: { total, correctCount, items } };
  }
}
