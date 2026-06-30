// ============================================================
// Tipos del dominio — Paletas INNOLATTE
// ============================================================

export type Rol = "admin" | "vendedor";

export type FormaPago = "CONTADO" | "CREDITO";

export type EstadoPedido = "PENDIENTE" | "EN_RUTA" | "ENTREGADO" | "CANCELADO";

/** CD = sede que prepara el pedido. */
export type CdSede = "PLANTA" | "DISTRIBUCION";

export const CD_SEDES: { value: CdSede; label: string }[] = [
  { value: "PLANTA", label: "CD Planta" },
  { value: "DISTRIBUCION", label: "CD Distribución" },
];

/** Canales de venta detectados en la base de datos de clientes. */
export const CANALES = [
  "DISTRIBUIDOR",
  "TELEVENTA",
  "MATERIA PRIMA",
  "INSTITUCIONAL",
  "CONSUMIDOR FINAL",
  "EVENTOS",
  "DEGUSTACIONES",
  "DEPURADO",
] as const;

/** Categorías de producto detectadas en el catálogo. */
export const CATEGORIAS = ["CONGELADOS", "YOGURT", "MEZCLAS", "TOPPING"] as const;

export const FORMAS_PAGO: FormaPago[] = ["CONTADO", "CREDITO"];

/** Listas de precios soportadas: P1..P20. */
export const LISTAS_PRECIOS: number[] = Array.from({ length: 20 }, (_, i) => i + 1);

/** Etiquetas conocidas para algunas listas. */
export const ETIQUETAS_LISTA: Record<number, string> = {
  2: "Estándar",
  4: "Distribuidor",
};

/**
 * Prefijos de correlativo de cliente (tipo de cliente). El código se arma como
 * PREFIJO + número correlativo (ej. CLP0031). Al elegir el tipo, el sistema
 * sugiere el siguiente número disponible para ese prefijo.
 */
export const PREFIJOS_CLIENTE: { prefijo: string; descripcion: string }[] = [
  { prefijo: "CLP", descripcion: "Cliente Planta" },
  { prefijo: "CDDI", descripcion: "Cede Distribución" },
  { prefijo: "CDTV", descripcion: "Cede Televenta" },
  { prefijo: "CDEV", descripcion: "Cede Eventos" },
  { prefijo: "INCFD", descripcion: "Innolatte Consumidor Final CD Distribución" },
  { prefijo: "INCFP", descripcion: "Innolatte Consumidor Final CD Planta" },
  { prefijo: "INDA", descripcion: "Innolatte Degustación" },
  { prefijo: "PLDI", descripcion: "Planta Distribución" },
  { prefijo: "PLTV", descripcion: "Planta Televenta" },
  { prefijo: "CDIN", descripcion: "Cede Institucional" },
  { prefijo: "PLMP", descripcion: "Planta Materia Prima" },
];

export const ESTADOS_PEDIDO: { value: EstadoPedido; label: string; color: string }[] = [
  { value: "PENDIENTE", label: "Pendiente", color: "amber" },
  { value: "EN_RUTA", label: "En ruta", color: "blue" },
  { value: "ENTREGADO", label: "Entregado", color: "green" },
  { value: "CANCELADO", label: "Cancelado", color: "red" },
];

export interface Perfil {
  id: string;
  nombre: string | null;
  rol: Rol;
}

export interface Cliente {
  id: string;
  codigo_cliente: string;
  nombre: string;
  nombre_comercial: string | null;
  telefono: string | null;
  correo: string | null;
  contacto_nombre: string | null;
  contacto_telefono: string | null;
  direccion_fiscal: string | null;
  direccion_entrega: string | null;
  departamento: string | null;
  municipio: string | null;
  distrito: string | null;
  canal: string | null;
  lista_precios: number;
  cd: CdSede;
  forma_pago: FormaPago;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Producto {
  id: string;
  codigo: string;
  descripcion: string;
  categoria: string | null;
  familia: string | null;
  sabor: string | null;
  presentacion: string | null;
  peso_kg: number | null;
  costo: number | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductoPrecio {
  id: string;
  producto_id: string;
  lista: number;
  precio: number;
}

/** Producto con sus precios resueltos (mapa lista -> precio). */
export interface ProductoConPrecios extends Producto {
  precios: Record<number, number>; // { 1: 2.21, 2: 2.21, 4: 1.77, ... }
}

export interface PedidoItem {
  id: string;
  pedido_id: string;
  producto_id: string | null;
  codigo: string;
  descripcion: string;
  sabor: string | null;
  presentacion: string | null;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export interface Pedido {
  id: string;
  folio: number;
  cliente_id: string | null;
  fecha: string;
  canal: string | null;
  forma_pago: FormaPago | null;
  direccion_entrega: string | null;
  lista_precios_aplicada: number;
  cd: CdSede;
  estado: EstadoPedido;
  facturado: boolean;
  subtotal: number;
  total: number;
  notas: string | null;
  creado_por: string | null;
  created_at: string;
  updated_at: string;
}

export interface PedidoConCliente extends Pedido {
  cliente: Pick<
    Cliente,
    "id" | "codigo_cliente" | "nombre" | "nombre_comercial" | "distrito"
  > | null;
}

export interface PedidoCompleto extends PedidoConCliente {
  items: PedidoItem[];
}
