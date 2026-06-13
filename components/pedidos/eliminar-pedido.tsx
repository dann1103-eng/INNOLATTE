"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { eliminarPedido } from "@/app/(app)/pedidos/actions";
import { Button } from "@/components/ui/button";

export function EliminarPedido({ id, folio }: { id: string; folio: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onDelete() {
    if (!window.confirm(`¿Eliminar el pedido #${folio}? Esta acción no se puede deshacer.`))
      return;
    startTransition(async () => {
      const res = await eliminarPedido(id);
      if (res.ok) {
        router.push("/pedidos");
        router.refresh();
      } else {
        setError(res.error ?? "No se pudo eliminar.");
      }
    });
  }

  return (
    <div className="inline-flex flex-col items-end">
      <Button variant="danger" onClick={onDelete} disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
        Eliminar
      </Button>
      {error && <span className="text-xs text-red-600 mt-1">{error}</span>}
    </div>
  );
}
