import { Injectable, Inject } from '@nestjs/common';
import { Repository } from 'typeorm';
import { PhishingSample } from '../entities/phishing-sample.entity';
import { GameHandler, GameRun, GameCorrection } from './game-handler';
import { SubmitRunDto } from '../dto/arcade.dto';
const SAMPLE_COUNT = 5;
interface PhishingAnswerKey {
  samples: Record<
    number,
    {
      isPhishing: boolean;
      signals: string[];
      explanation: string;
    }
  >;
  order: number[];
}
@Injectable()
export class PhishingHandler implements GameHandler {
  constructor(
    @Inject('PHISHING_SAMPLE_REPOSITORY')
    private readonly sampleRepository: Repository<PhishingSample>,
  ) {}
  protected async pickSamples(count: number): Promise<PhishingSample[]> {
    return this.sampleRepository
      .createQueryBuilder('s')
      .where('s.active = :active', { active: true })
      .orderBy('RAND()')
      .limit(count)
      .getMany();
  }
  async buildRun(): Promise<GameRun> {
    const samples = await this.pickSamples(SAMPLE_COUNT);
    const key: PhishingAnswerKey = { samples: {}, order: [] };
    for (const s of samples) {
      key.samples[s.id] = {
        isPhishing: s.is_phishing,
        signals: s.signals ?? [],
        explanation: s.explanation,
      };
      key.order.push(s.id);
    }
    const payload = {
      samples: samples.map((s) => ({
        id: s.id,
        kind: s.kind,
        content: s.content,
      })),
    };
    return { payload, answerKey: key };
  }
  correct(answerKey: unknown, dto: SubmitRunDto): GameCorrection {
    const key = answerKey as PhishingAnswerKey;
    const answers = dto.phishingAnswers ?? [];
    const byId = new Map(answers.map((a) => [a.sampleId, a]));
    const total = key.order.length;
    let points = 0;
    const maxPoints = total * 2;
    const items = key.order.map((sid) => {
      const gab = key.samples[sid];
      const ans = byId.get(sid);
      const decisionRight = !!ans && ans.report === gab.isPhishing;
      if (decisionRight) points += 1;
      let signalsRight = false;
      if (gab.isPhishing && gab.signals.length > 0) {
        const marked = new Set(ans?.signals ?? []);
        const expected = new Set(gab.signals);
        const allFound = [...expected].every((s) => marked.has(s));
        const noExtra = [...marked].every((s) => expected.has(s));
        signalsRight = allFound && noExtra;
      } else {
        signalsRight = (ans?.signals?.length ?? 0) === 0;
      }
      if (signalsRight) points += 1;
      return {
        sampleId: sid,
        isPhishing: gab.isPhishing,
        correctSignals: gab.signals,
        decisionRight,
        signalsRight,
        explanation: gab.explanation,
      };
    });
    const score = maxPoints > 0 ? Math.round((points / maxPoints) * 100) : 0;
    return { score, feedback: { total, points, maxPoints, items } };
  }
}
