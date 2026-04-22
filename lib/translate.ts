const cache = new Map<string, string>();

export async function translate(text: string): Promise<string> {
  if (!text) return "";

  if (cache.has(text)) return cache.get(text)!;

  try {
    const res = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (!res.ok) return text;

    const data = await res.json();
    const translated = data?.text ?? text;

    cache.set(text, translated);

    return translated;
  } catch (err) {
    return text;
  }
}
