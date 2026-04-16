type AlertAction = "BUY" | "SELL";
type AlertOutcome = "YES" | "NO";

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
  BUY: "text-[#22C55E]",
  SELL: "text-[#EF4444]",
};

const outcomeStyles: Record<AlertOutcome, string> = {
  YES: "text-[#3B82F6]",
  NO: "text-[#F59E0B]",
};

export default function AlertCard({ alert }: AlertCardProps) {
  return (
    <article className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">
          Whale Alert
        </p>
        <p className="text-xs text-[var(--color-text-secondary)] sm:text-sm">{alert.timestamp}</p>
      </div>

      <p className="mt-2 text-sm text-[var(--color-text-secondary)]">👤 {alert.trader}</p>

      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
        📈 <span className={`font-semibold ${actionStyles[alert.action]}`}>{alert.action}</span>{" "}
        <span className={`font-semibold ${outcomeStyles[alert.outcome]}`}>
          {alert.outcome === "YES" ? "Yes" : "No"}
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
