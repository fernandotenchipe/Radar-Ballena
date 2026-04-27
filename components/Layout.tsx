"use client";

import AlertCard, { AlertItem } from "@/components/AlertCard";
import Sidebar, { SidebarChannel } from "@/components/Sidebar";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/components/AuthContext";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export type FeedChannel = {
  id: string;
  name: string;
  alerts: AlertItem[];
  isSubscribedByDefault?: boolean;
};

export type WhalePerformance = {
  id: string;
  whaleName: string;
  wins: number;
  losses: number;
  winRate: number;
};

const WHALE_NAME_ES: Record<string, string> = {
  "Global Sports Arb Lambda": "Arbitraje Deportivo Global Lambda",
  "NBA Volume Trader Theta": "Operador de Volumen NBA Theta",
  "Everything Trader Zeta": "Trader Todoterreno Zeta",
  "Everything Trader Delta": "Trader Todoterreno Delta",
  "Geopolitical Macro Omega": "Macro Geopolitico Omega",
  "Soccer Esports Titan Alpha": "Titan del Futbol Esports Alpha",
};

function translateWhaleName(name: string) {
  return WHALE_NAME_ES[name] ?? name;
}

type DashboardLayoutProps = {
  channels: FeedChannel[];
  whalePerformance: WhalePerformance[];
};

export default function DashboardLayout({ channels, whalePerformance }: DashboardLayoutProps) {
  const [activeView, setActiveView] = useState<"panel" | "channel">("panel");
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [subscribedIds, setSubscribedIds] = useState<Set<string>>(
    () =>
      new Set(
        channels.filter((channel) => channel.isSubscribedByDefault).map((channel) => channel.id),
      ),
  );
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const selectedChannel =
    channels.find((channel) => channel.id === selectedChannelId) ?? null;

  const isSubscribed = selectedChannel ? subscribedIds.has(selectedChannel.id) : false;
  const liveAlerts = selectedChannel
    ? selectedChannel.alerts.filter((alert) => !alert.isHistory)
    : [];
  const historyAlerts = selectedChannel
    ? selectedChannel.alerts.filter((alert) => alert.isHistory)
    : [];

  const sidebarChannels: SidebarChannel[] = useMemo(
    () =>
      channels.map((channel) => ({
        id: channel.id,
        name: channel.name,
        alertCount: channel.alerts.filter((alert) => !alert.isHistory).length,
        isSubscribed: subscribedIds.has(channel.id),
      })),
    [channels, subscribedIds],
  );

  const unlockedSidebarChannels = sidebarChannels.filter((channel) => channel.isSubscribed);

  const channelPreview = channels.map((channel, index) => {
    const performance = whalePerformance[index];
    const wins = performance?.wins ?? 0;
    const losses = performance?.losses ?? 0;
    const total = wins + losses;
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

    return {
      id: channel.id,
      name: channel.name,
      winRate,
      isSubscribed: subscribedIds.has(channel.id),
    };
  });

  const subscribeToSelectedChannel = () => {
    if (!selectedChannel) {
      return;
    }

    setSubscribedIds((prev) => new Set(prev).add(selectedChannel.id));
  };

  const openChannel = (channelId: string) => {
    setSelectedChannelId(channelId);
    setActiveView("channel");
  };

  const openPanel = () => {
    setActiveView("panel");
    setSelectedChannelId(null);
  };

  const unlockChannel = (channelId: string) => {
    setSubscribedIds((prev) => new Set(prev).add(channelId));
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-main)] text-[var(--color-text-primary)]">
      <div className="mx-auto flex w-[calc(100%-1rem)] max-w-[1700px] overflow-hidden border border-[var(--color-border)] bg-[var(--color-bg-main)] md:my-3 md:min-h-[calc(100vh-1.5rem)] md:rounded-2xl">
        <div className="hidden xl:block">
          <Sidebar
            channels={unlockedSidebarChannels}
            selectedChannelId={selectedChannelId}
            onSelectChannel={openChannel}
          />
        </div>

        <main className="min-w-0 flex-1 p-4 sm:p-5 lg:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] pb-2.5 text-[1.05rem] font-medium text-[var(--color-text-secondary)]">
            <div className="flex items-center gap-5">
              <button
                type="button"
                onClick={openPanel}
                className={[
                  "pb-1 transition-colors hover:text-[var(--color-text-primary)]",
                  activeView === "panel"
                    ? "border-b border-[var(--color-text-primary)] text-[var(--color-text-primary)]"
                    : "text-[var(--color-text-secondary)]",
                ].join(" ")}
              >
                Panel principal
              </button>
              <button
                type="button"
                onClick={() => setActiveView("channel")}
                className={[
                  "pb-1 transition-colors hover:text-[var(--color-text-primary)]",
                  activeView === "channel"
                    ? "border-b border-[var(--color-text-primary)] text-[var(--color-text-primary)]"
                    : "text-[var(--color-text-secondary)]",
                ].join(" ")}
              >
                Canal
              </button>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--color-text-secondary)]">
                  {user?.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="rounded-lg border border-[#ef4444]/30 bg-[#ef4444]/10 px-3 py-1 text-xs font-semibold text-[#ef4444] transition-colors hover:bg-[#ef4444]/15"
                >
                  Salir
                </button>
              </div>
              <ThemeToggle />
            </div>
          </div>

          {activeView === "panel" ? (
            <>
              <header className="mb-3.5">
                <p className="text-xs text-[var(--color-text-secondary)]">Dashboard independiente</p>
                <h1 className="text-2xl font-semibold leading-none text-[var(--color-text-primary)]">
                  Panel principal de whales
                </h1>
              </header>

              <section className="mb-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                    Preview de canales (bloqueados)
                  </h2>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    Solo vista previa en dashboard
                  </p>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {channelPreview.map((channel) => (
                    <article
                      key={channel.id}
                      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-main)] p-3 transition-all hover:border-[var(--color-accent)]/40"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                          {translateWhaleName(channel.name)}
                        </h3>
                        <span className="rounded-full bg-[#f59e0b]/15 px-2 py-0.5 text-xs font-semibold text-[#f59e0b]">
                          {channel.isSubscribed ? "Desbloqueado" : "Bloqueado"}
                        </span>
                      </div>

                      <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
                        {channel.isSubscribed
                          ? "Canal disponible en sidebar"
                          : "🔒 Contenido oculto hasta suscripción"}
                      </p>
                      <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                        Win rate: <span className="font-semibold text-[var(--color-text-primary)]">{channel.winRate}%</span>
                      </p>

                      {!channel.isSubscribed ? (
                        <button
                          type="button"
                          onClick={() => unlockChannel(channel.id)}
                          className="mt-3 rounded-full border border-[#3b82f6]/40 bg-[#3b82f6]/10 px-3 py-1.5 text-xs font-semibold text-[#3b82f6] transition-colors hover:bg-[#3b82f6]/15 hover:border-[#3b82f6]/60"
                        >
                          Desbloquear canal
                        </button>
                      ) : null}
                    </article>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                    Win vs Loss por ballena
                  </h2>
                </div>

                <div className="mt-4 space-y-3">
                  {whalePerformance.map((whale) => {
                    const total = whale.wins + whale.losses;
                    const winRate = total > 0 ? Math.round((whale.wins / total) * 100) : 0;
                    const lossRate = total > 0 ? 100 - winRate : 0;

                    return (
                      <article
                        key={whale.id}
                        className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-main)] p-3 transition-all hover:border-[var(--color-accent)]/40"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                            {whale.whaleName}
                          </p>
                          <p className="text-xs text-[var(--color-text-secondary)]">
                            Win {winRate}% / Loss {lossRate}%
                          </p>
                        </div>

                        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[var(--color-border)]/70">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#10b981] to-[#06b6d4]"
                            style={{ width: `${winRate}%` }}
                          />
                        </div>

                        <div className="mt-2 flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
                          <span>
                            Wins: <span className="font-semibold text-[#10b981]">{whale.wins}</span>
                          </span>
                          <span>
                            Losses: <span className="font-semibold text-[#ef4444]">{whale.losses}</span>
                          </span>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            </>
          ) : (
            <>
              <header className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    {selectedChannel?.name ?? "Canal"} - {liveAlerts.length} alerts
                  </p>
                  <h1 className="text-2xl font-semibold leading-none text-[var(--color-text-primary)]">
                    Feed del canal
                  </h1>
                </div>
              </header>

              {!selectedChannel ? (
                <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-6">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">
                    Sin Canal Seleccionado
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-[var(--color-text-primary)]">
                    Selecciona un canal desde el sidebar
                  </h2>
                  <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                    El dashboard principal está separado. Para ver un feed específico, entra a un canal.
                  </p>
                </section>
              ) : !isSubscribed ? (
                <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-6">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">
                    Canal Bloqueado
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-[var(--color-text-primary)]">
                    Suscríbete para acceder a {selectedChannel?.name}
                  </h2>
                  <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                    Este canal retransmite mensajes del bot de Telegram. Hasta suscribirte, el contenido
                    dummy se mantiene oculto.
                  </p>
                  <button
                    type="button"
                    onClick={subscribeToSelectedChannel}
                    className="mt-5 rounded-full border border-[#3b82f6]/40 bg-[#3b82f6]/10 px-4 py-2 text-sm font-semibold text-[#3b82f6] transition-colors hover:bg-[#3b82f6]/15 hover:border-[#3b82f6]/60"
                  >
                    Suscribirme Al Canal
                  </button>
                </section>
              ) : (
                <>
                  <section className="space-y-2.5">
                    {liveAlerts.map((alert) => (
                      <AlertCard key={alert.id} alert={alert} />
                    ))}
                  </section>

                  {historyAlerts.length > 0 ? (
                    <section className="mt-4">
                      <div className="mb-2.5 flex items-center gap-3 text-sm text-[var(--color-text-secondary)]">
                        <span className="h-px flex-1 bg-[var(--color-border)]" />
                        <span>historial</span>
                        <span className="h-px flex-1 bg-[var(--color-border)]" />
                      </div>
                      <div className="space-y-2.5">
                        {historyAlerts.map((alert) => (
                          <AlertCard key={alert.id} alert={alert} />
                        ))}
                      </div>
                    </section>
                  ) : null}
                </>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
