import { round2 } from "@/lib/utils";
import type { ProductoConPrecios } from "@/lib/types";

/**
 * Motor de precios — lógica central de INNOLATTE.
 *
 * Regla confirmada con el negocio: el número de "lista de precios" del cliente
 * ES la columna de precio (P1..P20) que se le cobra. Cliente con lista 4 -> P4.
 *
 * NO hay fallback automático: si la lista del cliente no tiene precio para ese
 * producto, se devuelve { sinPrecio: true } y la UI debe bloquear esa línea.
 */
export interface PrecioResuelto {
  precio: number | null;
  sinPrecio: boolean;
  lista: number;
}

export function resolverPrecio(
  producto: Pick<ProductoConPrecios, "precios">,
  lista: number,
): PrecioResuelto {
  const valor = producto.precios?.[lista];
  if (valor === undefined || valor === null || !isFinite(valor)) {
    return { precio: null, sinPrecio: true, lista };
  }
  return { precio: round2(valor), sinPrecio: false, lista };
}

/** Calcula el subtotal de una línea (precio * cantidad), redondeado a 2 decimales. */
export function calcularSubtotal(precioUnitario: number, cantidad: number): number {
  return round2(precioUnitario * (cantidad || 0));
}

/** Suma una lista de subtotales con redondeo seguro. */
export function calcularTotal(subtotales: number[]): number {
  return round2(subtotales.reduce((acc, s) => acc + (s || 0), 0));
}
