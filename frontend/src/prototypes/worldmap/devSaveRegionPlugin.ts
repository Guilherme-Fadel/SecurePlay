import type { Plugin } from 'vite';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
export function devSaveRegionPlugin(): Plugin {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const mockPath = path.resolve(here, './mockData.ts');
    return {
        name: 'worldmap-dev-save-region',
        apply: 'serve',
        configureServer(server) {
            server.middlewares.use('/__save-region', async (req, res) => {
                if (req.method !== 'POST') {
                    res.statusCode = 405;
                    res.end('Method Not Allowed');
                    return;
                }
                try {
                    const body = await readBody(req);
                    const { biomeId, points } = JSON.parse(body) as {
                        biomeId: string;
                        points: {
                            x: number;
                            y: number;
                        }[];
                    };
                    if (!biomeId || !Array.isArray(points)) {
                        res.statusCode = 400;
                        res.end('Invalid payload');
                        return;
                    }
                    const source = await readFile(mockPath, 'utf8');
                    const updated = upsertRegion(source, biomeId, points);
                    if (updated == null) {
                        res.statusCode = 404;
                        res.end(`Bioma '${biomeId}' nao encontrado em mockData.ts`);
                        return;
                    }
                    await writeFile(mockPath, updated, 'utf8');
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ ok: true, biomeId, count: points.length }));
                }
                catch (err) {
                    res.statusCode = 500;
                    res.end(`Erro: ${(err as Error).message}`);
                }
            });
        },
    };
}
function readBody(req: import('node:http').IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
        let data = '';
        req.on('data', (chunk) => (data += chunk));
        req.on('end', () => resolve(data));
        req.on('error', reject);
    });
}
function upsertRegion(source: string, biomeId: string, points: {
    x: number;
    y: number;
}[]): string | null {
    const idRegex = new RegExp(`id:\\s*['"\`]${escapeRegex(biomeId)}['"\`]`);
    const idMatch = idRegex.exec(source);
    if (!idMatch)
        return null;
    const indent = '    ';
    const regionLiteral = buildRegionLiteral(points, indent);
    const afterId = source.slice(idMatch.index);
    const levelsIdx = afterId.indexOf('levels:');
    if (levelsIdx === -1)
        return null;
    const blockStart = idMatch.index;
    const blockEnd = idMatch.index + levelsIdx;
    const block = source.slice(blockStart, blockEnd);
    const regionRegex = /region:\s*\[[\s\S]*?\],\s*/;
    if (regionRegex.test(block)) {
        const newBlock = block.replace(regionRegex, `${regionLiteral}\n${indent}`);
        return source.slice(0, blockStart) + newBlock + source.slice(blockEnd);
    }
    const insertPos = blockEnd;
    return (source.slice(0, insertPos) +
        `${regionLiteral}\n${indent}` +
        source.slice(insertPos));
}
function buildRegionLiteral(points: {
    x: number;
    y: number;
}[], indent: string): string {
    const inner = points
        .map((p) => `${indent}  { x: ${p.x}, y: ${p.y} },`)
        .join('\n');
    return `region: [\n${inner}\n${indent}],`;
}
function escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
