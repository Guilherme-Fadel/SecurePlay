import { useEffect, useMemo, useState } from 'react';
import { lookArtUrls, ownCharacter } from '@/components/sections/HomePage/Awards/characterModel';
import { waitForImages } from '@/lib/imageCache';
import { useAchievementShop } from './useAchievements';
import { useCompanyFeatures } from './useCompanyFeatures';
import { useCurrentUser } from './useCurrentUser';

/** Teto de espera pelo personagem: passado isso a tela de carregamento nunca fica presa. */
export const CHARACTER_READY_TIMEOUT_MS = 6000;

/**
 * O personagem do usuário logado: peças equipadas e cor base. Gestão e empresas sem colecionáveis
 * (sem loja) veem o personagem padrão na cor base da conta.
 */
export function useMyCharacter() {
  const features = useCompanyFeatures();
  const { data: shop } = useAchievementShop(features.achievements);
  const { user } = useCurrentUser();
  const accountColor = user?.character_color;
  return useMemo(() => ownCharacter(shop, accountColor), [shop, accountColor]);
}

/**
 * `true` quando o personagem pode ser desenhado completo: a empresa não tem loja, ou a loja já
 * respondeu (dados ou erro) e as artes das peças equipadas terminaram de baixar (ou falharam).
 * Há um teto de {@link CHARACTER_READY_TIMEOUT_MS} para nunca prender a tela de carregamento.
 */
export function useMyCharacterReady(): boolean {
  const features = useCompanyFeatures();
  const { data: shop, loading, error } = useAchievementShop(features.achievements);
  const { look } = useMyCharacter();
  const artKey = lookArtUrls(look).join('|');
  const shopSettled = Boolean(shop) || Boolean(error) || !loading;
  const waiting = features.achievements;

  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!waiting) return;
    const timer = window.setTimeout(() => setTimedOut(true), CHARACTER_READY_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [waiting]);

  useEffect(() => {
    if (!waiting || !shopSettled) return;
    let cancelled = false;
    void waitForImages(artKey ? artKey.split('|') : []).then(() => {
      if (!cancelled) setLoadedKey(artKey);
    });
    return () => { cancelled = true; };
  }, [waiting, shopSettled, artKey]);

  const ready = !waiting || timedOut || (shopSettled && loadedKey === artKey);
  // Só a primeira carga segura a tela: equipar uma peça depois não pode trazer o carregamento de volta.
  // Sem usuário ainda (sessão carregando) não há o que travar: não conta como primeira carga.
  const { user } = useCurrentUser();
  const hasUser = Boolean(user);
  const [settled, setSettled] = useState(false);
  useEffect(() => { if (ready && hasUser) setSettled(true); }, [ready, hasUser]);
  return settled || ready;
}
