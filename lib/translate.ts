export type AlertTranslationInput = {
  id: string;
  whaleName: string;
  marketTitle: string;
  answer: string;
};

export type AlertTranslationResult = {
  id: string;
  whaleNameEs?: string;
  marketTitleEs?: string;
  answerEs?: string;
};

export async function translateAlerts(
  items: AlertTranslationInput[],
): Promise<AlertTranslationResult[]> {
  if (items.length === 0) {
    return [];
  }

  const res = await fetch("/api/translate-alerts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ items }),
  });

  if (!res.ok) {
    throw new Error("No se pudieron traducir las alertas");
  }

  const data = (await res.json()) as {
    translations?: AlertTranslationResult[];
  };

  return Array.isArray(data.translations) ? data.translations : [];
}
