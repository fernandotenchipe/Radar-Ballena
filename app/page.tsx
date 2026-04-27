"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthContext";
import DashboardLayout from "@/components/Layout";
import { FeedChannel, WhalePerformance } from "@/components/Layout";
import { buildDashboardData, fetchAlerts, fetchStats } from "@/lib/alerts";
import { translateAlerts } from "@/lib/translate";
import { translateAnswer } from "@/lib/format";
import { translateWhaleName } from "@/lib/translateWhaleName";
import { WHALE_CHANNEL_CONFIGS, CHANNEL_TO_WHALE_ID } from "@/lib/whales";

export default function Home() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [channels, setChannels] = useState<FeedChannel[]>([]);
  const [whalePerformance, setWhalePerformance] = useState<WhalePerformance[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    let isMounted = true;

    const loadAlerts = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const [apiAlerts, stats] = await Promise.all([
          fetchAlerts(),
          fetchStats(),
        ]);

        const data = buildDashboardData(apiAlerts);

        const BASE_CHANNELS = [
          { id: "sports_arb", name: "Global Sports Arb Lambda" },
          { id: "nba_volume", name: "NBA Volume Trader Theta" },
          { id: "global_trader", name: "Everything Trader Zeta" },
          { id: "global_trader_delta", name: "Everything Trader Delta" },
          { id: "sports_esports_titan", name: "Soccer Esports Titan Alpha" },
        ];

        const channelsById = new Map(data.channels.map((channel) => [channel.id, channel]));

        const mergedChannels = BASE_CHANNELS.map((base) => {
          const existing = channelsById.get(base.id);

          return {
            ...(existing ?? {}),
            id: base.id,
            name: base.name,
            alerts: existing?.alerts ?? [],
          };
        });
        const flatAlerts = data.channels.flatMap((channel) => channel.alerts);
        const visibleAlerts = flatAlerts.filter((alert) => !alert.isHistory);
        const itemsToTranslate = visibleAlerts.slice(0, 8).map((alert) => ({
          id: alert.id,
          marketTitle: alert.question,
          answer: alert.outcome,
        }));
        let translations: Awaited<ReturnType<typeof translateAlerts>> = [];

        try {
          translations = await translateAlerts(itemsToTranslate);
        } catch (error) {
          console.error("Translation failed:", error);
          translations = [];
        }

        const translationsById = new Map(
          translations
            .filter((item) => typeof item.id === "string" && item.id.length > 0)
            .map((item) => [item.id, item]),
        );

        const whaleNameMap = new Map(
          mergedChannels.map((channel) => [channel.name, translateWhaleName(channel.name)]),
        );

        // Translate channel alerts' questions and map whale display names + answers
        const translatedChannels: FeedChannel[] = mergedChannels.map((channel) => {
          const alerts = channel.alerts.map((alert) => {
            const translated = translationsById.get(alert.id);
            const localWhaleName =
              whaleNameMap.get(alert.trader) ?? translateWhaleName(alert.trader);

            const outcome = translated?.answerEs || translateAnswer(alert.outcome);

            return {
              ...alert,
              trader: localWhaleName || alert.trader,
              outcome,
              question: translated?.marketTitleEs || alert.question,
            };
          });

          return {
            ...channel,
            name: whaleNameMap.get(channel.name) ?? channel.name,
            alerts,
          };
        });

        // Ensure all configured whales appear in the performance list,
        // even if `stats` doesn't include them (zero values).
        const configMap = new Map(
          WHALE_CHANNEL_CONFIGS.map((c) => [c.id, c]),
        );

        const perfMap = new Map<string, {
          id: string;
          whaleName: string;
          wins: number;
          losses: number;
          winRate: number;
        }>();

        // Seed with configured whales (zeroed)
        for (const cfg of WHALE_CHANNEL_CONFIGS) {
          perfMap.set(cfg.id, {
            id: cfg.id,
            whaleName: cfg.displayName ?? translateWhaleName(cfg.name),
            wins: 0,
            losses: 0,
            winRate: 0,
          });
        }

        // Overlay server stats (replace seeded values if present)
        for (const w of stats as Array<{
          whaleId?: string;
          whaleName?: string;
          wins?: number;
          losses?: number;
          winRate?: number;
        }>) {
          // Resolve an authoritative id for the stat row:
          // prefer explicit whaleId; fall back to CHANNEL_TO_WHALE_ID mapping by whaleName;
          // otherwise, derive a slug-like id from the whaleName.
          let id = w.whaleId;
          const rawName = w.whaleName ?? "";

          if (!id && rawName) {
            id = CHANNEL_TO_WHALE_ID[rawName] ?? CHANNEL_TO_WHALE_ID[rawName.trim()];
          }

          if (!id && rawName) {
            id = rawName
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "_")
              .replace(/^_+|_+$/g, "");
          }

          if (!id) continue;

          const displayFromConfig = configMap.get(id)?.displayName;
          const displayName = displayFromConfig ?? translateWhaleName(rawName) ?? rawName;

          perfMap.set(id, {
            id,
            whaleName: displayName,
            wins: w.wins ?? 0,
            losses: w.losses ?? 0,
            winRate: w.winRate ?? 0,
          });
        }

        // Order whale performance to match mergedChannels so the UI can align by index.
        const whalePerformance = mergedChannels.map((c) =>
          perfMap.get(c.id) ?? {
            id: c.id,
            whaleName: translateWhaleName(c.name),
            wins: 0,
            losses: 0,
            winRate: 0,
          },
        );

        if (!isMounted) {
          return;
        }

        setChannels(translatedChannels);
        setWhalePerformance(whalePerformance);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : "No se pudieron cargar las alerts.";

        setChannels([]);
        setWhalePerformance([]);
        setErrorMessage(message);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadAlerts();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, retryCount, router]);

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

  return <DashboardLayout channels={channels} whalePerformance={whalePerformance} />;
}
