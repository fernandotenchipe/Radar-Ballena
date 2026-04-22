type AlertAction = "BUY" | "SELL";
type KnownAlertOutcome = "Yes" | "No" | "UNKNOWN";
type AlertOutcome = string;

export type AlertItem = {
  id: string;
  category: string;
  trader: string;
  question: string;
  action: AlertAction;
  outcome: AlertOutcome;
  size: string;
  price: string;
  shares: string;
  timestamp: string;
  isHistory?: boolean;
};

type AlertCardProps = {
  alert: AlertItem;
};

const actionStyles: Record<AlertAction, string> = {
  BUY: "text-[#10b981] font-semibold",
  SELL: "text-[#ef4444] font-semibold",
};

const outcomeStyles: Record<KnownAlertOutcome, string> = {
  Yes: "text-[#06b6d4] font-semibold",
  No: "text-[#f59e0b] font-semibold",
  UNKNOWN: "text-[var(--color-text-secondary)] font-semibold",
};

const actionBgStyles: Record<AlertAction, string> = {
  BUY: "bg-[#10b981]/10 border-l-2 border-[#10b981]",
  SELL: "bg-[#ef4444]/10 border-l-2 border-[#ef4444]",
};

export default function AlertCard({ alert }: AlertCardProps) {
  const outcomeStyle =
    outcomeStyles[alert.outcome as KnownAlertOutcome] ?? outcomeStyles.UNKNOWN;
  const outcomeLabel =
    alert.outcome && alert.outcome !== "UNKNOWN" ? alert.outcome : "Unknown";

  return (
    <article className={`rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-4 shadow-sm transition-all hover:shadow-lg hover:border-[var(--color-accent)]/40 sm:p-5 ${actionBgStyles[alert.action]}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-accent)]">
          Whale Alert
        </p>
        <p className="text-xs text-[var(--color-text-secondary)] sm:text-sm">{alert.timestamp}</p>
      </div>

      <p className="mt-2 text-sm text-[var(--color-text-secondary)]">👤 {alert.trader}</p>

      <p className="mt-1 text-sm">
        📈 <span className={actionStyles[alert.action]}>{alert.action}</span>{" "}
        <span className={outcomeStyle}>
          {outcomeLabel}
        </span>
      </p>

      <h3 className="mt-3 text-xl font-semibold leading-snug text-[var(--color-text-primary)] sm:text-[1.6rem]">
        📊 &quot;{alert.question}&quot;
      </h3>

      <div className="mt-4 border-t border-[var(--color-border)]/60 pt-3 text-sm text-[var(--color-text-secondary)]">
        <p>
          💰 Size: <span className="font-semibold tabular-nums text-[var(--color-text-primary)]">{alert.size}</span>
        </p>
        <p className="mt-1">
          💲 Price: <span className="font-semibold tabular-nums text-[var(--color-text-primary)]">{alert.price}</span>{" "}
          <span className="text-[var(--color-text-secondary)]">({alert.shares} shares)</span>
        </p>
      </div>

      <div className="mt-2 flex items-center justify-between gap-3 text-xs text-[var(--color-text-secondary)]">
        <span>{alert.category}</span>
        <span>
          {alert.isHistory ? (
            <span className="rounded-full border border-[var(--color-border)] px-2 py-0.5 text-xs text-[var(--color-text-secondary)]">
              historial
            </span>
          ) : null}
        </span>
      </div>
    </article>
  );
}
