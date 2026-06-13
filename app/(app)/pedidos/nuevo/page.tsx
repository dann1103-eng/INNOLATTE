import { getClientesParaSelector } from "@/lib/data/clientes";
import { getProductosConPrecios } from "@/lib/data/productos";
import { requireUser } from "@/lib/auth";
import { Breadcrumb } from "@/components/app/page-header";
import { OrderBuilder, type ClienteSelector } from "@/components/pedidos/order-builder";

export const dynamic = "force-dynamic";

export default async function NuevoPedidoPage() {
  await requireUser();
  const [clientes, productos] = await Promise.all([
    getClientesParaSelector(),
    getProductosConPrecios(),
  ]);

  return (
    <div>
      <Breadcrumb
        items={[{ label: "Pedidos", href: "/pedidos" }, { label: "Nuevo pedido" }]}
      />
      <h1 className="text-2xl font-bold tracking-tight mb-6">Nuevo pedido</h1>
      <OrderBuilder clientes={clientes as ClienteSelector[]} productos={productos} />
    </div>
  );
}
