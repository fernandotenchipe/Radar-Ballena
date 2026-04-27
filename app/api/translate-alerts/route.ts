import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";

export const runtime = "nodejs";
export const maxDuration = 15;

type TranslateItem = {
  id: string;
  whaleName?: string;
  marketTitle?: string;
  answer?: string;
};

type CachedTranslation = {
  whaleNameEs: string;
  marketTitleEs: string;
  answerEs: string;
};

type AIItem = {
  key: string;
  whaleName: string;
  marketTitle: string;
  answer: string;
};

type AITranslation = {
  key: string;
  whaleNameEs?: string;
  marketTitleEs?: string;
  answerEs?: string;
};

const MAX_ITEMS = 15;
const TIMEOUT_MS = 2_500;
const MAX_CACHE_SIZE = 3000;

const globalCache = globalThis as typeof globalThis & {
  __radarTranslateCache?: Map<string, CachedTranslation>;
};

const cache =
  globalCache.__radarTranslateCache ?? new Map<string, CachedTranslation>();

globalCache.__radarTranslateCache = cache;

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function cleanItems(rawItems: unknown[]): TranslateItem[] {
  const seen = new Set<string>();
  const items: TranslateItem[] = [];

  for (const raw of rawItems) {
    if (!raw || typeof raw !== "object") continue;

    const obj = raw as Record<string, unknown>;

    const item: TranslateItem = {
      id: cleanText(obj.id),
      whaleName: cleanText(obj.whaleName),
      marketTitle: cleanText(obj.marketTitle),
      answer: cleanText(obj.answer),
    };

    if (!item.id) continue;

    // Importante: ya NO exigimos marketTitle.
    // Asi tambien traduce canales bloqueados.
    if (!item.whaleName && !item.marketTitle && !item.answer) continue;

    if (seen.has(item.id)) continue;
    seen.add(item.id);

    items.push(item);
    if (items.length >= MAX_ITEMS) break;
  }

  return items;
}

function makeKey(item: TranslateItem): string {
  const payload = JSON.stringify({
    whaleName: item.whaleName?.toLowerCase() ?? "",
    marketTitle: item.marketTitle?.toLowerCase() ?? "",
    answer: item.answer?.toLowerCase() ?? "",
  });

  return crypto.createHash("sha256").update(payload).digest("hex").slice(0, 24);
}

function setCache(key: string, value: CachedTranslation) {
  if (cache.size >= MAX_CACHE_SIZE) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }

  cache.set(key, value);
}

const exactWhales: Record<string, string> = {
  "global sports arb lambda": "Arbitraje Deportivo Global ",
  "nba volume trader theta": "Operador de Volumen NBA Teta",
  "everything trader zeta": "Trader Todoterreno ",
  "everything trader delta": "Trader Todoterreno ",
  "geopolitical macro omega": "Macro Geopolitico ",
  "soccer esports titan alpha": "Titan del Futbol Esports ",
  "sports grinder": "Grinder Deportivo",
};

function whaleNameFallback(name = ""): string {
  const n = cleanText(name);
  if (!n) return "";

  const exact = exactWhales[n.toLowerCase()];
  if (exact) return exact;

  let out = n;

  out = out.replace(/\bGlobal Sports Arb\b/gi, "Arbitraje Deportivo Global");
  out = out.replace(/\bNBA Volume Trader\b/gi, "Operador de Volumen NBA");
  out = out.replace(/\bEverything Trader\b/gi, "Trader Todoterreno");
  out = out.replace(/\bGeopolitical Macro\b/gi, "Macro Geopolitico");
  out = out.replace(/\bSoccer Esports Titan\b/gi, "Titan del Futbol Esports");
  out = out.replace(/\bSports Esports Titan\b/gi, "Titan Deportivo Esports");
  out = out.replace(/\bSports Grinder\b/gi, "El Grinder Deportivo");
  out = out.replace(/\bSports Arb\b/gi, "Arbitraje Deportivo");
  out = out.replace(/\bGlobal Sports\b/gi, "Radar Deportivo Global");

  return out;
}

function answerFallback(answer = ""): string {
  const a = cleanText(answer);
  if (!a) return "";

  const map: Record<string, string> = {
    yes: "Si",
    no: "No",
    over: "Mas",
    under: "Menos",
    buy: "Compra",
    sell: "Venta",
  };

  return map[a.toLowerCase()] ?? a;
}

const months: Record<string, string> = {
  january: "enero",
  february: "febrero",
  march: "marzo",
  april: "abril",
  may: "mayo",
  june: "junio",
  july: "julio",
  august: "agosto",
  september: "septiembre",
  october: "octubre",
  november: "noviembre",
  december: "diciembre",
};

function translateMonths(text: string): string {
  return text.replace(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/gi,
    (match) => months[match.toLowerCase()] ?? match
  );
}

function marketTitleFallback(title = ""): string {
  let t = cleanText(title);
  if (!t) return "";

  t = translateMonths(t);

  const ou = t.match(/^(.+?)\s*:\s*O\/U\s*([0-9.]+)$/i);
  if (ou) return `${ou[1]}: Mas/Menos de ${ou[2]}`;

  const spread = t.match(/^Spread:\s*(.+)$/i);
  if (spread) return `Diferencial: ${spread[1]}`;

  const moneyline = t.match(/^Moneyline:\s*(.+)$/i);
  if (moneyline) return `Ganador directo: ${moneyline[1]}`;

  t = t.replace(/\bO\/U\b/gi, "Mas/Menos");
  t = t.replace(/\bOver\/Under\b/gi, "Mas/Menos");
  t = t.replace(/\bSpread\b/gi, "Diferencial");
  t = t.replace(/\bMarket cap\b/gi, "capitalizacion de mercado");
  t = t.replace(/\bPresidential Election\b/gi, "elecciones presidenciales");
  t = t.replace(/\(LOW\)/gi, "(minimo)");
  t = t.replace(/\(HIGH\)/gi, "(maximo)");

  t = t.replace(
    /^Will\s+(.+?)\s+hit\s+(.+?)\s+in\s+(.+?)\?$/i,
    "¿$1 alcanzara $2 en $3?"
  );

  t = t.replace(
    /^Will\s+(.+?)\s+win\s+(.+?)\?$/i,
    "¿$1 ganara $2?"
  );

  t = t.replace(/^Will\s+(.+?)\?$/i, "¿$1?");

  return t;
}

function fallbackTranslation(item: TranslateItem): CachedTranslation {
  return {
    whaleNameEs: whaleNameFallback(item.whaleName),
    marketTitleEs: marketTitleFallback(item.marketTitle),
    answerEs: answerFallback(item.answer),
  };
}

async function translateWithAI(
  items: AIItem[],
  fallbacks: Map<string, CachedTranslation>
): Promise<Map<string, CachedTranslation>> {
  const result = new Map<string, CachedTranslation>();

  if (items.length === 0) return result;
  if (!process.env.OPENAI_API_KEY) return result;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const prompt = `Traduce al espanol editorial para un dashboard llamado RadarBallena.

Reglas:
- Devuelve SOLO JSON valido.
- No inventes datos.
- Conserva equipos, personas, ligas, tickers y siglas.
- Si marketTitle esta vacio, dejalo vacio.
- whaleName debe ser alias editorial corto, natural y potente.
- Conserva Alpha, Beta, Theta, Omega, Lambda, Delta o Zeta si aparecen.
- answer traducelo solo si aplica: Yes/No/Over/Under/Buy/Sell.
- marketTitle debe sonar claro para usuario hispano.

Formato exacto:
{
  "translations": [
    {
      "key": "...",
      "whaleNameEs": "...",
      "marketTitleEs": "...",
      "answerEs": "..."
    }
  ]
}

Datos:
${JSON.stringify(items)}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_TRANSLATE_MODEL ?? "gpt-4o-mini",
        temperature: 0,
        max_tokens: 1800,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "Devuelve unicamente JSON valido. Nada de markdown.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(`OpenAI error ${response.status}`);
    }

    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("Respuesta vacia del traductor");
    }

    const parsed = JSON.parse(
      content.replace(/^```json\s*/i, "").replace(/```$/i, "")
    ) as { translations?: AITranslation[] };

    for (const row of parsed.translations ?? []) {
      const key = cleanText(row.key);
      if (!key) continue;

      const fallback = fallbacks.get(key) ?? {
        whaleNameEs: "",
        marketTitleEs: "",
        answerEs: "",
      };

      result.set(key, {
        whaleNameEs: cleanText(row.whaleNameEs) || fallback.whaleNameEs,
        marketTitleEs: cleanText(row.marketTitleEs) || fallback.marketTitleEs,
        answerEs: cleanText(row.answerEs) || fallback.answerEs,
      });
    }

    return result;
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const rawItems = Array.isArray(body?.items) ? body.items : null;

    if (!rawItems) {
      return NextResponse.json(
        { ok: false, error: "items invalido" },
        { status: 400 }
      );
    }

    const items = cleanItems(rawItems);

    if (items.length === 0) {
      return NextResponse.json({
        ok: true,
        translations: [],
        meta: {
          total: 0,
          unique: 0,
          cacheHits: 0,
        },
      });
    }

    const fallbacks = new Map<string, CachedTranslation>();
    const uniqueForAI: AIItem[] = [];
    const seenKeys = new Set<string>();

    let cacheHits = 0;

    for (const item of items) {
      const key = makeKey(item);
      const fallback = fallbackTranslation(item);

      fallbacks.set(key, fallback);

      if (cache.has(key)) {
        cacheHits++;
        continue;
      }

      if (seenKeys.has(key)) continue;
      seenKeys.add(key);

      uniqueForAI.push({
        key,
        whaleName: item.whaleName ?? "",
        marketTitle: item.marketTitle ?? "",
        answer: item.answer ?? "",
      });
    }

    let aiTranslations = new Map<string, CachedTranslation>();
    let aiWarning: string | undefined;

    try {
      aiTranslations = await translateWithAI(uniqueForAI, fallbacks);
    } catch (error) {
      console.error("translate-alerts AI fallback:", error);
      aiWarning = "AI no respondio a tiempo; se uso traduccion local.";
    }

    for (const [key, fallback] of fallbacks) {
      if (cache.has(key)) continue;

      const translated = aiTranslations.get(key) ?? fallback;
      setCache(key, translated);
    }

    const translations = items.map((item) => {
      const key = makeKey(item);
      const translated = cache.get(key) ?? fallbackTranslation(item);

      return {
        id: item.id,
        whaleNameEs: translated.whaleNameEs,
        marketTitleEs: translated.marketTitleEs,
        answerEs: translated.answerEs,
      };
    });

    return NextResponse.json({
      ok: true,
      translations,
      meta: {
        total: items.length,
        unique: seenKeys.size,
        cacheHits,
        aiUsed: aiTranslations.size,
        warning: aiWarning,
      },
    });
  } catch (error) {
    console.error("translate-alerts route error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    );
  }
}
