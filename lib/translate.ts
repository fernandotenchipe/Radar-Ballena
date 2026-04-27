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

const CACHE_STORAGE_KEY = "translations-cache";

function getCacheKey(item: {
  whaleName?: string;
  marketTitle?: string;
  answer?: string;
}) {
  return [item.whaleName ?? "", item.marketTitle ?? "", item.answer ?? ""].join("|");
}

export async function translateAlerts(
  items: AlertTranslationInput[],
): Promise<AlertTranslationResult[]> {
  if (items.length === 0) {
    return [];
  }

  if (typeof window === "undefined") {
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
    return !cached[key];
  });

  if (missing.length === 0) {
    return items
      .map((item) => cached[getCacheKey(item)])
      .filter((value): value is AlertTranslationResult => Boolean(value));
  }

  try {
    const res = await fetch("/api/translate-alerts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: missing.slice(0, 8),
      }),
    });

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
