"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { actualizarEstado } from "@/app/(app)/pedidos/actions";
import { ESTADOS_PEDIDO, type EstadoPedido } from "@/lib/types";

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
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-1">
      <select
        value={estado}
        disabled={pending}
        onChange={(e) => cambiar(e.target.value as EstadoPedido)}
        className="h-8 rounded-md border border-line bg-white px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-60"
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
