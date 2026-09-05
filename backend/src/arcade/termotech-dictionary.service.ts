import { Injectable } from '@nestjs/common';
import { isBlockedTermoWord } from './termotech-blocked-words';

type Language = 'pt' | 'en';
type LookupResult = 'found' | 'missing' | 'unavailable';

export interface TermoWordValidation {
  valid: boolean;
  languages: Language[];
  verified: boolean;
  reason?: 'blocked' | 'not_found';
}

interface CacheEntry extends TermoWordValidation {
  expiresAt: number;
}

const PORTUGUESE_DICTIONARY_URL = 'https://api.dicionario-aberto.net/word/';
const ENGLISH_DICTIONARY_URL = 'https://api.datamuse.com/words?sp=';
const REQUEST_TIMEOUT_MS = 3000;
const VALID_CACHE_MS = 24 * 60 * 60 * 1000;
const INVALID_CACHE_MS = 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 5000;

@Injectable()
export class TermoDictionaryService {
  private readonly cache = new Map<string, CacheEntry>();

  async validate(input: string): Promise<TermoWordValidation> {
    const word = input.trim().toLowerCase();

    if (isBlockedTermoWord(word)) {
      return {
        valid: false,
        languages: [],
        verified: true,
        reason: 'blocked',
      };
    }

    const cached = this.cache.get(word);

    if (cached && cached.expiresAt > Date.now()) {
      return this.toValidation(cached);
    }

    const [portuguese, english] = await Promise.all([
      this.lookupPortuguese(word),
      this.lookupEnglish(word),
    ]);
    const languages: Language[] = [];

    if (portuguese === 'found') languages.push('pt');
    if (english === 'found') languages.push('en');

    const verified = portuguese !== 'unavailable' && english !== 'unavailable';
    const validation: TermoWordValidation = {
      // If a provider is temporarily unavailable, keep this client-only game
      // playable instead of rejecting a potentially valid word.
      valid:
        languages.length > 0 ||
        portuguese === 'unavailable' ||
        english === 'unavailable',
      languages,
      verified,
      ...(languages.length === 0 && verified
        ? { reason: 'not_found' as const }
        : {}),
    };

    this.remember(word, validation);
    return validation;
  }

  private async lookupPortuguese(word: string): Promise<LookupResult> {
    return this.lookup(
      `${PORTUGUESE_DICTIONARY_URL}${encodeURIComponent(word)}`,
      word,
    );
  }

  private async lookupEnglish(word: string): Promise<LookupResult> {
    return this.lookup(
      `${ENGLISH_DICTIONARY_URL}${encodeURIComponent(word)}&max=10`,
      word,
    );
  }

  private async lookup(
    url: string,
    expectedWord: string,
  ): Promise<LookupResult> {
    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (response.status === 404) return 'missing';
      if (!response.ok) return 'unavailable';

      const payload: unknown = await response.json();
      if (!Array.isArray(payload)) return 'unavailable';

      const hasExactWord = payload.some((entry: unknown) => {
        if (!entry || typeof entry !== 'object' || !('word' in entry)) {
          return false;
        }

        return String(entry.word).toLowerCase() === expectedWord;
      });
      return hasExactWord ? 'found' : 'missing';
    } catch {
      return 'unavailable';
    }
  }

  private remember(word: string, validation: TermoWordValidation): void {
    if (this.cache.size >= MAX_CACHE_ENTRIES) {
      const oldest = this.cache.keys().next().value as string | undefined;
      if (oldest) this.cache.delete(oldest);
    }

    const ttl = validation.valid ? VALID_CACHE_MS : INVALID_CACHE_MS;
    this.cache.set(word, { ...validation, expiresAt: Date.now() + ttl });
  }

  private toValidation(entry: CacheEntry): TermoWordValidation {
    return {
      valid: entry.valid,
      languages: entry.languages,
      verified: entry.verified,
      ...(entry.reason ? { reason: entry.reason } : {}),
    };
  }
}
