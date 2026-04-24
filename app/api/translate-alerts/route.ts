import { NextRequest, NextResponse } from "next/server";

type TranslateItem = {
  id: string;
  whaleName: string;
  marketTitle: string;
  answer: string;
};

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const items = body?.items as TranslateItem[] | undefined;

  if (!Array.isArray(items)) {
    return NextResponse.json(
      { ok: false, error: "items inválido" },
      { status: 400 }
    );
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { ok: false, error: "OPENAI_API_KEY no configurada" },
      { status: 500 }
    );
  }

const prompt = `
Eres un editor financiero/deportivo bilingüe para un dashboard llamado RadarBallena.

Tu tarea es adaptar alertas de mercados de predicción al español.

Reglas estrictas:
- Devuelve SOLO JSON válido.
- No cambies los ids.
- No inventes datos.
- No agregues explicación.
- Traduce marketTitle de forma clara, natural y útil para un usuario hispanohablante.
- Traduce answer solo si tiene sentido. Conserva nombres de equipos, personas, países, ligas, tickers y siglas.
- Para whaleName NO hagas traducción literal.
- Para whaleName crea un alias editorial en español: corto, potente, natural y con personalidad.
- El alias debe sonar como nombre de perfil/ballena, no como traducción escolar.
- Mantén Alpha, Beta, Theta, Omega si forman parte del estilo del nombre.
- Si el nombre tiene contexto deportivo, dale tono deportivo.
- Si tiene contexto macro/geopolítico, dale tono financiero/geopolítico.
- Si tiene contexto de volumen/trading, dale tono de trader profesional.
- Evita frases torpes como “Comerciante de Volumen”. Prefiere “Operador”, “Estratega”, “Titán”, “Radar”, “Cazador”, “Especialista”, “Arquitecto”, “Depredador”, “Maestro”, “Oráculo”, según encaje.
- No traduzcas nombres propios de equipos o personas.

Ejemplos de adaptación creativa:
"NBA Volume Trader Theta" -> "Theta, Operador de Volumen NBA"
"Geopolitical Macro Omega" -> "Omega Macro Geopolítico"
"Sports Grinder" -> "El Grinder Deportivo"
"Soccer Esports Titan Alpha" -> "Alpha, Titán del Fútbol Esports"
"Everything Trader" -> "Trader Todoterreno"
"Global Sports" -> "Radar Deportivo Global"
"Sports Focused" -> "Especialista Deportivo"
"NBA Dualist" -> "Dualista NBA"
"Sports Arb" -> "Arbitrajista Deportivo"
"Coldmath" -> "Matemática Fría"
"HolyMoses7" -> "HolyMoses7"

Ejemplos de marketTitle:
"Knicks vs. Hawks: O/U 214.5" -> "Knicks vs. Hawks: Más/Menos de 214.5"
"Spread: Nuggets (-2.5)" -> "Hándicap: Nuggets (-2.5)"
"Will Bitcoin hit $100k in May?" -> "¿Bitcoin alcanzará los $100k en mayo?"
"Milwaukee Brewers vs. Detroit Tigers" -> "Milwaukee Brewers vs. Detroit Tigers"

Formato exacto:
{
  "translations": [
    {
      "id": "...",
      "whaleNameEs": "...",
      "marketTitleEs": "...",
      "answerEs": "..."
    }
  ]
}

Datos:
${JSON.stringify(items)}
`;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      input: prompt,
      temperature: 0.2,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    return NextResponse.json(
      { ok: false, error: "Error traduciendo", details: data },
      { status: 500 }
    );
  }

  const text = data.output_text;

  try {
    const parsed = JSON.parse(text);

    return NextResponse.json({
      ok: true,
      translations: parsed.translations ?? [],
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Respuesta inválida del traductor", raw: text },
      { status: 500 }
    );
  }
}
