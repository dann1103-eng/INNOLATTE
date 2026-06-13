"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Printer } from "lucide-react";
import { actualizarEstado, marcarFacturado } from "@/app/(app)/pedidos/actions";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ESTADOS_PEDIDO, type EstadoPedido } from "@/lib/types";

export function PedidoAcciones({
  id,
  estado,
  facturado,
}: {
  id: string;
  estado: EstadoPedido;
  facturado: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function cambiarEstado(nuevo: EstadoPedido) {
    startTransition(async () => {
      const res = await actualizarEstado(id, nuevo);
      if (!res.ok) setMsg(res.error ?? "Error");
      else router.refresh();
    });
  }

  function toggleFacturado(valor: boolean) {
    startTransition(async () => {
      const res = await marcarFacturado(id, valor);
      if (!res.ok) setMsg(res.error ?? "Error");
      else router.refresh();
    });
  }

  return (
    <div className="no-print space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="text-xs uppercase tracking-wide text-muted block mb-1.5">
            Estado
          </label>
          <Select
            value={estado}
            disabled={pending}
            onChange={(e) => cambiarEstado(e.target.value as EstadoPedido)}
            className="w-44"
          >
            {ESTADOS_PEDIDO.map((e) => (
              <option key={e.value} value={e.value}>
                {e.label}
              </option>
            ))}
          </Select>
        </div>

        <label className="flex items-center gap-2 h-10 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={facturado}
            disabled={pending}
            onChange={(e) => toggleFacturado(e.target.checked)}
            className="size-4 rounded border-line accent-brand-600"
          />
          <span className="text-sm font-medium">Facturado</span>
        </label>

        {pending && <Loader2 className="size-4 animate-spin text-muted mb-3" />}

        <div className="ml-auto">
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer className="size-4" />
            Imprimir
          </Button>
        </div>
      </div>

      {msg && <p className="text-sm text-red-600">{msg}</p>}
    </div>
  );
}
