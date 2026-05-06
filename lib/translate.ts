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

  if (exact?.translation && !looksUntranslated(item, exact.translation)) {
    return exact;
  }

  return Object.values(cached).find(
    (entry) => entry.sourceSignature === signature && !looksUntranslated(item, entry.translation),
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

  const englishSignals = [
    " will ",
    " by ",
    " before ",
    " after ",
    " occur ",
    " win ",
    " out as ",
    " chair ",
    " nuclear ",
    " deal ",
    " surrender ",
    " stockpile ",
    " fed ",
    " u.s.",
    " us ",
  ];

  const padded = ` ${translated} `;
  return englishSignals.some((term) => padded.includes(term));
}

export async function translateAlerts(
  items: AlertTranslationInput[],
): Promise<AlertTranslationResult[]> {
  console.log("translateAlerts called", items);

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
  console.log("translateAlerts missing", missing);

  if (missing.length === 0) {
    return items
      .map((item) => getCachedEntry(item, cached)?.translation)
      .filter((value): value is AlertTranslationResult => Boolean(value));
  }

  try {
    console.log("calling /api/translate-alerts", missing.slice(0, 6));

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
      return items
        .map((item) => getCachedEntry(item, cached)?.translation)
        .filter((value): value is AlertTranslationResult => Boolean(value));
    }

    const data = (await res.json()) as {
      translations?: AlertTranslationResult[];
    };

    const usableFreshById = new Map<string, AlertTranslationResult>();

    for (const translation of data.translations ?? []) {
      const original = missing.find((item) => item.id === translation.id);
      if (!original) continue;

      const key = getCacheKey(original);
      if (!looksUntranslated(original, translation)) {
        usableFreshById.set(original.id, translation);
        cached[key] = {
          translation,
          sourceSignature: getSourceSignature(original),
        };
      }
    }

    window.localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(cached));

    return items
      .map((item) => {
        const fresh = usableFreshById.get(item.id);
        if (fresh) return fresh;

        const cachedEntry = getCachedEntry(item, cached);
        return cachedEntry?.translation;
      })
      .filter((value): value is AlertTranslationResult => Boolean(value));
  } catch {
    // On error, return only cached entries that look translated.
    return items
      .map((item) => getCachedEntry(item, cached)?.translation)
      .filter((value): value is AlertTranslationResult => Boolean(value));
  }
}
