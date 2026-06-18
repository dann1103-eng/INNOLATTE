"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { marcarFacturado } from "@/app/(app)/pedidos/actions";

/** Checkbox de facturado editable directamente en la fila de la lista. */
export function PedidoFacturadoInline({
  id,
  facturado,
}: {
  id: string;
  facturado: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle(valor: boolean) {
    setError(null);
    startTransition(async () => {
      const res = await marcarFacturado(id, valor);
      if (!res.ok) setError(res.error ?? "Error");
      else router.refresh();
    });
  }

  return (
    <span className="inline-flex items-center gap-1">
      <input
        type="checkbox"
        checked={facturado}
        disabled={pending}
        onChange={(e) => toggle(e.target.checked)}
        className="size-4 rounded border-line accent-brand-600 disabled:opacity-60"
        aria-label="Facturado"
      />
      {error && (
        <span className="text-red-600 text-xs" title={error}>
          !
        </span>
      )}
    </span>
  );
}
