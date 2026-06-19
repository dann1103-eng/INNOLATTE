import { notFound } from "next/navigation";
import { getPedidoCompleto } from "@/lib/data/pedidos";
import { getClientesParaSelector } from "@/lib/data/clientes";
import { getProductosConPrecios } from "@/lib/data/productos";
import { requireUser } from "@/lib/auth";
import { Breadcrumb } from "@/components/app/page-header";
import {
  OrderBuilder,
  type ClienteSelector,
  type PedidoInicial,
} from "@/components/pedidos/order-builder";

export const dynamic = "force-dynamic";

export default async function EditarPedidoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireUser();

  const [pedido, clientes, productos] = await Promise.all([
    getPedidoCompleto(id),
    getClientesParaSelector(),
    getProductosConPrecios(),
  ]);
  if (!pedido) notFound();

  const inicial: PedidoInicial = {
    id: pedido.id,
    clienteId: pedido.cliente_id ?? "",
    fecha: pedido.fecha,
    notas: pedido.notas,
    lista: pedido.lista_precios_aplicada,
    cd: pedido.cd,
    items: pedido.items.map((it) => ({
      productoId: it.producto_id,
      codigo: it.codigo,
      descripcion: it.descripcion,
      sabor: it.sabor,
      presentacion: it.presentacion,
      cantidad: it.cantidad,
      precioUnitario: Number(it.precio_unitario),
    })),
  };

  return (
    <div>
      <Breadcrumb
        items={[
          { label: "Pedidos", href: "/pedidos" },
          { label: `#${pedido.folio}`, href: `/pedidos/${pedido.id}` },
          { label: "Editar" },
        ]}
      />
      <h1 className="text-2xl font-bold tracking-tight mb-6">
        Editar pedido #{pedido.folio}
      </h1>
      <OrderBuilder
        clientes={clientes as ClienteSelector[]}
        productos={productos}
        pedido={inicial}
      />
    </div>
  );
}
