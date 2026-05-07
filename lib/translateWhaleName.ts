const WHALE_NAME_ES: Record<string, string> = {
  "Soccer Esports Titan": "Titán del Fútbol Esports",
  "NBA Volume Trader Theta": "Operador de Volumen NBA",
  "Global Sports Arb Lambda": "Arbitraje Deportivo Global",
  "Everything Trader Zeta": "Trader Todoterreno",
  "Everything Trader Delta": "Trader Todoterreno",
  "Geopolitical Macro Whale": "Macro Geopolítico",
  "Macro Economics Whale": "Macro Economía",
};

export function translateWhaleName(name: string) {
  return WHALE_NAME_ES[name] ?? name;
}
