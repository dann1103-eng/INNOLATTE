import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formatea un número como moneda USD (El Salvador), 2 decimales. */
export function formatCurrency(value: number | null | undefined): string {
  const n = typeof value === "number" && isFinite(value) ? value : 0;
  return new Intl.NumberFormat("es-SV", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

/** Redondea a 2 decimales evitando errores de punto flotante. */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Formatea una fecha ISO a dd/mm/aaaa. */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("es-SV", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}
