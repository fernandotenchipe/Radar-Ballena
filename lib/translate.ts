import { buildLocalAlertTranslation } from "@/lib/translateFallback";

export type AlertTranslationInput = {
  id: string;
  whaleName?: string;
  marketTitle: string;
  answer: string;
};

export type AlertTranslationResult = {
  id: string;
  whaleNameEs?: string;
  marketTitleEs?: string;
  answerEs?: string;
};

export const TRANSLATION_UPDATE_EVENT = "radarballena-translations-updated";

type TranslationCacheEntry = {
  translation: AlertTranslationResult;
  sourceSignature: string;
};

type TranslationCache = Record<string, TranslationCacheEntry>;

const CACHE_STORAGE_KEY = "translations-cache-v5";

function getCacheKey(item: {
  whaleName?: string;
  marketTitle?: string;
  answer?: string;
}) {
  return [item.whaleName ?? "", item.marketTitle ?? "", item.answer ?? ""].join("|");
}

function cleanText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeForSimilarity(value: string) {
  let text = cleanText(value).toLowerCase();

  text = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  text = text.replace(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/gi, "<month>");
  text = text.replace(/\b\d{1,2},\s*\d{4}\b/g, "<date>");
  text = text.replace(/\b\d{4}\b/g, "<year>");
  text = text.replace(/\b\d+([.,]\d+)?\b/g, "<num>");
  text = text.replace(/["'“”‘’?.!,;:()[\]{}\/\\-]+/g, " ");
  text = text.replace(/\s+/g, " ").trim();

  return text;
}

function getSourceSignature(item: AlertTranslationInput) {
  return [
    normalizeForSimilarity(item.whaleName ?? ""),
    normalizeForSimilarity(item.marketTitle),
    normalizeForSimilarity(item.answer),
  ].join("|");
}

function getCachedEntry(
  item: AlertTranslationInput,
  cached: TranslationCache,
): TranslationCacheEntry | undefined {
  const exact = cached[getCacheKey(item)];
  const signature = getSourceSignature(item);

  // Helper to extract translation from either old (direct) or new (wrapped) format
  const extractTranslation = (entry: unknown): AlertTranslationResult | undefined => {
    if (!entry || typeof entry !== 'object') return undefined;
    const obj = entry as Record<string, unknown>;
    return 'translation' in obj ? (obj.translation as AlertTranslationResult) : (obj as AlertTranslationResult);
  };

  // Helper to wrap translation into TranslationCacheEntry for consistent return type
  const wrapEntry = (entry: unknown, sig: string): TranslationCacheEntry => {
    if (!entry || typeof entry !== 'object') return { translation: { id: "", whaleNameEs: "", marketTitleEs: "", answerEs: "" }, sourceSignature: sig };
    const obj = entry as Record<string, unknown>;
    if ('translation' in obj) return obj as TranslationCacheEntry;
    return { translation: obj as AlertTranslationResult, sourceSignature: sig };
  };

  // Try exact key match with new format
  if (exact?.translation && !looksUntranslated(item, exact.translation)) {
    return exact;
  }

  // Try exact key match with old format (direct AlertTranslationResult)
  if (exact && !('translation' in exact)) {
    const translation = extractTranslation(exact);
    if (translation && !looksUntranslated(item, translation)) {
      return wrapEntry(exact, signature);
    }
  }

  // Try similarity-based match (new format)
  return Object.values(cached).find(
    (entry) => {
      const translation = extractTranslation(entry);
      const entrySignature = ('sourceSignature' in entry) ? entry.sourceSignature : "";
      return entrySignature === signature && translation && !looksUntranslated(item, translation);
    },
  );
}

function looksUntranslated(
  original: AlertTranslationInput,
  translation?: AlertTranslationResult,
) {
  const translated = translation?.marketTitleEs?.trim().toLowerCase();
  const source = original.marketTitle.trim().toLowerCase();

  if (!translated) return true;
  if (translated === source) return true;

  // Only check the STRONGEST signals of English untranslated content
  const strongEnglishSignals = [
    " will the ",
    " will ",  // only if not at end (very likely untranslated)
    " by may ",
    " by june ",
    " by ",  // strong signal at start
  ];

  const padded = ` ${translated} `;
  // Check for strong English patterns
  if (strongEnglishSignals.some((term) => padded.includes(term))) {
    return true;
  }

  // If it's very short and identical to original, it's untranslated
  if (translated.length < 20 && translated === source) {
    return true;
  }

  return false;
}

function materializeTranslation(
  item: AlertTranslationInput,
  translation?: AlertTranslationResult,
): AlertTranslationResult | undefined {
  if (!translation) return undefined;

  return {
    ...translation,
    id: item.id,
  };
}

async function warmTranslationCache(
  missing: AlertTranslationInput[],
  cached: TranslationCache,
) {
  try {
    console.log("calling /api/translate-alerts with IDs:", missing.slice(0, 6).map((m) => m.id));

    const res = await fetch("/api/translate-alerts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: missing.slice(0, 6),
      }),
    });

    console.log("translate-alerts status", res.status);

    if (!res.ok) {
      return;
    }

    const data = (await res.json()) as {
      translations?: AlertTranslationResult[];
    };

    console.log("translate-alerts received IDs:", (data.translations ?? []).map((t) => t.id));

    const usableFreshById = new Map<string, AlertTranslationResult>();

    for (const translation of data.translations ?? []) {
      const original = missing.find((item) => item.id === translation.id);
      if (!original) {
        console.warn("translateAlerts: received translation for unknown ID", translation.id);
        continue;
      }

      const key = getCacheKey(original);
      const isUntranslated = looksUntranslated(original, translation);

      if (isUntranslated) {
        console.log(`[CLIENT] Rejecting translation for ${translation.id}: "${translation.marketTitleEs?.substring(0, 60)}" looks untranslated`);
        continue;
      }

      usableFreshById.set(original.id, translation);
      cached[key] = {
        translation,
        sourceSignature: getSourceSignature(original),
      };
    }

    window.localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(cached));

    const result = missing
      .map((item) => {
        const fresh = usableFreshById.get(item.id);
        if (fresh) return materializeTranslation(item, fresh);

        const cachedEntry = getCachedEntry(item, cached);
        return materializeTranslation(item, cachedEntry?.translation);
      })
      .filter((value): value is AlertTranslationResult => Boolean(value));

    if (result.length > 0) {
      window.dispatchEvent(
        new CustomEvent(TRANSLATION_UPDATE_EVENT, {
          detail: { translations: result },
        }),
      );
    }
  } catch (error) {
    console.error("translateAlerts warm cache error:", error);
  }
}

export async function translateAlerts(
  items: AlertTranslationInput[],
): Promise<AlertTranslationResult[]> {
  console.log("translateAlerts called with IDs:", items.map((i) => i.id));

  if (items.length === 0) {
    console.log("translateAlerts skipped: empty items");
    return [];
  }

  if (typeof window === "undefined") {
    console.log("translateAlerts skipped: server side");
    return [];
  }

  let cached: TranslationCache = {};

  try {
    cached = JSON.parse(window.localStorage.getItem(CACHE_STORAGE_KEY) ?? "{}") as TranslationCache;
  } catch {
    cached = {};
  }

  const missing = items.filter((item) => {
    const cachedItem = getCachedEntry(item, cached);

    return !cachedItem;
  });

  console.log("translateAlerts cached keys", Object.keys(cached).length);
  console.log("translateAlerts missing IDs", missing.map((m) => m.id));

  if (missing.length > 0) {
    void warmTranslationCache(missing, cached);
  }

  const result = items
    .map((item) => {
      const cachedEntry = getCachedEntry(item, cached);
      if (cachedEntry?.translation) {
        return materializeTranslation(item, cachedEntry.translation);
      }

      return materializeTranslation(item, buildLocalAlertTranslation(item));
    })
    .filter((value): value is AlertTranslationResult => Boolean(value));

  console.log("translateAlerts returning immediate IDs:", result.map((r) => r.id));
  return result;
}
