import { createClient } from "@/lib/supabase/server";
import type { Producto, ProductoConPrecios } from "@/lib/types";

interface FiltrosProductos {
  q?: string;
  categoria?: string;
  presentacion?: string;
}

/** Lista de productos con filtros opcionales (búsqueda por código/descripción). */
export async function getProductos(filtros: FiltrosProductos = {}): Promise<Producto[]> {
  const supabase = await createClient();
  let query = supabase.from("productos").select("*").order("descripcion");

  if (filtros.categoria) query = query.eq("categoria", filtros.categoria);
  if (filtros.presentacion) query = query.eq("presentacion", filtros.presentacion);
  if (filtros.q) {
    const term = `%${filtros.q}%`;
    query = query.or(`descripcion.ilike.${term},codigo.ilike.${term},sabor.ilike.${term}`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as Producto[];
}

/** Un producto con sus precios resueltos como mapa { lista: precio }. */
export async function getProductoConPrecios(
  id: string,
): Promise<ProductoConPrecios | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("productos")
    .select("*, producto_precios(lista, precio)")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return mapearPrecios(data);
}

/** Todos los productos activos con precios — para la pantalla de pedidos. */
export async function getProductosConPrecios(): Promise<ProductoConPrecios[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("productos")
    .select("*, producto_precios(lista, precio)")
    .eq("activo", true)
    .order("descripcion");

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapearPrecios);
}

/** Valores distintos para poblar los filtros (categoría, presentación). */
export async function getFacetasCatalogo() {
  const supabase = await createClient();
  const { data } = await supabase.from("productos").select("categoria, presentacion");
  const categorias = new Set<string>();
  const presentaciones = new Set<string>();
  for (const r of data ?? []) {
    if (r.categoria) categorias.add(r.categoria);
    if (r.presentacion) presentaciones.add(r.presentacion);
  }
  return {
    categorias: [...categorias].sort(),
    presentaciones: [...presentaciones].sort(),
  };
}

export interface ComponenteCatalogo {
  nombre: string;
  codigo: string;
}

/**
 * Construye los catálogos de componentes (categoría, familia, sabor,
 * presentación) con su código corto, derivándolos del propio código de los
 * productos existentes (ancho fijo 3+3+3+2). Sirve para el alta de productos.
 */
export async function getCatalogosComponentes(): Promise<{
  categorias: ComponenteCatalogo[];
  familias: ComponenteCatalogo[];
  sabores: ComponenteCatalogo[];
  presentaciones: ComponenteCatalogo[];
}> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("productos")
    .select("codigo, categoria, familia, sabor, presentacion");

  const cat = new Map<string, string>();
  const fam = new Map<string, string>();
  const sab = new Map<string, string>();
  const pres = new Map<string, string>();

  for (const p of data ?? []) {
    const cod = (p.codigo ?? "").trim();
    if (cod.length < 11) continue;
    if (p.categoria && !cat.has(p.categoria)) cat.set(p.categoria, cod.slice(0, 3));
    if (p.familia && !fam.has(p.familia)) fam.set(p.familia, cod.slice(3, 6));
    if (p.sabor && !sab.has(p.sabor)) sab.set(p.sabor, cod.slice(6, 9));
    if (p.presentacion && !pres.has(p.presentacion))
      pres.set(p.presentacion, cod.slice(9, 11));
  }

  const aLista = (m: Map<string, string>): ComponenteCatalogo[] =>
    [...m.entries()]
      .map(([nombre, codigo]) => ({ nombre, codigo }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));

  return {
    categorias: aLista(cat),
    familias: aLista(fam),
    sabores: aLista(sab),
    presentaciones: aLista(pres),
  };
}

type FilaConPrecios = Producto & {
  producto_precios?: { lista: number; precio: number }[] | null;
};

function mapearPrecios(row: FilaConPrecios): ProductoConPrecios {
  const precios: Record<number, number> = {};
  for (const p of row.producto_precios ?? []) {
    precios[p.lista] = Number(p.precio);
  }
  const { producto_precios, ...rest } = row;
  return { ...(rest as Producto), precios };
}
