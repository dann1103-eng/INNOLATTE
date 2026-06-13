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

/** Zona horaria de El Salvador (UTC-6, sin horario de verano). */
export const ZONA = "America/El_Salvador";

/** Fecha de "hoy" (yyyy-mm-dd) en hora de El Salvador, sin desfase por UTC. */
export function hoyISO(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(new Date());
}

/** Resta días a una fecha ISO (yyyy-mm-dd) de forma segura (sin tz). */
function restarDiasISO(iso: string, dias: number): string {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() - dias);
  return d.toISOString().slice(0, 10);
}

/**
 * Calcula el rango de fechas (inclusive) para un período del dashboard,
 * basado en la fecha local de El Salvador. `desde`=null cuando es "todo".
 */
export function rangoPeriodo(periodo: string | undefined): {
  desde: string | null;
  hasta: string;
  label: string;
} {
  const hoyStr = hoyISO();
  const [anio, mes] = hoyStr.split("-");

  switch (periodo) {
    case "ayer": {
      const ayer = restarDiasISO(hoyStr, 1);
      return { desde: ayer, hasta: ayer, label: "ayer" };
    }
    case "7d":
      return { desde: restarDiasISO(hoyStr, 6), hasta: hoyStr, label: "últimos 7 días" };
    case "mes":
      return { desde: `${anio}-${mes}-01`, hasta: hoyStr, label: "este mes" };
    case "30d":
      return { desde: restarDiasISO(hoyStr, 29), hasta: hoyStr, label: "últimos 30 días" };
    case "anio":
      return { desde: `${anio}-01-01`, hasta: hoyStr, label: "este año" };
    case "todo":
      return { desde: null, hasta: hoyStr, label: "todo el histórico" };
    case "hoy":
    default:
      return { desde: hoyStr, hasta: hoyStr, label: "hoy" };
  }
}

/** Formatea una fecha a dd/mm/aaaa. Las fechas "solo día" (yyyy-mm-dd) se
 *  muestran tal cual, sin conversión de zona horaria (evita el desfase de 1 día). */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-");
    return `${d}/${m}/${y}`;
  }
  const d = typeof value === "string" ? new Date(value) : value;
  if (isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("es-SV", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: ZONA,
  }).format(d);
}
