import { notFound } from "next/navigation";
import { IceCream } from "lucide-react";
import { getPedidoCompleto } from "@/lib/data/pedidos";
import { requireUser } from "@/lib/auth";
import { Breadcrumb } from "@/components/app/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EstadoBadge } from "@/components/pedidos/estado-badge";
import { PedidoAcciones } from "@/components/pedidos/pedido-acciones";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PedidoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireUser();
  const pedido = await getPedidoCompleto(id);
  if (!pedido) notFound();

  const clienteNombre = pedido.cliente?.nombre_comercial || pedido.cliente?.nombre || "—";

  return (
    <div className="max-w-3xl">
      <div className="no-print">
        <Breadcrumb
          items={[{ label: "Pedidos", href: "/pedidos" }, { label: `#${pedido.folio}` }]}
        />
      </div>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Pedido #{pedido.folio}</h1>
        <EstadoBadge estado={pedido.estado} />
      </div>

      <div className="mb-6">
        <PedidoAcciones id={pedido.id} estado={pedido.estado} facturado={pedido.facturado} />
      </div>

      {/* Comprobante */}
      <Card className="p-6 sm:p-8">
        <div className="flex items-start justify-between border-b border-line pb-5 mb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white">
              <IceCream className="size-6" />
            </div>
            <div>
              <div className="font-bold text-lg leading-tight">INNOLATTE</div>
              <div className="text-xs text-muted">Comprobante de pedido</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted">Folio</div>
            <div className="text-xl font-bold">#{pedido.folio}</div>
            <div className="text-xs text-muted mt-1">{formatDate(pedido.fecha)}</div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mb-6 text-sm">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted">Cliente</div>
            <div className="font-medium mt-0.5">{clienteNombre}</div>
            {pedido.cliente?.codigo_cliente && (
              <div className="text-xs text-muted font-mono">
                {pedido.cliente.codigo_cliente}
              </div>
            )}
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-muted">Entrega</div>
            <div className="mt-0.5">{pedido.direccion_entrega || "—"}</div>
          </div>
          <div className="flex gap-6">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted">Canal</div>
              <div className="mt-0.5">{pedido.canal || "—"}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted">Pago</div>
              <div className="mt-0.5">
                {pedido.forma_pago === "CREDITO" ? "Crédito" : "Contado"}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted">Lista</div>
              <div className="mt-0.5">
                <Badge tone="brand">P{pedido.lista_precios_aplicada}</Badge>
              </div>
            </div>
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-muted border-b border-line">
              <th className="py-2 pr-2 font-semibold">Código</th>
              <th className="py-2 px-2 font-semibold">Producto</th>
              <th className="py-2 px-2 font-semibold text-center">Cant.</th>
              <th className="py-2 px-2 font-semibold text-right">P. Unit.</th>
              <th className="py-2 pl-2 font-semibold text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {pedido.items.map((it) => (
              <tr key={it.id} className="border-b border-line">
                <td className="py-2 pr-2 font-mono text-xs text-muted align-top">
                  {it.codigo}
                </td>
                <td className="py-2 px-2 align-top">
                  {it.descripcion}
                  {it.sabor && <span className="text-muted"> · {it.sabor}</span>}
                </td>
                <td className="py-2 px-2 text-center align-top tabular-nums">{it.cantidad}</td>
                <td className="py-2 px-2 text-right align-top tabular-nums">
                  {formatCurrency(Number(it.precio_unitario))}
                </td>
                <td className="py-2 pl-2 text-right align-top font-medium tabular-nums">
                  {formatCurrency(Number(it.subtotal))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end mt-5">
          <div className="w-56 space-y-2">
            <div className="flex justify-between border-t-2 border-ink pt-3">
              <span className="font-bold">Total</span>
              <span className="text-xl font-bold tabular-nums">
                {formatCurrency(Number(pedido.total))}
              </span>
            </div>
          </div>
        </div>

        {pedido.notas && (
          <div className="mt-6 rounded-lg bg-slate-50 p-3 text-sm">
            <span className="font-medium">Notas: </span>
            {pedido.notas}
          </div>
        )}
      </Card>
    </div>
  );
}
