"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

/** Dos selectores de fecha (desde/hasta) que actualizan la URL. */
export function DateRangeFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function set(param: "desde" | "hasta", value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(param, value);
    else params.delete(param);
    router.replace(`${pathname}?${params.toString()}`);
  }

  const inputCls =
    "h-10 rounded-lg border border-line bg-white px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500";

  return (
    <div className="flex items-center gap-2">
      <input
        type="date"
        aria-label="Desde"
        value={searchParams.get("desde") ?? ""}
        onChange={(e) => set("desde", e.target.value)}
        className={inputCls}
      />
      <span className="text-muted text-sm">a</span>
      <input
        type="date"
        aria-label="Hasta"
        value={searchParams.get("hasta") ?? ""}
        onChange={(e) => set("hasta", e.target.value)}
        className={inputCls}
      />
    </div>
  );
}
