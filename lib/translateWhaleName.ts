const WHALE_NAME_ES: Record<string, string> = {
  "Soccer Esports Titan Alpha": "T\u00edt\u00e1n del F\u00fatbol Esports Alpha",
  "NBA Volume Trader Theta": "Operador de Volumen NBA",
  "Global Sports Arb Lambda": "Arbitraje Deportivo Global",
  "Everything Trader Zeta": "Trader Todoterreno",
  "Everything Trader Delta": "Trader Todoterreno",
  "Geopolitical Macro Omega": "Macro Geopol\u00edtico",
};

export function translateWhaleName(name: string) {
  return WHALE_NAME_ES[name] ?? name;
}
