import { useEffect } from "react";
import { preloadImagesInBackground } from "@/lib/imageCache";
import { fetchCached } from "@/lib/queryCache";
import { loadMissionRoomAssets } from "@/hooks/useMissionRoomAssets";
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

const bundledImages = import.meta.glob<string>(
  "../assets/**/*.{png,jpg,jpeg,webp,svg}",
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

async function warmVisualCache(user: CurrentUser | null) {
  // Usa as mesmas chaves das telas: além das imagens, os dados já ficam
  // disponíveis quando o usuário abre cada seção.
  const requests = [
    fetchCached("conteudoModulos", getModulos),
    loadMissionRoomAssets(),
    fetchCached("arcade-games", getArcadeGames),
    fetchCached("achievementTrail", getAchievementTrail),
    fetchCached("achievementRecent", getRecentAchievements),
    fetchCached("dashboardDaily", getDashboardDailyChallenge),
    fetchCached("dashboardJourney", getDashboardJourney),
    fetchCached("dashboardRanking:global", () => getDashboardRanking("global")),
    fetchCached("dashboardRanking:company", () =>
      getDashboardRanking("company"),
    ),
  ];
  const results = await Promise.allSettled(requests);
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
