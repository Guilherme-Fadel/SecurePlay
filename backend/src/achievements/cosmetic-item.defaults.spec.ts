import { DataSource } from 'typeorm';
import { PersonagemColecionaveis1794182400000 } from '../database/migrations/1794182400000-personagem-colecionaveis';
import { CosmeticItem } from './entities/cosmetic-item.entity';
import { CosmeticKit } from './entities/cosmetic-kit.entity';
import { UsuarioCosmetic } from './entities/usuario-cosmetic.entity';
import { UsuarioCosmeticKit } from './entities/usuario-cosmetic-kit.entity';
import { Empresa } from '../empresa/empresa.entity';
import { Usuario } from '../usuario/usuario.entity';

/**
 * O MySQL devolve o padrão de decimal com a escala da coluna ('0.00'). Se a entidade
 * declarar número, o synchronize local vê diferença a cada subida do backend.
 */
describe('CosmeticItem — padrões de decimal', () => {
  it('declaram, como texto e na escala da coluna, o mesmo DEFAULT da migração', async () => {
    const statements: string[] = [];
    const runner = {
      query: (sql: string) => {
        statements.push(sql.replace(/\s+/g, ' '));
        return Promise.resolve([{ total: 0 }]);
      },
      hasColumn: () => Promise.resolve(false),
      hasTable: () => Promise.resolve(false),
    };
    await new PersonagemColecionaveis1794182400000().up(runner as never);
    const source = new DataSource({
      type: 'mysql',
      database: 'somente-metadados', // nunca conecta: só monta os metadados
      entities: [
        CosmeticItem,
        CosmeticKit,
        UsuarioCosmetic,
        UsuarioCosmeticKit,
        Usuario,
        Empresa,
      ],
    });
    await (
      source as unknown as { buildMetadatas(): Promise<void> }
    ).buildMetadatas();
    const metadata = source.getMetadata(CosmeticItem);
    const decimals = metadata.columns.filter(
      (column) => column.type === 'decimal',
    );
    expect(decimals.map((column) => column.propertyName).sort()).toEqual([
      'adjust_scale',
      'adjust_x',
      'adjust_y',
    ]);
    for (const column of decimals) {
      const ddl = statements.find((sql) =>
        sql.includes(`ADD COLUMN \`${column.databaseName}\``),
      );
      const match = /decimal\((\d+),(\d+)\) NOT NULL DEFAULT ([\d.]+)/.exec(
        ddl ?? '',
      );
      expect(match).not.toBeNull();
      const [, precision, scale, literal] = match!;
      expect(column.precision).toBe(Number(precision));
      expect(column.scale).toBe(Number(scale));
      expect(typeof column.default).toBe('string');
      expect(column.default).toBe(Number(literal).toFixed(Number(scale)));
    }
  });
});
