"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  Trash2,
  Loader2,
  AlertTriangle,
  ShoppingCart,
} from "lucide-react";
import { crearPedido } from "@/app/(app)/pedidos/actions";
import { resolverPrecio, calcularSubtotal, calcularTotal } from "@/lib/pricing";
import { formatCurrency, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ProductoConPrecios } from "@/lib/types";

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
}

export function OrderBuilder({
  clientes,
  productos,
}: {
  clientes: ClienteSelector[];
  productos: ProductoConPrecios[];
}) {
  const router = useRouter();
  const hoy = new Date().toISOString().slice(0, 10);

  const [clienteId, setClienteId] = useState("");
  const [fecha, setFecha] = useState(hoy);
  const [notas, setNotas] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [lineas, setLineas] = useState<LineaPedido[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const cliente = clientes.find((c) => c.id === clienteId);
  const lista = cliente?.lista_precios ?? null;

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
      return [...prev, { producto, cantidad: 1 }];
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

  function quitar(id: string) {
    setLineas((prev) => prev.filter((l) => l.producto.id !== id));
  }

  // Cálculos con el motor de precios (mismo que el servidor).
  const filasCalculadas = lineas.map((l) => {
    const { precio, sinPrecio } = resolverPrecio(l.producto, lista ?? 0);
    return {
      ...l,
      precio,
      sinPrecio,
      subtotal: precio != null ? calcularSubtotal(precio, l.cantidad) : 0,
    };
  });

  const haydSinPrecio = filasCalculadas.some((f) => f.sinPrecio);
  const total = calcularTotal(filasCalculadas.map((f) => f.subtotal));
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
    startTransition(async () => {
      const res = await crearPedido({
        clienteId: cliente.id,
        fecha,
        notas,
        items: lineas.map((l) => ({ productoId: l.producto.id, cantidad: l.cantidad })),
      });
      if (res.ok && res.id) {
        router.push(`/pedidos/${res.id}`);
      } else {
        setError(res.error ?? "No se pudo crear el pedido.");
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-lg bg-slate-50 p-3 text-sm">
                <Info label="Canal" value={cliente.canal || "—"} />
                <Info
                  label="Lista"
                  value={<Badge tone="brand">P{cliente.lista_precios}</Badge>}
                />
                <Info
                  label="Pago"
                  value={cliente.forma_pago === "CREDITO" ? "Crédito" : "Contado"}
                />
                <Info label="Entrega" value={cliente.direccion_entrega || "—"} full />
              </div>
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
                        <td className="py-2 px-2 text-right tabular-nums">
                          {f.precio != null ? formatCurrency(f.precio) : "—"}
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
          <div className="flex items-center justify-between border-t border-line pt-4">
            <span className="font-semibold">Total</span>
            <span className="text-2xl font-bold tabular-nums">{formatCurrency(total)}</span>
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
            Guardar pedido
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
