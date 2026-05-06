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

type TranslationCache = Record<string, AlertTranslationResult>;

const CACHE_STORAGE_KEY = "translations-cache-v3";

function getCacheKey(item: {
  whaleName?: string;
  marketTitle?: string;
  answer?: string;
}) {
  return [item.whaleName ?? "", item.marketTitle ?? "", item.answer ?? ""].join("|");
}

function looksUntranslated(item: AlertTranslationInput, cached?: AlertTranslationResult) {
  if (!cached?.marketTitleEs) return true;

  const original = item.marketTitle.trim().toLowerCase();
  const translated = cached.marketTitleEs.trim().toLowerCase();

  if (!translated) return true;

  // Si quedo igual o casi igual, re-traducir.
  if (translated === original) return true;

  // Senales claras de que sigue en ingles.
  const englishSignals = [
    "will ",
    " by ",
    " before ",
    " after ",
    " occur ",
    " win ",
    " out as ",
    " chair ",
    " nuclear deal",
    " permanent peace deal",
    " surrender ",
    " stockpile",
    " fed ",
    " u.s.",
    " us ",
    "iran",
  ];

  const hasEnglish = englishSignals.some((term) => translated.includes(term));

  // Si todavia tiene varias palabras inglesas tipicas, re-traducir.
  return hasEnglish;
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
    const key = getCacheKey(item);
    const cachedItem = cached[key];

    return !cachedItem || looksUntranslated(item, cachedItem);
  });

  console.log("translateAlerts cached keys", Object.keys(cached).length);
  console.log("translateAlerts missing", missing);

  if (missing.length === 0) {
    return items
      .map((item) => cached[getCacheKey(item)])
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
        .map((item) => cached[getCacheKey(item)])
        .filter((value): value is AlertTranslationResult => Boolean(value));
    }

    const data = (await res.json()) as {
      translations?: AlertTranslationResult[];
    };

    for (const translation of data.translations ?? []) {
      const original = missing.find((item) => item.id === translation.id);
      if (!original) continue;

      const key = getCacheKey(original);
      cached[key] = translation;
    }

    window.localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(cached));

    return items
      .map((item) => cached[getCacheKey(item)])
      .filter((value): value is AlertTranslationResult => Boolean(value));
  } catch {
    return items
      .map((item) => cached[getCacheKey(item)])
      .filter((value): value is AlertTranslationResult => Boolean(value));
  }
}
