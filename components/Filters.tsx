const filters = ["BUY", "SELL", "YES", "NO"] as const;

type FilterValue = (typeof filters)[number];

type FiltersProps = {
  activeFilter?: FilterValue | "ALL";
};

const filterStyles: Record<FilterValue, string> = {
  BUY: "text-[#22C55E] border-[var(--color-border)] hover:border-[#22C55E]/40 hover:bg-[#22C55E]/8",
  SELL: "text-[#EF4444] border-[var(--color-border)] hover:border-[#EF4444]/40 hover:bg-[#EF4444]/8",
  YES: "text-[#3B82F6] border-[var(--color-border)] hover:border-[#3B82F6]/40 hover:bg-[#3B82F6]/8",
  NO: "text-[#F59E0B] border-[var(--color-border)] hover:border-[#F59E0B]/40 hover:bg-[#F59E0B]/8",
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
              isActive ? "border-[#1D4ED8]/45 bg-[#1D4ED8]/12" : "bg-transparent",
            ].join(" ")}
          >
            {filter}
          </button>
        );
      })}
    </div>
  );
}
