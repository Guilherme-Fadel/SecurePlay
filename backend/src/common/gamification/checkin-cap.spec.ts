import { ChallengeService } from '../../challenge/challenge.service';
import { CHECKIN_STREAK_CAP, checkinBonusXp } from './daily-checkin';

describe('Teto do bônus de sequência (I1) e contagem de desafios (I2)', () => {
  it('streak de 30 dias concede 35 XP', () => {
    expect(checkinBonusXp(30)).toBe(35);
    expect(checkinBonusXp(CHECKIN_STREAK_CAP)).toBe(35);
  });

  it('até 7 dias o bônus segue 5 XP por dia', () => {
    expect([1, 2, 6].map(checkinBonusXp)).toEqual([5, 10, 30]);
    expect(checkinBonusXp(0)).toBe(0);
  });

  it('desafio iniciado e não concluído não conta', async () => {
    const count = jest.fn().mockResolvedValue(2);
    const service = new ChallengeService(
      {} as never,
      {} as never,
      { count } as never,
      {} as never,
      {} as never,
    );
    await expect(service.countCompleted(9)).resolves.toBe(2);
    expect(count).toHaveBeenCalledWith({
      where: { usuario_id: 9, completed: true },
    });
  });
});
