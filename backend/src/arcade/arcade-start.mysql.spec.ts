import { arcadeFixture } from '../../test/fixtures/arcade-fixture';
import { Usuario } from '../usuario/usuario.entity';
import { Empresa } from '../empresa/empresa.entity';
import { ArcadeRun } from './entities/arcade-run.entity';
import { resolveCompanyParameters } from '../config/features';

const isolated =
  process.env.RUN_ARCADE_INTEGRATION === '1' ? describe : describe.skip;
isolated('start do arcade — concorrência no MySQL/Redis reais', () => {
  let f: Awaited<ReturnType<typeof arcadeFixture>>;
  beforeAll(async () => {
    f = await arcadeFixture();
    await f.source.getRepository(Empresa).update(f.company.id, {
      parametros_funcionalidades: resolveCompanyParameters(),
    });
  }, 60_000);
  afterAll(async () => {
    f?.submissions.onModuleDestroy();
    f?.completions.onModuleDestroy();
    f?.redis.onModuleDestroy();
    if (f?.source.isInitialized) await f.source.destroy();
  });

  const novoAluno = async (nome: string) => {
    const aluno = await f.source.getRepository(Usuario).save({
      name: nome,
      password: 'fixture-unused',
      empresa_id: f.company.id,
    });
    await f.unlockQuiz(aluno.id);
    await f.tokens.refillToCap(aluno.id);
    return aluno;
  };

  it('starts simultâneos de muitos alunos não esgotam o pool', async () => {
    // O pool da fixture (poolSize 20) é menor que os 25 starts: se a trava
    // retivesse uma conexão enquanto o sorteio pede outra, isto travaria.
    const alunos = await Promise.all(
      Array.from({ length: 25 }, (_, i) => novoAluno(`Aluno Pool ${i}`)),
    );
    const resultados = await Promise.all(
      alunos.map((aluno) => f.arcade.start(aluno.id, 'quiz-relampago')),
    );
    expect(new Set(resultados.map((r) => r.runId)).size).toBe(25);
    const gravadas = await f.source
      .getRepository(ArcadeRun)
      .countBy({ usuario_id: alunos[0].id });
    expect(gravadas).toBe(1);
  }, 20_000);

  it('starts simultâneos do mesmo aluno devolvem a mesma partida', async () => {
    const aluno = await novoAluno('Aluno Mesmo');
    const resultados = await Promise.all(
      Array.from({ length: 8 }, () =>
        f.arcade.start(aluno.id, 'quiz-relampago'),
      ),
    );
    expect(new Set(resultados.map((r) => r.runId)).size).toBe(1);
    expect(
      await f.source.getRepository(ArcadeRun).countBy({ usuario_id: aluno.id }),
    ).toBe(1);
  }, 20_000);
});
