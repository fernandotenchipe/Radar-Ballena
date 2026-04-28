import { AlertItem } from "@/components/AlertCard";
import { FeedChannel, WhalePerformance } from "@/components/Layout";
import { CHANNEL_TO_WHALE_ID } from "@/lib/whales";

export type ApiAlert = {
  whaleId?: string;
  whale_id?: string;
  whale_name?: string;
  whaleName: string;
  action: "BUY" | "SELL";
  answer?: string;
  marketTitle: string;
  sizeUsd: number;
  priceCents: number;
  shares: number;
  createdAt: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const WHALE_IDS = [
  "sports_arb",
  "nba_volume",
  "global_trader",
  "sports_esports_titan",
];

function getAuthHeaders(): Record<string, string> {
  const token =
    typeof window !== "undefined"
      ? window.localStorage.getItem("rb-token")
      : null;

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

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

function resolveWhaleId(alert: ApiAlert): string {
  const directId = (alert.whaleId ?? alert.whale_id ?? "").trim();
  if (directId.length > 0) {
    return directId;
  }

  const name = (alert.whaleName ?? "").trim();
  if (name.length > 0) {
    const mapped = CHANNEL_TO_WHALE_ID[name] ?? CHANNEL_TO_WHALE_ID[name.trim()];
    if (mapped) {
      return mapped;
    }
  }

  return createChannelId(name).replace(/-/g, "_");
}

export async function fetchAlerts(): Promise<ApiAlert[]> {
  if (!API_URL) {
    throw new Error("NEXT_PUBLIC_API_URL no está configurada");
  }

  const responses = await Promise.all(
    WHALE_IDS.map(async (whaleId) => {
      const params = new URLSearchParams({
        whale: whaleId,
        limit: "100",
      });

      const res = await fetch(`${API_URL}/api/alerts?${params.toString()}`, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        throw new Error(`No se pudieron obtener alerts para ${whaleId} (${res.status})`);
      }

      const json = (await res.json()) as { data?: ApiAlert[] };
      return json.data ?? [];
    }),
  );

  return responses.flat();
}

export function buildDashboardData(apiAlerts: ApiAlert[]): {
  channels: FeedChannel[];
  whalePerformance: WhalePerformance[];
} {
  const sortedAlerts = [...apiAlerts].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const groupedAlerts = new Map<string, { name: string; alerts: AlertItem[] }>();

  sortedAlerts.forEach((apiAlert, index) => {
    const whaleId = resolveWhaleId(apiAlert);
    const trader = apiAlert.whaleName ?? "Unknown Whale";
    const question = apiAlert.marketTitle;

    const normalizedAlert: AlertItem = {
      id: `${whaleId}-${apiAlert.createdAt}-${index}`,
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

    const current = groupedAlerts.get(whaleId);

    if (current) {
      current.alerts.push(normalizedAlert);
      return;
    }

    groupedAlerts.set(whaleId, { name: trader, alerts: [normalizedAlert] });
  });

  const channels: FeedChannel[] = Array.from(groupedAlerts.entries()).map(
    ([whaleId, entry]) => ({
      id: whaleId,
      name: entry.name,
      slug: whaleId,
      unlocked: false,
      alerts: entry.alerts,
    }),
  );

  const whalePerformance: WhalePerformance[] = [];

  return { channels, whalePerformance };
}

export async function fetchStats() {
  if (!API_URL) {
    throw new Error("NEXT_PUBLIC_API_URL no está configurada");
  }

  const res = await fetch(`${API_URL}/api/stats`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error(`No se pudieron obtener stats (${res.status})`);
  }

  const json = await res.json();
  return json.data ?? [];
}
