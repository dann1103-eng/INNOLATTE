import { round6 } from "@/lib/utils";
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

/** Lista canónica desde la que se cotizan los productos de MEZCLAS. */
export const LISTA_MEZCLAS = 4;

export function resolverPrecio(
  producto: Pick<ProductoConPrecios, "precios"> & { categoria?: string | null },
  lista: number,
): PrecioResuelto {
  let valor = producto.precios?.[lista];

  // Regla MEZCLAS: su precio canónico vive en P4 (P1–P3 vienen vacías). Si la
  // lista pedida no tiene precio y el producto es una mezcla, se usa P4.
  if (
    (valor === undefined || valor === null) &&
    producto.categoria === "MEZCLAS"
  ) {
    valor = producto.precios?.[LISTA_MEZCLAS];
  }

  if (valor === undefined || valor === null || !isFinite(valor)) {
    return { precio: null, sinPrecio: true, lista };
  }
  return { precio: round6(valor), sinPrecio: false, lista };
}

/** Calcula el subtotal de una línea (precio * cantidad), redondeado a 6 decimales. */
export function calcularSubtotal(precioUnitario: number, cantidad: number): number {
  return round6(precioUnitario * (cantidad || 0));
}

/** Suma una lista de subtotales con redondeo seguro (6 decimales). */
export function calcularTotal(subtotales: number[]): number {
  return round6(subtotales.reduce((acc, s) => acc + (s || 0), 0));
}

/** Tasa de IVA aplicada en El Salvador. */
export const IVA = 0.13;

/** IVA de un subtotal (sin impuesto). */
export function calcularIva(subtotal: number): number {
  return round6(subtotal * IVA);
}

/** Total con IVA a partir del subtotal (sin impuesto). */
export function calcularTotalConIva(subtotal: number): number {
  return round6(subtotal + calcularIva(subtotal));
}
