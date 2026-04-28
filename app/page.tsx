"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthContext";
import DashboardLayout from "@/components/Layout";
import { FeedChannel, WhalePerformance } from "@/components/Layout";
import { AlertItem } from "@/components/AlertCard";
import { translateAlerts } from "@/lib/translate";
import { translateAnswer } from "@/lib/format";
import { translateWhaleName } from "@/lib/translateWhaleName";
import { WHALE_CHANNEL_CONFIGS, CHANNEL_TO_WHALE_ID } from "@/lib/whales";
import {
  ApiAlert,
  ApiChannel,
  ApiError,
  ApiStat,
  fetchAlerts,
  fetchChannels,
  fetchStats,
  unlockChannel,
} from "@/lib/dashboard";

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function normalizeChannelKey(value: unknown): string {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

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
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);

  return formatted.replace("K", "k");
}

function formatPriceCents(value: number): string {
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value)}\u00A2`;
}

function formatShares(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatTimestamp(createdAt: string): string {
  const date = new Date(createdAt);

  if (Number.isNaN(date.getTime())) {
    return createdAt;
  }

  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function resolveChannelKey(alert: ApiAlert): string {
  const directKey = cleanText(
    alert.channelId ??
      alert.channel_id ??
      alert.channelSlug ??
      alert.channel_slug ??
      alert.slug ??
      alert.whaleId ??
      alert.whale_id,
  );

  if (directKey) {
    return directKey;
  }

  return normalizeChannelKey(alert.whaleName ?? alert.whale_name ?? "");
}

function buildAlertItem(alert: ApiAlert, displayName: string, channelKey: string, index: number): AlertItem {
  const idBase = cleanText(alert.id ?? alert.createdAt ?? `${index}`) || `${index}`;

  return {
    id: `${channelKey}-${idBase}-${index}`,
    category: displayName,
    trader: displayName,
    question: cleanText(alert.marketTitle),
    action: normalizeAction(alert.action),
    outcome: cleanText(alert.answer) || "UNKNOWN",
    size: formatSizeUsd(toNumber(alert.sizeUsd)),
    price: formatPriceCents(toNumber(alert.priceCents)),
    shares: formatShares(toNumber(alert.shares)),
    timestamp: formatTimestamp(alert.createdAt),
    isHistory: Boolean(alert.isHistory),
  };
}

function buildWhalePerformance(stats: ApiStat[]): WhalePerformance[] {
  const configMap = new Map(WHALE_CHANNEL_CONFIGS.map((c) => [c.id, c]));
  const statsByWhaleId = new Map<string, WhalePerformance>();

  for (const stat of stats) {
    let id = stat.whaleId;
    const rawName = stat.whaleName ?? "";

    if (!id && rawName) {
      id = CHANNEL_TO_WHALE_ID[rawName] ?? CHANNEL_TO_WHALE_ID[rawName.trim()];
    }

    if (!id && rawName) {
      id = rawName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
    }

    if (!id) {
      continue;
    }

    const displayFromConfig = configMap.get(id)?.displayName;
    const displayName = displayFromConfig ?? translateWhaleName(rawName) ?? rawName;
    const current = statsByWhaleId.get(id);
    const nextWins = (current?.wins ?? 0) + (stat.wins ?? 0);
    const nextLosses = (current?.losses ?? 0) + (stat.losses ?? 0);
    const total = nextWins + nextLosses;
    const nextWinRate = total > 0 ? Math.round((nextWins / total) * 100) : 0;

    statsByWhaleId.set(id, {
      id,
      whaleName: displayName,
      wins: nextWins,
      losses: nextLosses,
      winRate: nextWinRate,
    });
  }

  return Array.from(statsByWhaleId.values());
}

async function buildChannelsWithAlerts(
  apiChannels: ApiChannel[],
  apiAlerts: ApiAlert[],
): Promise<FeedChannel[]> {
  const channelLookup = new Map<string, ApiChannel>();

  for (const channel of apiChannels) {
    channelLookup.set(channel.id, channel);
    channelLookup.set(channel.slug, channel);
    channelLookup.set(normalizeChannelKey(channel.name), channel);
  }

  const groupedAlerts = new Map<string, AlertItem[]>();
  const normalizedAlerts: Array<{ channelKey: string; item: AlertItem }> = [];

  apiAlerts.forEach((alert, index) => {
    const channelKey = resolveChannelKey(alert);
    const channel =
      channelLookup.get(channelKey) ??
      channelLookup.get(normalizeChannelKey(channelKey)) ??
      channelLookup.get(normalizeChannelKey(alert.whaleName ?? alert.whale_name ?? ""));

    const channelLabel = translateWhaleName(
      channel?.name ?? alert.whaleName ?? alert.whale_name ?? "Unknown Whale",
    );

    const item = buildAlertItem(alert, channelLabel, channel?.id ?? channel?.slug ?? channelKey, index);
    const groupedKey = channel?.id ?? channel?.slug ?? channelKey;

    normalizedAlerts.push({ channelKey: groupedKey, item });
  });

  const visibleAlerts = normalizedAlerts
    .filter(({ item }) => !item.isHistory)
    .slice(0, 8)
    .map(({ item }) => ({
      id: item.id,
      marketTitle: item.question,
      answer: item.outcome,
    }));

  let translations: Awaited<ReturnType<typeof translateAlerts>> = [];

  try {
    translations = await translateAlerts(visibleAlerts);
  } catch (error) {
    console.error("Translation failed:", error);
    translations = [];
  }

  const translationsById = new Map(
    translations
      .filter((item) => typeof item.id === "string" && item.id.length > 0)
      .map((item) => [item.id, item]),
  );

  for (const { channelKey, item } of normalizedAlerts) {
    const current = groupedAlerts.get(channelKey);
    const translated = translationsById.get(item.id);

    const translatedItem: AlertItem = {
      ...item,
      trader: item.trader,
      category: item.category,
      question: translated?.marketTitleEs || item.question,
      outcome: translated?.answerEs || translateAnswer(item.outcome),
    };

    if (current) {
      current.push(translatedItem);
      continue;
    }

    groupedAlerts.set(channelKey, [translatedItem]);
  }

  return apiChannels.map((channel) => {
    const channelAlerts =
      groupedAlerts.get(channel.id) ??
      groupedAlerts.get(channel.slug) ??
      groupedAlerts.get(normalizeChannelKey(channel.name)) ??
      [];

    const displayName = translateWhaleName(channel.name) || channel.name;

    return {
      id: channel.id,
      name: displayName,
      slug: channel.slug,
      unlocked: channel.unlocked,
      alerts: channelAlerts.map((alert) => ({
        ...alert,
        trader: displayName,
        category: displayName,
      })),
    };
  });
}

export default function Home() {
  const { isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const [channels, setChannels] = useState<FeedChannel[]>([]);
  const [whalePerformance, setWhalePerformance] = useState<WhalePerformance[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);

  const loadDashboard = useCallback(
    async (silent = false) => {
      if (!silent) {
        setIsLoading(true);
        setErrorMessage(null);
      }

      try {
        const [apiChannels, apiAlerts, stats] = await Promise.all([
          fetchChannels(),
          fetchAlerts(),
          fetchStats(),
        ]);

        const mergedChannels = await buildChannelsWithAlerts(apiChannels, apiAlerts);
        const whalePerformance = buildWhalePerformance(stats);

        setChannels(mergedChannels);
        setWhalePerformance(whalePerformance);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          logout();
          router.replace("/login");
          return;
        }

        const message = error instanceof Error ? error.message : "No se pudieron cargar los datos del dashboard.";

        setChannels([]);
        setWhalePerformance([]);
        setErrorMessage(message);
      } finally {
        if (!silent) {
          setIsLoading(false);
        }
      }
    },
    [logout, router],
  );

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    void loadDashboard();
  }, [isAuthenticated, loadDashboard, retryCount, router]);

  const handleUnlockChannel = useCallback(
    async (channelId: string) => {
      try {
        await unlockChannel(channelId);

        setChannels((prev) =>
          prev.map((channel) =>
            channel.id === channelId
              ? { ...channel, unlocked: true }
              : channel,
          ),
        );

        void loadDashboard(true);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          logout();
          router.replace("/login");
          return;
        }

        const message = error instanceof Error ? error.message : "No se pudo desbloquear el canal.";
        setErrorMessage(message);
      }
    },
    [loadDashboard, logout, router],
  );

  if (!isAuthenticated) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-main)] p-4 text-[var(--color-text-primary)] sm:p-6">
        <section className="mx-auto max-w-[1700px] rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">
            Cargando
          </p>
          <h2 className="mt-2 text-xl font-semibold text-[var(--color-text-primary)]">
            Obteniendo alerts en tiempo real...
          </h2>
        </section>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-main)] p-4 text-[var(--color-text-primary)] sm:p-6">
        <section className="mx-auto max-w-[1700px] rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">
            Error
          </p>
          <h2 className="mt-2 text-xl font-semibold text-[var(--color-text-primary)]">
            No se pudieron cargar las alerts
          </h2>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{errorMessage}</p>
          <button
            type="button"
            onClick={() => setRetryCount((count) => count + 1)}
            className="mt-4 rounded-full border border-[#3b82f6]/40 bg-[#3b82f6]/10 px-4 py-2 text-sm font-semibold text-[#3b82f6] transition-colors hover:border-[#3b82f6]/60 hover:bg-[#3b82f6]/15"
          >
            Reintentar
          </button>
        </section>
      </div>
    );
  }

  return (
    <DashboardLayout
      channels={channels}
      whalePerformance={whalePerformance}
      onUnlockChannel={handleUnlockChannel}
    />
  );
}
