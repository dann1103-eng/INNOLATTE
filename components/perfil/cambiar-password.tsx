"use client";

import { useState } from "react";
import { Loader2, Check, KeyRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function CambiarPassword({ email }: { email: string }) {
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(false);

    if (nueva.length < 6) {
      setError("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (nueva !== confirmar) {
      setError("La confirmación no coincide con la nueva contraseña.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    // 1) Verificar la contraseña actual reautenticando.
    const { error: e1 } = await supabase.auth.signInWithPassword({
      email,
      password: actual,
    });
    if (e1) {
      setError("La contraseña actual es incorrecta.");
      setLoading(false);
      return;
    }

    // 2) Actualizar a la nueva.
    const { error: e2 } = await supabase.auth.updateUser({ password: nueva });
    if (e2) {
      setError(e2.message);
      setLoading(false);
      return;
    }

    setOk(true);
    setActual("");
    setNueva("");
    setConfirmar("");
    setLoading(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="size-4 text-brand-600" />
          Cambiar contraseña
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
          <div>
            <Label htmlFor="actual">Contraseña actual</Label>
            <Input
              id="actual"
              type="password"
              autoComplete="current-password"
              value={actual}
              onChange={(e) => setActual(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="nueva">Nueva contraseña</Label>
            <Input
              id="nueva"
              type="password"
              autoComplete="new-password"
              value={nueva}
              onChange={(e) => setNueva(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="confirmar">Confirmar nueva contraseña</Label>
            <Input
              id="confirmar"
              type="password"
              autoComplete="new-password"
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              required
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          {ok && (
            <p className="flex items-center gap-1.5 text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              <Check className="size-4" /> Contraseña actualizada correctamente.
            </p>
          )}

          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="size-4 animate-spin" />}
            Actualizar contraseña
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
