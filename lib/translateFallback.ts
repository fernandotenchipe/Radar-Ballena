export type LocalAlertTranslationInput = {
  id: string;
  whaleName?: string;
  marketTitle?: string;
  answer?: string;
};

export type LocalAlertTranslation = {
  id: string;
  whaleNameEs?: string;
  marketTitleEs?: string;
  answerEs?: string;
};

const exactWhales: Record<string, string> = {
  "global sports arb": "Arbitraje Deportivo Global",
  "nba volume trader": "Operador de Volumen NBA",
  "everything trader": "Trader Todoterreno",
  "geopolitical macro": "Macro Geopolitico",
  "soccer esports titan": "Titán del Fútbol Esports",
  "sports grinder": "Grinder Deportivo",
};

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

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function translateMonths(text: string): string {
  return text.replace(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/gi,
    (match) => months[match.toLowerCase()] ?? match,
  );
}

function translateDeadlineDate(text: string): string {
  return text.replace(
    /\bby\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(,\s*\d{4})?\??$/i,
    (_match, month, day, year = "") => {
      const monthEs = months[String(month).toLowerCase()] ?? month;
      return `antes del ${day} de ${monthEs}${year}?`;
    },
  );
}

export function fallbackWhaleName(name = ""): string {
  const normalized = cleanText(name);
  if (!normalized) return "";

  const exact = exactWhales[normalized.toLowerCase()];
  if (exact) return exact;

  let output = normalized;

  output = output.replace(/\bGlobal Sports Arb\b/gi, "Arbitraje Deportivo Global");
  output = output.replace(/\bNBA Volume Trader\b/gi, "Operador de Volumen NBA");
  output = output.replace(/\bEverything Trader\b/gi, "Trader Todoterreno");
  output = output.replace(/\bGeopolitical Macro\b/gi, "Macro Geopolitico");
  output = output.replace(/\bSoccer Esports Titan\b/gi, "Titán del Fútbol Esports");
  output = output.replace(/\bSports Esports Titan\b/gi, "Titan Deportivo Esports");
  output = output.replace(/\bSports Grinder\b/gi, "El Grinder Deportivo");
  output = output.replace(/\bSports Arb\b/gi, "Arbitraje Deportivo");
  output = output.replace(/\bGlobal Sports\b/gi, "Radar Deportivo Global");

  return output;
}

export function fallbackAnswer(answer = ""): string {
  const normalized = cleanText(answer);
  if (!normalized) return "";

  const map: Record<string, string> = {
    yes: "Sí",
    no: "No",
    over: "Más",
    under: "Menos",
    buy: "Compra",
    sell: "Venta",
  };

  return map[normalized.toLowerCase()] ?? normalized;
}

export function fallbackMarketTitle(title = ""): string {
  let text = cleanText(title);
  if (!text) return "";

  text = translateDeadlineDate(text);
  text = translateMonths(text);

  text = text.replace(/\bUS-Iran\b/gi, "EE. UU.-Irán");
  text = text.replace(/\bUS x Iran\b/gi, "EE. UU. x Irán");
  text = text.replace(/\bIran\b/gi, "Irán");
  text = text.replace(/\bUkraine\b/gi, "Ucrania");
  text = text.replace(/\bRussia\b/gi, "Rusia");
  text = text.replace(/\bIsrael\b/gi, "Israel");
  text = text.replace(/\bChina\b/gi, "China");
  text = text.replace(/\bTaiwan\b/gi, "Taiwán");

  text = text.replace(/\bnuclear deal\b/gi, "acuerdo nuclear");
  text = text.replace(/\bpermanent peace deal\b/gi, "acuerdo de paz permanente");
  text = text.replace(/\bagrees to surrender\b/gi, "acepta entregar");
  text = text.replace(/\benriched uranium stockpile\b/gi, "reservas de uranio enriquecido");
  text = text.replace(/\bcloses its airspace\b/gi, "cierra su espacio aéreo");
  text = text.replace(/\bdiplomatic meeting\b/gi, "reunión diplomática");

  text = text.replace(
    /^EE\.\s*UU\.-Irán acuerdo nuclear antes del (.+)\?$/i,
    "¿Acuerdo nuclear entre EE. UU. e Irán antes del $1?",
  );

  text = text.replace(
    /^Irán acepta entregar reservas de uranio enriquecido antes del (.+)\?$/i,
    "¿Irán acepta entregar sus reservas de uranio enriquecido antes del $1?",
  );

  text = text.replace(
    /^EE\.\s*UU\. x Irán acuerdo de paz permanente antes del (.+)\?$/i,
    "¿Acuerdo de paz permanente entre EE. UU. e Irán antes del $1?",
  );

  text = text.replace(
    /^Irán cierra su espacio aéreo antes del (.+)\?$/i,
    "¿Irán cierra su espacio aéreo antes del $1?",
  );

  text = text.replace(
    /^Will the next (.+?) occur after (.+)\?$/i,
    "¿La próxima $1 ocurre después de $2?",
  );

  text = text.replace(
    /^Will the next (.+?) occur before (.+)\?$/i,
    "¿La próxima $1 ocurre antes de $2?",
  );

  const ou = text.match(/^(.+?)\s*:\s*O\/U\s*([0-9.]+)$/i);
  if (ou) return `${ou[1]}: Mas/Menos de ${ou[2]}`;

  const spread = text.match(/^Spread:\s*(.+)$/i);
  if (spread) return `Diferencial: ${spread[1]}`;

  const moneyline = text.match(/^Moneyline:\s*(.+)$/i);
  if (moneyline) return `Ganador directo: ${moneyline[1]}`;

  text = text.replace(/\bO\/U\b/gi, "Mas/Menos");
  text = text.replace(/\bOver\/Under\b/gi, "Mas/Menos");
  text = text.replace(/\bSpread\b/gi, "Diferencial");
  text = text.replace(/\bMarket cap\b/gi, "capitalizacion de mercado");
  text = text.replace(/\bPresidential Election\b/gi, "elecciones presidenciales");
  text = text.replace(/\(LOW\)/gi, "(minimo)");
  text = text.replace(/\(HIGH\)/gi, "(maximo)");

  text = text.replace(
    /^Will\s+(.+?)\s+hit\s+(.+?)\s+in\s+(.+?)\?$/i,
    "¿$1 alcanzara $2 en $3?",
  );

  text = text.replace(
    /^Will\s+(.+?)\s+win\s+(.+?)\?$/i,
    "¿$1 ganara $2?",
  );

  text = text.replace(/^Will\s+(.+?)\?$/i, "¿$1?");

  return text;
}

export function buildLocalAlertTranslation(item: LocalAlertTranslationInput): LocalAlertTranslation {
  return {
    id: item.id,
    whaleNameEs: fallbackWhaleName(item.whaleName),
    marketTitleEs: fallbackMarketTitle(item.marketTitle),
    answerEs: fallbackAnswer(item.answer),
  };
}
