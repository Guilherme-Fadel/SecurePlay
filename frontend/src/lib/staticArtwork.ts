import type { Modulo } from '@/services/conteudo';

type AssetMap = Record<string, string>;

function mapByFileName(files: Record<string, string>): AssetMap {
  return Object.fromEntries(
    Object.entries(files).map(([path, url]) => {
      const segments = path.split('/');
      const fileName = segments[segments.length - 1] ?? path;
      return [fileName.replace(/\.(?:png|webp)$/i, ''), url];
    }),
  );
}

const missionRoomFiles = import.meta.glob<string>(
  '../assets/static/mission-room/*.{png,webp}',
  { eager: true, query: '?url', import: 'default' },
);
const achievementFiles = import.meta.glob<string>(
  '../assets/static/achievements/*.png',
  { eager: true, query: '?url', import: 'default' },
);
const gameFiles = import.meta.glob<string>(
  '../assets/static/games/*.png',
  { eager: true, query: '?url', import: 'default' },
);

export const missionRoomAssets = mapByFileName(missionRoomFiles);
export const achievementAssets = mapByFileName(achievementFiles);
export const gameAssets = mapByFileName(gameFiles);

const moduleArtworkByTitle: Record<string, string> = {
  'guardioes das senhas': missionRoomAssets['module-passwords'],
  'detetives da internet': achievementAssets['investigador-lendario'],
  'herois da privacidade': missionRoomAssets['module-privacy'],
  'defensores do dispositivo': missionRoomAssets['module-navigation'],
  'fundamentos de seguranca': missionRoomAssets['module-foundations'],
  'senhas e autenticacao': missionRoomAssets['module-authentication'],
  'phishing e engenharia social': missionRoomAssets['module-phishing'],
};

const moduleArtworkByKey: Record<string, string> = {
  ...missionRoomAssets,
  'module-detectives': achievementAssets['investigador-lendario'],
};

const gameAliases: Record<string, string> = {
  'caca-phishing-pixel': 'caca-phishing',
  'classificacao-dados-pixel': 'classificacao-dados',
  'quiz-relampago-pixel': 'quiz-relampago',
  'termotech-pixel': 'termotech',
};

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function assetKeyFromReference(source?: string | null): string | null {
  if (!source) return null;
  const cleanSource = source.split(/[?#]/, 1)[0].replace(/\\/g, '/');
  const segments = cleanSource.split('/');
  const fileName = segments[segments.length - 1] ?? cleanSource;
  const key = fileName.replace(/\.(?:jpe?g|png|svg|webp)$/i, '');
  return key || null;
}

export function getModuleArtwork(
  modulo: Pick<Modulo, 'title' | 'thumbnail' | 'artworkUrl'>,
): string {
  const titleArtwork = moduleArtworkByTitle[normalize(modulo.title)];
  if (titleArtwork) return titleArtwork;

  for (const reference of [modulo.artworkUrl, modulo.thumbnail]) {
    const key = assetKeyFromReference(reference);
    if (key && moduleArtworkByKey[key]) return moduleArtworkByKey[key];
  }

  return missionRoomAssets['icon-book'];
}

export function getAchievementArtwork(
  slug?: string | null,
  source?: string | null,
): string | null {
  if (slug && achievementAssets[slug]) return achievementAssets[slug];
  const sourceKey = assetKeyFromReference(source);
  if (sourceKey && achievementAssets[sourceKey]) return achievementAssets[sourceKey];
  return source && /^(?:https?:\/\/|\/)/.test(source) ? source : null;
}

export function getGameArtwork(
  source: string | null | undefined,
  slug: string,
): string {
  if (gameAssets[slug]) return gameAssets[slug];
  const sourceKey = assetKeyFromReference(source);
  const localKey = sourceKey ? (gameAliases[sourceKey] ?? sourceKey) : null;
  if (localKey && gameAssets[localKey]) return gameAssets[localKey];
  return source && /^(?:https?:\/\/|\/)/.test(source) ? source : '';
}
