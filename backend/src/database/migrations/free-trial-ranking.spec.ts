import { EnableFreeTrialCompanyRanking1790640000000 } from './1790640000000-enable-free-trial-company-ranking';

describe('Migração do ranking interno da empresa free_trial', () => {
  it('habilita apenas o ranking interno e preserva demais parâmetros da empresa existente', async () => {
    const query = jest.fn()
      .mockResolvedValueOnce([{
        id: 9,
        parametros_funcionalidades: JSON.stringify({
          rankingEnabled: false,
          globalRankingEnabled: false,
          achievementsEnabled: true,
          enabledGames: ['quiz-relampago'],
        }),
      }])
      .mockResolvedValueOnce(undefined);

    await new EnableFreeTrialCompanyRanking1790640000000().up({ query } as never);

    expect(query).toHaveBeenNthCalledWith(1,
      "SELECT id, parametros_funcionalidades FROM empresa WHERE system_key = 'free_trial' LIMIT 1 FOR UPDATE",
    );
    expect(query).toHaveBeenNthCalledWith(2,
      'UPDATE empresa SET parametros_funcionalidades = ?, updated_at = NOW(6) WHERE id = ?',
      [JSON.stringify({
        rankingEnabled: true,
        globalRankingEnabled: false,
        achievementsEnabled: true,
        enabledGames: ['quiz-relampago'],
      }), 9],
    );
  });

  it('não altera empresa inexistente ou já habilitada', async () => {
    const migration = new EnableFreeTrialCompanyRanking1790640000000();
    const missing = jest.fn().mockResolvedValue([]);
    await migration.up({ query: missing } as never);
    expect(missing).toHaveBeenCalledTimes(1);

    const enabled = jest.fn().mockResolvedValue([{
      id: 9,
      parametros_funcionalidades: { rankingEnabled: true, globalRankingEnabled: false },
    }]);
    await migration.up({ query: enabled } as never);
    expect(enabled).toHaveBeenCalledTimes(1);
  });
});
