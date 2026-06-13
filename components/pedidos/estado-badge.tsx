import { Badge } from "@/components/ui/badge";
import { ESTADOS_PEDIDO, type EstadoPedido } from "@/lib/types";

const TONE: Record<EstadoPedido, "amber" | "blue" | "green" | "red"> = {
  PENDIENTE: "amber",
  EN_RUTA: "blue",
  ENTREGADO: "green",
  CANCELADO: "red",
};

export function EstadoBadge({ estado }: { estado: EstadoPedido }) {
  const def = ESTADOS_PEDIDO.find((e) => e.value === estado);
  return <Badge tone={TONE[estado]}>{def?.label ?? estado}</Badge>;
}
