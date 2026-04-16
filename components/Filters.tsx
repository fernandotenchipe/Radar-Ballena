const filters = ["BUY", "SELL", "YES", "NO"] as const;

type FilterValue = (typeof filters)[number];

type FiltersProps = {
  activeFilter?: FilterValue | "ALL";
};

const filterStyles: Record<FilterValue, string> = {
  BUY: "text-[#10b981] border-[var(--color-border)] hover:border-[#10b981]/40 hover:bg-[#10b981]/8",
  SELL: "text-[#ef4444] border-[var(--color-border)] hover:border-[#ef4444]/40 hover:bg-[#ef4444]/8",
  YES: "text-[#06b6d4] border-[var(--color-border)] hover:border-[#06b6d4]/40 hover:bg-[#06b6d4]/8",
  NO: "text-[#f59e0b] border-[var(--color-border)] hover:border-[#f59e0b]/40 hover:bg-[#f59e0b]/8",
};

export default function Filters({ activeFilter = "ALL" }: FiltersProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {filters.map((filter) => {
        const isActive = activeFilter === filter;

        return (
          <button
            key={filter}
            type="button"
            className={[
              "rounded-full border px-3.5 py-1 text-lg font-semibold leading-none transition-colors",
              filterStyles[filter],
              isActive ? "border-[#06b6d4]/45 bg-[#06b6d4]/12" : "bg-transparent",
            ].join(" ")}
          >
            {filter}
          </button>
        );
      })}
    </div>
  );
}
