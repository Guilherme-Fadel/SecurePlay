import { Injectable, Inject } from '@nestjs/common';
import { Repository } from 'typeorm';
import { DataItem, DataLevel } from '../entities/data-item.entity';
import { GameHandler, GameRun, GameCorrection } from './game-handler';
import { SubmitRunDto } from '../dto/arcade.dto';
const ITEM_COUNT = 6;
interface DataAnswerKey {
  items: Record<
    number,
    {
      level: DataLevel;
      label: string;
      explanation: string;
    }
  >;
  order: number[];
}

const LEGACY_ITEM_PRESENTATION: Record<
  string,
  {
    correctLevel: DataLevel;
    sourceExplanation: string;
    label: string;
    explanation: string;
  }
> = {
  'Comunicado publicado no site institucional': {
    correctLevel: DataLevel.PUBLICO,
    sourceExplanation: 'Informacao ja divulgada abertamente ao publico.',
    label: 'Aviso da feira de ciências no mural da turma',
    explanation: 'O aviso foi feito para toda a comunidade da escola.',
  },
  'Organograma interno da empresa': {
    correctLevel: DataLevel.INTERNO,
    sourceExplanation: 'De uso interno; nao deve circular fora da organizacao.',
    label: 'Lista de tarefas do grupo para o trabalho',
    explanation:
      'É uma combinação do grupo e deve ficar entre os participantes.',
  },
  'CPF e dados pessoais de um cliente': {
    correctLevel: DataLevel.CONFIDENCIAL,
    sourceExplanation: 'Dado pessoal protegido pela LGPD; acesso restrito.',
    label: 'Endereço e telefone de um colega',
    explanation: 'Dados pessoais só devem ser vistos por quem precisa deles.',
  },
  'Senha de acesso ao servidor de producao': {
    correctLevel: DataLevel.SECRETO,
    sourceExplanation:
      'Credencial critica; vazamento compromete todo o sistema.',
    label: 'Senha secreta do baú da equipe',
    explanation: 'Uma senha deve ficar em segredo e nunca ser compartilhada.',
  },
  'Cardapio do refeitorio da semana': {
    correctLevel: DataLevel.PUBLICO,
    sourceExplanation: 'Sem sensibilidade; pode ser divulgado livremente.',
    label: 'Cardápio da merenda desta semana',
    explanation: 'A escola pode divulgar o cardápio para todos.',
  },
  'Relatorio financeiro trimestral nao divulgado': {
    correctLevel: DataLevel.CONFIDENCIAL,
    sourceExplanation:
      'Informacao sensivel do negocio antes da divulgacao oficial.',
    label: 'Resultado da votação da turma antes do anúncio',
    explanation:
      'O resultado ainda não foi anunciado; espere a divulgação oficial.',
  },
  'Chave privada de assinatura de certificados': {
    correctLevel: DataLevel.SECRETO,
    sourceExplanation: 'Segredo criptografico; nunca deve ser compartilhado.',
    label: 'Código secreto para abrir a sala de jogos',
    explanation: 'Quem conhece o código consegue entrar; mantenha-o protegido.',
  },
  'Ata de reuniao de equipe': {
    correctLevel: DataLevel.INTERNO,
    sourceExplanation: 'Uso interno da equipe; sem exposicao externa.',
    label: 'Plano da apresentação do grupo',
    explanation:
      'O plano é para as pessoas que estão preparando a apresentação.',
  },
};

function presentItem(
  item: DataItem,
): Pick<DataAnswerKey['items'][number], 'label' | 'explanation'> {
  const legacy = LEGACY_ITEM_PRESENTATION[item.label];
  if (
    legacy &&
    item.correct_level === legacy.correctLevel &&
    item.explanation === legacy.sourceExplanation
  ) {
    return { label: legacy.label, explanation: legacy.explanation };
  }
  return { label: item.label, explanation: item.explanation };
}
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
      const presented = presentItem(it);
      key.items[it.id] = {
        level: it.correct_level,
        ...presented,
      };
      key.order.push(it.id);
    }
    const payload = {
      levels: Object.values(DataLevel),
      items: items.map((it) => ({
        id: it.id,
        label: presentItem(it).label,
      })),
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
