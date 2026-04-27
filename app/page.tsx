"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthContext";
import DashboardLayout from "@/components/Layout";
import { FeedChannel, WhalePerformance } from "@/components/Layout";
import { buildDashboardData, fetchAlerts, fetchStats } from "@/lib/alerts";
import { translateAlerts } from "@/lib/translate";
import { WHALE_NAMES_ES } from "@/lib/whales";
import { translateAnswer } from "@/lib/format";

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
        const flatAlerts = data.channels.flatMap((channel) => channel.alerts);
        const channelItems = data.channels.map((channel) => ({
          id: channel.id,
          whaleName: channel.name,
          marketTitle: channel.alerts[0]?.question ?? "",
          answer: channel.alerts[0]?.outcome ?? "",
        }));
        let translations: Awaited<ReturnType<typeof translateAlerts>> = [];

        try {
          translations = await translateAlerts(
            [
              ...channelItems,
              ...flatAlerts.slice(0, 30).map((alert) => ({
                id: alert.id,
                whaleName: alert.trader,
                marketTitle: alert.question,
                answer: alert.outcome,
              })),
            ],
          );
        } catch (error) {
          console.error("Translation failed:", error);
          translations = [];
        }

        const translationsById = new Map(
          translations
            .filter((item) => typeof item.id === "string" && item.id.length > 0)
            .map((item) => [item.id, item]),
        );

        // Translate channel alerts' questions and map whale display names + answers
        const translatedChannels: FeedChannel[] = data.channels.map((channel) => {
          const channelTranslation = translationsById.get(channel.id);
          const channelNameCandidates = [
            channel.name,
            channel.name?.toLowerCase().replace(/\s+/g, "_"),
            channel.name?.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
          ];
          const channelFoundKey = channelNameCandidates.find(
            (c) => c && WHALE_NAMES_ES[c as string],
          );
          const channelFallbackName = channelFoundKey
            ? WHALE_NAMES_ES[channelFoundKey as string]
            : channel.name;

          const alerts = channel.alerts.map((alert) => {
            const translated = translationsById.get(alert.id);

            // Try a few candidate keys to find a spanish display name in WHALE_NAMES_ES
            const candidates = [
              alert.trader,
              alert.trader?.toLowerCase().replace(/\s+/g, "_"),
              alert.trader?.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
            ];

            const foundKey = candidates.find((c) => c && WHALE_NAMES_ES[c as string]);
            const whaleName = foundKey ? WHALE_NAMES_ES[foundKey as string] : alert.trader;

            const outcome = translated?.answerEs || translateAnswer(alert.outcome);

            return {
              ...alert,
              trader:
                translated?.whaleNameEs ||
                channelTranslation?.whaleNameEs ||
                whaleName ||
                alert.trader,
              outcome,
              question: translated?.marketTitleEs || alert.question,
            };
          });

          return {
            ...channel,
            name: channelTranslation?.whaleNameEs || channelFallbackName || channel.name,
            alerts,
          };
        });

        const whalePerformance = stats.map((w: {
          whaleId: string;
          whaleName: string;
          wins: number;
          losses: number;
          winRate: number;
        }) => ({
          id: w.whaleId,
          whaleName: w.whaleName,
          wins: w.wins,
          losses: w.losses,
          winRate: w.winRate,
        }));

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
