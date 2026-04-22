import { AlertItem } from "@/components/AlertCard";
import { FeedChannel, WhalePerformance } from "@/components/Layout";

export type ApiAlert = {
  whaleName: string;
  action: "BUY" | "SELL";
  answer?: string;
  marketTitle: string;
  sizeUsd: number;
  priceCents: number;
  shares: number;
  createdAt: string;
};

const usdCompactFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});

const sharesFormatter = new Intl.NumberFormat("en-US");

const timestampFormatter = new Intl.DateTimeFormat("es-ES", {
  dateStyle: "short",
  timeStyle: "short",
});

function toNumber(value: number | string): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const numericValue = Number(String(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function normalizeAction(action: string): "BUY" | "SELL" {
  return action === "SELL" ? "SELL" : "BUY";
}

function formatSizeUsd(value: number): string {
  return usdCompactFormatter.format(value).replace("K", "k");
}

function formatPriceCents(value: number): string {
  return `${numberFormatter.format(value)}\u00A2`;
}

function formatShares(value: number): string {
  return sharesFormatter.format(value);
}

function formatTimestamp(createdAt: string): string {
  const date = new Date(createdAt);

  if (Number.isNaN(date.getTime())) {
    return createdAt;
  }

  return timestampFormatter.format(date);
}

function createChannelId(value?: string): string {
  if (!value) return "whale";

  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized.length > 0 ? normalized : "whale";
}

export async function fetchAlerts(): Promise<ApiAlert[]> {
  if (!process.env.NEXT_PUBLIC_API_URL) {
    throw new Error("NEXT_PUBLIC_API_URL no esta configurada.");
  }

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/alerts`);

  if (!res.ok) {
    throw new Error(`No se pudieron obtener alerts (${res.status}).`);
  }

  const json = await res.json();

  if (!json.ok || !Array.isArray(json.data)) {
    throw new Error("Respuesta invalida del backend");
  }

  return json.data as ApiAlert[];
}

export function buildDashboardData(apiAlerts: ApiAlert[]): {
  channels: FeedChannel[];
  whalePerformance: WhalePerformance[];
} {
  const sortedAlerts = [...apiAlerts].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const groupedAlerts = new Map<string, AlertItem[]>();

  sortedAlerts.forEach((apiAlert, index) => {
    const trader = apiAlert.whaleName ?? "Unknown Whale";
    const question = apiAlert.marketTitle;

    const normalizedAlert: AlertItem = {
      id: `${trader}-${apiAlert.createdAt}-${index}`,
      category: trader,
      trader,
      question,
      action: normalizeAction(apiAlert.action),
      outcome: apiAlert.answer ?? "UNKNOWN",
      size: formatSizeUsd(toNumber(apiAlert.sizeUsd)),
      price: formatPriceCents(toNumber(apiAlert.priceCents)),
      shares: formatShares(toNumber(apiAlert.shares)),
      timestamp: formatTimestamp(apiAlert.createdAt),
    };

    const current = groupedAlerts.get(trader);

    if (current) {
      current.push(normalizedAlert);
      return;
    }

    groupedAlerts.set(trader, [normalizedAlert]);
  });

  const channels: FeedChannel[] = Array.from(groupedAlerts.entries()).map(
    ([name, alerts], index) => ({
      id: `${createChannelId(name)}-${index}`,
      name,
      alerts,
      isSubscribedByDefault: index === 0,
    }),
  );

  const whalePerformance: WhalePerformance[] = [];

  return { channels, whalePerformance };
}

export async function fetchStats() {
  if (!process.env.NEXT_PUBLIC_API_URL) {
    throw new Error("NEXT_PUBLIC_API_URL no configurada");
  }

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/stats`);

  if (!res.ok) {
    throw new Error("Error obteniendo stats");
  }

  const data = await res.json();
  return data.data;
}
