"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  Trash2,
  Loader2,
  AlertTriangle,
  ShoppingCart,
} from "lucide-react";
import { crearPedido, actualizarPedido } from "@/app/(app)/pedidos/actions";
import {
  resolverPrecio,
  calcularSubtotal,
  calcularTotal,
  calcularIva,
  calcularTotalConIva,
} from "@/lib/pricing";
import { formatCurrency, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LISTAS_PRECIOS, ETIQUETAS_LISTA, type ProductoConPrecios } from "@/lib/types";

export interface ClienteSelector {
  id: string;
  codigo_cliente: string;
  nombre: string;
  nombre_comercial: string | null;
  canal: string | null;
  lista_precios: number;
  forma_pago: "CONTADO" | "CREDITO" | null;
  direccion_entrega: string | null;
}

interface LineaPedido {
  producto: ProductoConPrecios;
  cantidad: number;
  /** Precio fijado manualmente para este pedido (null = usa el de la lista). */
  precioManual: number | null;
}

export interface PedidoInicialItem {
  productoId: string | null;
  codigo: string;
  descripcion: string;
  sabor: string | null;
  presentacion: string | null;
  cantidad: number;
  precioUnitario: number;
}

export interface PedidoInicial {
  id: string;
  clienteId: string;
  fecha: string;
  notas: string | null;
  lista: number;
  items: PedidoInicialItem[];
}

/** Construye las líneas iniciales de un pedido existente para editarlo. */
function seedLineas(
  pedido: PedidoInicial,
  productos: ProductoConPrecios[],
): LineaPedido[] {
  return pedido.items.map((it) => {
    let producto = productos.find((p) => p.id === it.productoId);
    if (!producto) {
      // Producto inactivo o ausente del catálogo activo: se reconstruye del snapshot.
      producto = {
        id: it.productoId ?? `snap-${it.codigo}`,
        codigo: it.codigo,
        descripcion: it.descripcion,
        categoria: null,
        familia: null,
        sabor: it.sabor,
        presentacion: it.presentacion,
        peso_kg: null,
        costo: null,
        activo: true,
        created_at: "",
        updated_at: "",
        precios: { [pedido.lista]: it.precioUnitario },
      };
    }
    const base = resolverPrecio(producto, pedido.lista);
    const precioManual = base.precio === it.precioUnitario ? null : it.precioUnitario;
    return { producto, cantidad: it.cantidad, precioManual };
  });
}

export function OrderBuilder({
  clientes,
  productos,
  pedido,
}: {
  clientes: ClienteSelector[];
  productos: ProductoConPrecios[];
  pedido?: PedidoInicial;
}) {
  const router = useRouter();
  const modo = pedido ? "editar" : "crear";
  const hoy = new Date().toISOString().slice(0, 10);

  const [clienteId, setClienteId] = useState(pedido?.clienteId ?? "");
  const [fecha, setFecha] = useState(pedido?.fecha ?? hoy);
  const [notas, setNotas] = useState(pedido?.notas ?? "");
  const [busqueda, setBusqueda] = useState("");
  const [lineas, setLineas] = useState<LineaPedido[]>(() =>
    pedido ? seedLineas(pedido, productos) : [],
  );
  const [listaManual, setListaManual] = useState<number | null>(pedido?.lista ?? null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const cliente = clientes.find((c) => c.id === clienteId);
  // Lista efectiva: la elegida para este pedido, o la predeterminada del cliente.
  const lista = cliente ? (listaManual ?? cliente.lista_precios) : null;

  // Al CAMBIAR de cliente se reinicia la lista (no en el primer render, para
  // respetar la lista del pedido que se está editando).
  const primerRender = useRef(true);
  useEffect(() => {
    if (primerRender.current) {
      primerRender.current = false;
      return;
    }
    setListaManual(null);
  }, [clienteId]);

  const resultados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return [];
    return productos
      .filter(
        (p) =>
          p.codigo.toLowerCase().includes(q) ||
          p.descripcion.toLowerCase().includes(q) ||
          (p.sabor?.toLowerCase().includes(q) ?? false),
      )
      .slice(0, 25);
  }, [busqueda, productos]);

  function agregar(producto: ProductoConPrecios) {
    setLineas((prev) => {
      const i = prev.findIndex((l) => l.producto.id === producto.id);
      if (i >= 0) {
        const copia = [...prev];
        copia[i] = { ...copia[i], cantidad: copia[i].cantidad + 1 };
        return copia;
      }
      return [...prev, { producto, cantidad: 1, precioManual: null }];
    });
    setBusqueda("");
  }

  function cambiarCantidad(id: string, cantidad: number) {
    setLineas((prev) =>
      prev.map((l) =>
        l.producto.id === id ? { ...l, cantidad: Math.max(1, cantidad || 1) } : l,
      ),
    );
  }

  function cambiarPrecio(id: string, raw: string) {
    setLineas((prev) =>
      prev.map((l) => {
        if (l.producto.id !== id) return l;
        if (raw.trim() === "") return { ...l, precioManual: null };
        const n = parseFloat(raw);
        return { ...l, precioManual: isFinite(n) && n >= 0 ? n : 0 };
      }),
    );
  }

  function quitar(id: string) {
    setLineas((prev) => prev.filter((l) => l.producto.id !== id));
  }

  // Cálculos con el motor de precios (mismo que el servidor).
  // El precio manual de la línea tiene prioridad sobre el de la lista.
  const filasCalculadas = lineas.map((l) => {
    const base = resolverPrecio(l.producto, lista ?? 0);
    const precio = l.precioManual != null ? l.precioManual : base.precio;
    const sinPrecio = precio == null;
    return {
      ...l,
      precio,
      sinPrecio,
      subtotal: precio != null ? calcularSubtotal(precio, l.cantidad) : 0,
    };
  });

  const haydSinPrecio = filasCalculadas.some((f) => f.sinPrecio);
  const subtotal = calcularTotal(filasCalculadas.map((f) => f.subtotal));
  const iva = calcularIva(subtotal);
  const total = calcularTotalConIva(subtotal);
  const puedeGuardar = !!cliente && lineas.length > 0 && !haydSinPrecio && !pending;

  function guardar() {
    setError(null);
    if (!cliente) {
      setError("Selecciona un cliente.");
      return;
    }
    if (lineas.length === 0) {
      setError("Agrega al menos un producto.");
      return;
    }
    if (haydSinPrecio) {
      setError("Hay productos sin precio para la lista de este cliente. Quítalos o corrige el precio.");
      return;
    }
    const payload = {
      clienteId: cliente.id,
      fecha,
      notas,
      lista: lista ?? undefined,
      items: filasCalculadas.map((f) => ({
        productoId: f.producto.id,
        cantidad: f.cantidad,
        precioUnitario: f.precio ?? undefined,
      })),
    };

    startTransition(async () => {
      const res =
        modo === "editar" && pedido
          ? await actualizarPedido(pedido.id, payload)
          : await crearPedido(payload);
      if (res.ok && res.id) {
        router.push(`/pedidos/${res.id}`);
      } else {
        setError(res.error ?? "No se pudo guardar el pedido.");
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px] items-start">
      {/* Columna principal */}
      <div className="space-y-6 min-w-0">
        {/* Paso 1: cliente */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-white text-xs">
                1
              </span>
              Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="cliente">Selecciona el cliente</Label>
              <Select
                id="cliente"
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
              >
                <option value="">— Elegir cliente —</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre_comercial || c.nombre} ({c.codigo_cliente})
                  </option>
                ))}
              </Select>
            </div>

            {cliente && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-lg bg-slate-50 p-3 text-sm">
                  <Info label="Canal" value={cliente.canal || "—"} />
                  <Info
                    label="Lista del cliente"
                    value={<Badge tone="brand">P{cliente.lista_precios}</Badge>}
                  />
                  <Info
                    label="Pago"
                    value={cliente.forma_pago === "CREDITO" ? "Crédito" : "Contado"}
                  />
                  <Info label="Entrega" value={cliente.direccion_entrega || "—"} full />
                </div>

                <div className="flex flex-wrap items-end gap-3">
                  <div>
                    <Label htmlFor="lista-pedido">Lista de precios para este pedido</Label>
                    <Select
                      id="lista-pedido"
                      value={String(lista ?? cliente.lista_precios)}
                      onChange={(e) => setListaManual(Number(e.target.value))}
                      className="w-60"
                    >
                      {LISTAS_PRECIOS.map((l) => (
                        <option key={l} value={l}>
                          P{l}
                          {ETIQUETAS_LISTA[l] ? ` · ${ETIQUETAS_LISTA[l]}` : ""}
                          {l === cliente.lista_precios ? " (predeterminada)" : ""}
                        </option>
                      ))}
                    </Select>
                  </div>
                  {listaManual != null && listaManual !== cliente.lista_precios && (
                    <span className="mb-2.5 text-xs text-amber-600">
                      Cambio solo para este pedido (no modifica al cliente).
                    </span>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Paso 2: productos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-white text-xs">
                2
              </span>
              Productos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!cliente ? (
              <p className="text-sm text-muted">
                Primero selecciona un cliente para calcular los precios.
              </p>
            ) : (
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
                <Input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar producto por código, nombre o sabor..."
                  className="pl-9"
                />
                {resultados.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full max-h-72 overflow-auto rounded-lg border border-line bg-white shadow-lg">
                    {resultados.map((p) => {
                      const { precio, sinPrecio } = resolverPrecio(p, lista ?? 0);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => agregar(p)}
                          className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-brand-50 border-b border-line last:border-0"
                        >
                          <span className="min-w-0">
                            <span className="block truncate font-medium">{p.descripcion}</span>
                            <span className="font-mono text-xs text-muted">{p.codigo}</span>
                          </span>
                          <span className="shrink-0 tabular-nums">
                            {sinPrecio ? (
                              <span className="text-red-600 text-xs">Sin precio</span>
                            ) : (
                              formatCurrency(precio)
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Líneas */}
            {lineas.length > 0 && (
              <div className="overflow-x-auto -mx-5 px-5">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-muted border-b border-line">
                      <th className="py-2 pr-2 font-semibold">Producto</th>
                      <th className="py-2 px-2 font-semibold text-right">Precio</th>
                      <th className="py-2 px-2 font-semibold text-center w-24">Cant.</th>
                      <th className="py-2 px-2 font-semibold text-right">Subtotal</th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filasCalculadas.map((f) => (
                      <tr
                        key={f.producto.id}
                        className={cn(
                          "border-b border-line last:border-0",
                          f.sinPrecio && "bg-red-50",
                        )}
                      >
                        <td className="py-2 pr-2">
                          <span className="block font-medium">{f.producto.descripcion}</span>
                          <span className="font-mono text-xs text-muted">
                            {f.producto.codigo}
                          </span>
                          {f.sinPrecio && (
                            <span className="flex items-center gap-1 text-xs text-red-600 mt-0.5">
                              <AlertTriangle className="size-3" />
                              Sin precio en la lista P{lista}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-2">
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            inputMode="decimal"
                            value={f.precio ?? ""}
                            onChange={(e) => cambiarPrecio(f.producto.id, e.target.value)}
                            placeholder="—"
                            className={cn(
                              "h-8 w-24 ml-auto text-right",
                              f.precioManual != null && "border-amber-400 bg-amber-50",
                            )}
                          />
                        </td>
                        <td className="py-2 px-2">
                          <Input
                            type="number"
                            min={1}
                            value={f.cantidad}
                            onChange={(e) =>
                              cambiarCantidad(f.producto.id, parseInt(e.target.value, 10))
                            }
                            className="h-8 w-20 mx-auto text-center"
                          />
                        </td>
                        <td className="py-2 px-2 text-right font-medium tabular-nums">
                          {f.precio != null ? formatCurrency(f.subtotal) : "—"}
                        </td>
                        <td className="py-2 pl-2 text-right">
                          <button
                            type="button"
                            onClick={() => quitar(f.producto.id)}
                            className="text-muted hover:text-red-600"
                            aria-label="Quitar"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Columna resumen */}
      <Card className="lg:sticky lg:top-6">
        <CardHeader>
          <CardTitle>Resumen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">Artículos</span>
            <span className="font-medium">
              {lineas.reduce((a, l) => a + l.cantidad, 0)}
            </span>
          </div>
          <div className="space-y-1.5 border-t border-line pt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">Subtotal</span>
              <span className="tabular-nums">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">IVA (13%)</span>
              <span className="tabular-nums">{formatCurrency(iva)}</span>
            </div>
            <div className="flex items-center justify-between pt-1.5 border-t border-line">
              <span className="font-semibold">Total</span>
              <span className="text-2xl font-bold tabular-nums">{formatCurrency(total)}</span>
            </div>
          </div>

          <div>
            <Label htmlFor="fecha">Fecha</Label>
            <Input
              id="fecha"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="notas">Notas (opcional)</Label>
            <Textarea
              id="notas"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Observaciones del pedido..."
            />
          </div>

          {haydSinPrecio && (
            <p className="flex items-start gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertTriangle className="size-4 shrink-0 mt-0.5" />
              Hay productos sin precio para la lista de este cliente. Quítalos para continuar.
            </p>
          )}
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <Button onClick={guardar} disabled={!puedeGuardar} className="w-full" size="lg">
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ShoppingCart className="size-4" />
            )}
            {modo === "editar" ? "Guardar cambios" : "Guardar pedido"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Info({
  label,
  value,
  full,
}: {
  label: string;
  value: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={full ? "col-span-2 sm:col-span-4" : ""}>
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-0.5 truncate">{value}</div>
    </div>
  );
}
