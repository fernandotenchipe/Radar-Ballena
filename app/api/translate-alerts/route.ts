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
  marketTitle: string;
  answer: string;
};

type AITranslation = {
  key: string;
  whaleNameEs?: string;
  marketTitleEs?: string;
  answerEs?: string;
};

const MAX_ITEMS = 8;
const TIMEOUT_MS = 3_500;
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
  "soccer esports titan alpha": "Titán del Fútbol Esports Alpha",
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
  out = out.replace(/\bSoccer Esports Titan\b/gi, "Titán del Fútbol Esports");
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
    yes: "Sí",
    no: "No",
    over: "Más",
    under: "Menos",
    buy: "Compra",
    sell: "Venta",
  };

  return map[a.toLowerCase()] ?? a;
}

function looksUntranslatedMarketTitle(source = "", translated = ""): boolean {
  const src = cleanText(source).toLowerCase();
  const out = cleanText(translated).toLowerCase();

  if (!out) return true;
  if (src && out === src) return true;

  // Only strongest English signals—avoid false positives
  const strongEnglishSignals = [
    " will the ",
    " before ",  // strong indicator of unsupported translation
    " after ",   // strong indicator
    " by may ",
    " by june ",
  ];

  const padded = ` ${out} `;
  return strongEnglishSignals.some((term) => padded.includes(term));
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

function translateDeadlineDate(text: string): string {
  return text.replace(
    /\bby\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(,\s*\d{4})?\??$/i,
    (_match, month, day, year = "") => {
      const monthEs = months[String(month).toLowerCase()] ?? month;
      return `antes del ${day} de ${monthEs}${year}?`;
    }
  );
}

function marketTitleFallback(title = ""): string {
  let t = cleanText(title);
  if (!t) return "";

  t = translateDeadlineDate(t);
  t = translateMonths(t);

  // Geopolitical translations
  t = t.replace(/\bUS-Iran\b/gi, "EE. UU.-Irán");
  t = t.replace(/\bUS x Iran\b/gi, "EE. UU. x Irán");
  t = t.replace(/\bIran\b/gi, "Irán");
  t = t.replace(/\bUkraine\b/gi, "Ucrania");
  t = t.replace(/\bRussia\b/gi, "Rusia");
  t = t.replace(/\bIsrael\b/gi, "Israel");
  t = t.replace(/\bChina\b/gi, "China");
  t = t.replace(/\bTaiwan\b/gi, "Taiwán");

  t = t.replace(/\bnuclear deal\b/gi, "acuerdo nuclear");
  t = t.replace(/\bpermanent peace deal\b/gi, "acuerdo de paz permanente");
  t = t.replace(/\bagrees to surrender\b/gi, "acepta entregar");
  t = t.replace(/\benriched uranium stockpile\b/gi, "reservas de uranio enriquecido");
  t = t.replace(/\bcloses its airspace\b/gi, "cierra su espacio aéreo");
  t = t.replace(/\bdiplomatic meeting\b/gi, "reunión diplomática");

  // Complete geopolitical patterns
  t = t.replace(
    /^EE\.\s*UU\.-Irán acuerdo nuclear antes del (.+)\?$/i,
    "¿Acuerdo nuclear entre EE. UU. e Irán antes del $1?"
  );

  t = t.replace(
    /^Irán acepta entregar reservas de uranio enriquecido antes del (.+)\?$/i,
    "¿Irán acepta entregar sus reservas de uranio enriquecido antes del $1?"
  );

  t = t.replace(
    /^EE\.\s*UU\. x Irán acuerdo de paz permanente antes del (.+)\?$/i,
    "¿Acuerdo de paz permanente entre EE. UU. e Irán antes del $1?"
  );

  t = t.replace(
    /^Irán cierra su espacio aéreo antes del (.+)\?$/i,
    "¿Irán cierra su espacio aéreo antes del $1?"
  );

  t = t.replace(
    /^Will the next (.+?) occur after (.+)\?$/i,
    "¿La próxima $1 ocurre después de $2?"
  );

  t = t.replace(
    /^Will the next (.+?) occur before (.+)\?$/i,
    "¿La próxima $1 ocurre antes de $2?"
  );

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

  const concurrency = Math.min(2, items.length);
  const retries = 2; // number of retries
  const baseBackoff = 500; // ms

  function chunkArray<T>(arr: T[], n: number): T[][] {
    const out: T[][] = [];
    const per = Math.ceil(arr.length / n);
    for (let i = 0; i < arr.length; i += per) out.push(arr.slice(i, i + per));
    return out;
  }

  function wait(ms: number) {
    return new Promise((res) => setTimeout(res, ms));
  }

  async function translateChunk(chunk: AIItem[], attempt: number): Promise<Map<string, CachedTranslation>> {
    const map = new Map<string, CachedTranslation>();
    console.log(`[SERVER] translateChunk attempt=${attempt} with keys=${chunk.map((i) => i.key).join(", ")}`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const prompt = `Traduce al espanol editorial para un dashboard llamado RadarBallena.

Reglas:
- Devuelve SOLO JSON valido.
- No inventes datos.
- Traduce marketTitle completamente al español.
- No mezcles inglés y español salvo nombres propios, países, equipos, ligas, tickers o siglas.
- Convierte fechas tipo "by May 31, 2026" a "antes del 31 de mayo de 2026".
- Conserva el sentido predictivo de Polymarket.
- Usa español natural, no traducción literal.
- Si marketTitle esta vacio, dejalo vacio.
- answer traducelo solo si aplica: Yes/No/Over/Under/Buy/Sell.

Formato exacto:
{
  "translations": [
    {
      "key": "...",
      "marketTitleEs": "...",
      "answerEs": "..."
    }
  ]
}

Datos:
${JSON.stringify(chunk)}`;

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
            { role: "system", content: "Devuelve unicamente JSON valido. Nada de markdown." },
            { role: "user", content: prompt },
          ],
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(`OpenAI error ${response.status}`);
      }

      const content = data?.choices?.[0]?.message?.content;
      if (!content) throw new Error("Respuesta vacia del traductor");

      const parsed = JSON.parse(
        content.replace(/^```json\s*/i, "").replace(/```$/i, "")
      ) as { translations?: AITranslation[] };

      for (const row of parsed.translations ?? []) {
        const key = cleanText(row.key);
        if (!key) continue;

        const fallback = fallbacks.get(key) ?? { whaleNameEs: "", marketTitleEs: "", answerEs: "" };

        map.set(key, {
          whaleNameEs: cleanText(row.whaleNameEs) || fallback.whaleNameEs,
          marketTitleEs: cleanText(row.marketTitleEs) || fallback.marketTitleEs,
          answerEs: cleanText(row.answerEs) || fallback.answerEs,
        });
      }

      // If any translation looks untranslated, treat this attempt as failed so we can retry
      const untranslatedItems: string[] = [];
      for (const item of chunk) {
        const translated = map.get(item.key);
        const aiLooksUntranslated = looksUntranslatedMarketTitle(item.marketTitle ?? "", translated?.marketTitleEs ?? "");
        if (aiLooksUntranslated) {
          untranslatedItems.push(item.key);
          console.warn(`[SERVER] Item ${item.key} looks untranslated: "${translated?.marketTitleEs?.substring(0, 60)}"`);
        }
      }

      // If ALL items in chunk look untranslated, retry the whole chunk
      if (untranslatedItems.length === chunk.length) {
        console.warn(`[SERVER] ALL ${chunk.length} items look untranslated, will retry`);
        throw new Error("AI returned possibly untranslated content for entire chunk");
      }

      // If some items look untranslated, keep the good ones and warn
      if (untranslatedItems.length > 0) {
        console.warn(`[SERVER] ${untranslatedItems.length}/${chunk.length} items look untranslated, keeping good ones`);
      }

      return map;
    } finally {
      clearTimeout(timeout);
    }
  }

  const chunks = chunkArray(items, concurrency);

  const promises = chunks.map(async (chunk) => {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await translateChunk(chunk, attempt);
      } catch (err) {
        const last = attempt === retries;
        console.warn(`translateWithAI chunk attempt ${attempt} error:`, err);
        if (last) {
          // give up on this chunk and return empty map so fallbacks are used
          return new Map<string, CachedTranslation>();
        }
        await wait(baseBackoff * Math.pow(2, attempt));
      }
    }

    return new Map<string, CachedTranslation>();
  });

  const results = await Promise.all(promises);
  for (const m of results) {
    for (const [k, v] of m.entries()) result.set(k, v);
  }

  return result;
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
    const sourceByKey = new Map<string, TranslateItem>();
    const uniqueForAI: AIItem[] = [];
    const seenKeys = new Set<string>();

    let cacheHits = 0;

    for (const item of items) {
      const key = makeKey(item);
      const fallback = fallbackTranslation(item);
      const cachedTranslation = cache.get(key);
      const hasGoodCached =
        Boolean(cachedTranslation) &&
        !looksUntranslatedMarketTitle(item.marketTitle ?? "", cachedTranslation?.marketTitleEs ?? "");

      sourceByKey.set(key, item);

      fallbacks.set(key, fallback);

      if (hasGoodCached) {
        cacheHits++;
        continue;
      }

      if (seenKeys.has(key)) continue;
      seenKeys.add(key);

      uniqueForAI.push({
        key,
        marketTitle: item.marketTitle ?? "",
        answer: item.answer ?? "",
      });
    }

    let aiTranslations = new Map<string, CachedTranslation>();
    let aiWarning: string | undefined;

    try {
      aiTranslations = await translateWithAI(uniqueForAI, fallbacks);
      console.log(`[SERVER] AI returned ${aiTranslations.size} translations for ${uniqueForAI.length} items`);
      for (const [key, trans] of aiTranslations.entries()) {
        console.log(`[SERVER] AI key=${key} marketTitleEs="${trans.marketTitleEs?.substring(0, 60)}"`);
      }
    } catch (error) {
      console.error("translate-alerts AI fallback:", error);
      aiWarning = "AI no respondio a tiempo; se uso traduccion local.";
    }

    for (const [key] of fallbacks) {
      if (cache.has(key)) continue;

      const aiTranslated = aiTranslations.get(key);
      const source = sourceByKey.get(key);
      const aiLooksUntranslated = looksUntranslatedMarketTitle(
        source?.marketTitle ?? "",
        aiTranslated?.marketTitleEs ?? "",
      );

      // Solo cachear traducciones reales de IA.
      // No cachear fallback local porque puede quedar medio ingles.
      if (aiTranslated && !aiLooksUntranslated) {
        setCache(key, aiTranslated);
      }
    }

    const translations = items.map((item) => {
      const key = makeKey(item);
      const cachedTranslation = cache.get(key);
      const aiTranslation = aiTranslations.get(key);

      const cachedUsable =
        Boolean(cachedTranslation) &&
        !looksUntranslatedMarketTitle(item.marketTitle ?? "", cachedTranslation?.marketTitleEs ?? "");
      const aiUsable =
        Boolean(aiTranslation) &&
        !looksUntranslatedMarketTitle(item.marketTitle ?? "", aiTranslation?.marketTitleEs ?? "");

      const translated =
        (cachedUsable ? cachedTranslation : undefined) ??
        (aiUsable ? aiTranslation : undefined) ??
        fallbackTranslation(item);

      if (aiTranslation && !aiUsable) {
        console.log(`[SERVER] Rejected AI translation for ${item.id}: AI="${aiTranslation.marketTitleEs?.substring(0, 50)}" looks untranslated`);
      }

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
