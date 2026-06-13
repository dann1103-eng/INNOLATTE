import { cn } from "@/lib/utils";

export interface BarItem {
  label: string;
  value: number;
  valueLabel: string;
  sub?: string;
}

/** Lista de barras horizontales proporcionales al valor máximo. */
export function BarList({
  items,
  emptyLabel = "Sin datos en este período.",
  tone = "brand",
}: {
  items: BarItem[];
  emptyLabel?: string;
  tone?: "brand" | "blue" | "green" | "amber";
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  const bg = {
    brand: "bg-brand-500/80",
    blue: "bg-blue-500/80",
    green: "bg-green-500/80",
    amber: "bg-amber-500/80",
  }[tone];

  if (items.length === 0) {
    return <p className="text-sm text-muted py-6 text-center">{emptyLabel}</p>;
  }

  return (
    <ul className="space-y-3">
      {items.map((it, i) => (
        <li key={i}>
          <div className="flex items-baseline justify-between gap-2 mb-1">
            <span className="text-sm font-medium truncate">{it.label}</span>
            <span className="text-sm tabular-nums shrink-0">
              {it.valueLabel}
              {it.sub && <span className="text-muted ml-1.5 text-xs">{it.sub}</span>}
            </span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className={cn("h-full rounded-full", bg)}
              style={{ width: `${Math.max(2, (it.value / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
