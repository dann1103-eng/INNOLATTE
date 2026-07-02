"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { actualizarEstado } from "@/app/(app)/pedidos/actions";
import { ESTADOS_PEDIDO, type EstadoPedido } from "@/lib/types";

const DOT_CLASS: Record<EstadoPedido, string> = {
  PENDIENTE: "bg-amber-400",
  EN_RUTA:   "bg-sky-400",
  ENTREGADO: "bg-green-500",
  CANCELADO: "bg-red-500",
};

const SELECT_CLASS: Record<EstadoPedido, string> = {
  PENDIENTE: "border-amber-300 bg-amber-50  text-amber-800",
  EN_RUTA:   "border-sky-300   bg-sky-50    text-sky-800",
  ENTREGADO: "border-green-300 bg-green-50  text-green-800",
  CANCELADO: "border-red-300   bg-red-50    text-red-800",
};

/** Select de estado editable directamente en la fila de la lista. */
export function PedidoEstadoInline({
  id,
  estado,
}: {
  id: string;
  estado: EstadoPedido;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function cambiar(nuevo: EstadoPedido) {
    if (nuevo === estado) return;
    setError(null);
    startTransition(async () => {
      const res = await actualizarEstado(id, nuevo);
      if (!res.ok) setError(res.error ?? "Error");
      else router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className={`size-2 rounded-full shrink-0 ${DOT_CLASS[estado]}`} />
      <select
        value={estado}
        disabled={pending}
        onChange={(e) => cambiar(e.target.value as EstadoPedido)}
        className={`h-8 rounded-md border px-2 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-60 ${SELECT_CLASS[estado]}`}
      >
        {ESTADOS_PEDIDO.map((e) => (
          <option key={e.value} value={e.value}>
            {e.label}
          </option>
        ))}
      </select>
      {error && (
        <span className="text-red-600 text-xs" title={error}>
          !
        </span>
      )}
    </div>
  );
}
