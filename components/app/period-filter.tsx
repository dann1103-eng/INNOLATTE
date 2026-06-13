"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Calendar } from "lucide-react";
import { Select } from "@/components/ui/select";

export const PERIODOS = [
  { value: "hoy", label: "Hoy" },
  { value: "ayer", label: "Ayer" },
  { value: "7d", label: "Últimos 7 días" },
  { value: "mes", label: "Este mes" },
  { value: "30d", label: "Últimos 30 días" },
  { value: "anio", label: "Este año" },
  { value: "todo", label: "Todo" },
] as const;

export function PeriodFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get("periodo") ?? "hoy";

  function onChange(value: string) {
    const params = new URLSearchParams(searchParams);
    if (value === "hoy") params.delete("periodo");
    else params.set("periodo", value);
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="relative">
      <Calendar className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted z-10" />
      <Select
        aria-label="Período"
        value={current}
        onChange={(e) => onChange(e.target.value)}
        className="w-48 pl-9"
      >
        {PERIODOS.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </Select>
    </div>
  );
}
