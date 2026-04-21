"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthContext";
import DashboardLayout from "@/components/Layout";
import { FeedChannel, WhalePerformance } from "@/components/Layout";
import { buildDashboardData, fetchAlerts, fetchStats } from "@/lib/alerts";

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

        setChannels(data.channels);
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
