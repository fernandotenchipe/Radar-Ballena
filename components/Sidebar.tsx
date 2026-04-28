"use client";

import Image from "next/image";

export type SidebarChannel = {
  id: string;
  name: string;
  alertCount: number;
  unlocked: boolean;
};

import { translateWhaleName } from "@/lib/translateWhaleName";

type SidebarProps = {
  channels: SidebarChannel[];
  selectedChannelId: string | null;
  onSelectChannel: (channelId: string) => void;
};

export default function Sidebar({ channels, selectedChannelId, onSelectChannel }: SidebarProps) {
  return (
    <aside className="flex h-full w-full max-w-[250px] flex-col border-r border-[var(--color-border)] bg-[var(--color-bg-sidebar)]">
      <div className="border-b border-[var(--color-border)] px-5 py-4">
        <div className="login-logo-wrapper w-fit">
          <Image
            src="/radarballena-logo.png"
            alt="RadarBallena"
            width={190}
            height={44}
            priority
            className="login-logo-image h-auto w-auto max-w-full"
          />
        </div>
        <span className="mt-3 inline-flex rounded-full bg-[#10b981]/15 px-3 py-1 text-xs font-semibold text-[#10b981]">
          En vivo
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <section className="mb-5">
          <h2 className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">
            Canales ({channels.length})
          </h2>

          {channels.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[var(--color-border)]/70 px-3 py-3 text-xs text-[var(--color-text-secondary)]">
              No hay canales desbloqueados aun.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {channels.map((channel) => {
                const isActive = selectedChannelId === channel.id;

                return (
                  <li key={channel.id}>
                    <button
                      type="button"
                      onClick={() => onSelectChannel(channel.id)}
                      className={[
                        "group flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left transition-colors",
                        isActive
                          ? "border-[#06b6d4]/40 bg-[#06b6d4]/8 shadow-[inset_2px_0_0_0_#06b6d4]"
                          : "border-[var(--color-border)]/50 hover:border-[var(--color-accent)]/50 hover:bg-[var(--color-bg-main)]",
                        "cursor-pointer",
                      ].join(" ")}
                    >
                      <h3 className="text-[1.02rem] font-medium text-[var(--color-text-primary)]">
                        {translateWhaleName(channel.name)}
                      </h3>
                      <span className="text-xs tabular-nums text-[var(--color-text-secondary)]">
                        {channel.alertCount}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </aside>
  );
}
