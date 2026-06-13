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

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Calcula el rango de fechas (inclusive) para un período del dashboard.
 * Devuelve `desde`=null cuando el período es "todo".
 */
export function rangoPeriodo(periodo: string | undefined): {
  desde: string | null;
  hasta: string;
  label: string;
} {
  const hoy = new Date();
  const hoyStr = isoDate(hoy);
  const restar = (dias: number) => {
    const d = new Date(hoy);
    d.setDate(d.getDate() - dias);
    return isoDate(d);
  };

  switch (periodo) {
    case "ayer": {
      const ayer = restar(1);
      return { desde: ayer, hasta: ayer, label: "ayer" };
    }
    case "7d":
      return { desde: restar(6), hasta: hoyStr, label: "últimos 7 días" };
    case "mes": {
      const primero = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      return { desde: isoDate(primero), hasta: hoyStr, label: "este mes" };
    }
    case "30d":
      return { desde: restar(29), hasta: hoyStr, label: "últimos 30 días" };
    case "anio": {
      const primero = new Date(hoy.getFullYear(), 0, 1);
      return { desde: isoDate(primero), hasta: hoyStr, label: "este año" };
    }
    case "todo":
      return { desde: null, hasta: hoyStr, label: "todo el histórico" };
    case "hoy":
    default:
      return { desde: hoyStr, hasta: hoyStr, label: "hoy" };
  }
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
