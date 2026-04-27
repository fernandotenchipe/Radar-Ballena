import { NextRequest, NextResponse } from "next/server";

type TranslateItem = {
  id: string;
  whaleName: string;
  marketTitle: string;
  answer: string;
};

function cleanItems(items: TranslateItem[]) {
  return items
    .filter((item) => item.id && item.whaleName && item.marketTitle)
    .slice(0, 30);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const rawItems = body?.items as TranslateItem[] | undefined;

    if (!Array.isArray(rawItems)) {
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

    const items = cleanItems(rawItems);

    if (items.length === 0) {
      return NextResponse.json({
        ok: true,
        translations: [],
      });
    }

    const prompt = `Eres un editor financiero/deportivo bilingüe para un dashboard llamado RadarBallena.
Adapta estas alertas al español.
Reglas:
- Devuelve SOLO JSON válido.
- No cambies los ids.
- No inventes datos.
- No agregues explicación.
- Traduce marketTitle de forma clara, natural y útil.
- Traduce answer solo si aplica.
- Conserva nombres de equipos, personas, ligas, tickers y siglas.
- Para whaleName NO traduzcas literal.
- Para whaleName crea un alias editorial en español: corto, potente, natural y con personalidad.
- El alias debe sonar como perfil de ballena/trader, no como traducción escolar.
- Mantén Alpha, Beta, Theta, Omega si forman parte del estilo.
- Si es deportivo, dale tono deportivo.
- Si es macro/geopolítico, dale tono financiero/geopolítico.
- Si es volumen/trading, dale tono de trader profesional.
Ejemplos:
"NBA Volume Trader Theta" -> " Operador de Volumen NBA"
"Geopolitical Macro Omega" -> "Macro Geopolítico"
"Sports Grinder" -> "El Grinder Deportivo"
"Soccer Esports Titan Alpha" -> " Titán del Fútbol Esports"
"Everything Trader" -> "Trader Todoterreno"
"Global Sports" -> "Radar Deportivo Global"
"Sports Arb" -> "Arbitraje Deportivo"
Ejemplos de marketTitle:
"Knicks vs. Hawks: O/U 214.5" -> "Knicks vs. Hawks: Más/Menos de 214.5"
"Will Bitcoin hit $100k in May?" -> "¿Bitcoin alcanzará los $100k en mayo?"
Devuelve exactamente:
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
${JSON.stringify(items)}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Eres un traductor editorial. Siempre devuelves JSON válido.",
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
      console.error("OpenAI translate error:", data);
      return NextResponse.json(
        { ok: false, error: "Error traduciendo", details: data },
        { status: 500 }
      );
    }

    const text = data?.choices?.[0]?.message?.content;

    if (!text) {
      return NextResponse.json(
        { ok: false, error: "Respuesta vacía del traductor", raw: data },
        { status: 500 }
      );
    }

    const parsed = JSON.parse(text);

    return NextResponse.json({
      ok: true,
      translations: parsed.translations ?? [],
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
