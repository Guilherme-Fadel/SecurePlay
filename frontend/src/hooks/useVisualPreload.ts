import { useEffect } from "react";
import { preloadImagesInBackground } from "@/lib/imageCache";
import { fetchCached } from "@/lib/queryCache";
import { companyCacheKey, companyFeaturesForUser } from "@/config/features";
import {
  getAchievementTrail,
  getRecentAchievements,
} from "@/services/achievements";
import { getArcadeGames } from "@/services/arcade";
import { getModulos } from "@/services/conteudo";
import {
  getDashboardDailyChallenge,
  getDashboardJourney,
  getDashboardRanking,
} from "@/services/dashboard";
import type { CurrentUser } from "@/services/me";

// Imagens do bundle, menos as que nenhuma tela usa desde o redesign: a marca
// (só favicon/manifest), a arte antiga do Ranking e rascunhos locais da chave e
// do panorama da jornada (o DigitalKeyIcon usa a v5).
const bundledImages = import.meta.glob<string>(
  [
    "../assets/**/*.{png,jpg,jpeg,webp,svg}",
    "!../assets/static/brand/**",
    "!../assets/static/ranking/**",
    "!../assets/dashboard/digital-key-pixel-v[1-4].png",
    "!../assets/dashboard/journey-landscape-*",
  ],
  { eager: true, query: "?url", import: "default" },
);
const bundledImageUrls = Object.values(bundledImages);
const IMAGE_URL_PATTERN = /\.(?:avif|gif|jpe?g|png|svg|webp)(?:[?#]|$)/i;

function collectImageUrls(
  value: unknown,
  output: Set<string>,
  visited = new WeakSet<object>(),
) {
  if (typeof value === "string") {
    if (IMAGE_URL_PATTERN.test(value)) output.add(value);
    return;
  }
  if (!value || typeof value !== "object" || visited.has(value)) return;
  visited.add(value);
  if (Array.isArray(value)) {
    value.forEach((item) => collectImageUrls(item, output, visited));
    return;
  }
  Object.values(value).forEach((item) =>
    collectImageUrls(item, output, visited),
  );
}

/**
 * Mesmas chaves das telas: `useCachedQuery` guarda cada consulta sob
 * `companyCacheKey(chave, usuário)`, então o pré-carregamento precisa usar a
 * mesma composição para os dados chegarem prontos. Só consulta o que a escola
 * liga (ranking, Global, conquistas), como as telas.
 */
function warmRequests(user: CurrentUser) {
  const features = companyFeaturesForUser(user);
  const key = (base: string) => companyCacheKey(base, user);
  // O Início sempre pede "Minha instituição"; sem instituição (e fora do
  // platform_admin, que troca de empresa no Ranking) o Ranking abre no Global.
  const rankingScope = user.empresa_id || user.role === "platform_admin" || !features.globalRanking ? "company" : "global";
  const requests: Array<Promise<unknown>> = [
    fetchCached(key("conteudoModulos"), getModulos),
    fetchCached(key("dashboardJourney"), getDashboardJourney),
  ];
  requests.push(fetchCached(key("dashboardDaily"), getDashboardDailyChallenge));
  if (features.games.length > 0) requests.push(fetchCached(key("arcade-games"), getArcadeGames));
  if (features.achievements) {
    requests.push(fetchCached(key("achievementTrail"), getAchievementTrail));
    requests.push(fetchCached(key("achievementRecent"), getRecentAchievements));
  }
  if (features.ranking) {
    // Igual a useDashboardRanking(escopo, sem empresa, 'current', sem temporada).
    requests.push(fetchCached(key(`dashboardRanking:${rankingScope}:self:current:none`), () => getDashboardRanking(rankingScope)));
  }
  return requests;
}

async function warmVisualCache(user: CurrentUser) {
  const results = await Promise.allSettled(warmRequests(user));
  const imageUrls = new Set<string>(bundledImageUrls);
  collectImageUrls(user, imageUrls);
  results.forEach((result) => {
    if (result.status === "fulfilled")
      collectImageUrls(result.value, imageUrls);
  });

  // Quatro downloads paralelos aquecem o cache sem saturar a conexão nem
  // bloquear as chamadas essenciais do dashboard.
  await preloadImagesInBackground([...imageUrls], 4);
}

export function useVisualPreload(user: CurrentUser | null) {
  useEffect(() => {
    if (!user) return;
    const timer = window.setTimeout(() => {
      void warmVisualCache(user);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [user?.userId, user?.profile_image_url, user?.empresa_logo]);
}
