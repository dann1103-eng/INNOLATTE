import { UserCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CambiarPassword } from "@/components/perfil/cambiar-password";

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const { perfil } = await requireUser();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email ?? "";

  return (
    <div className="max-w-2xl">
      <PageHeader title="Mi perfil" description="Datos de tu cuenta y seguridad" />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCircle className="size-4 text-brand-600" />
              Mi cuenta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted">Nombre</dt>
                <dd className="mt-0.5">{perfil.nombre || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted">Correo</dt>
                <dd className="mt-0.5">{email}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted">Rol</dt>
                <dd className="mt-0.5">
                  <Badge tone={perfil.rol === "admin" ? "brand" : "gray"}>
                    {perfil.rol === "admin" ? "Administrador" : "Vendedor"}
                  </Badge>
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <CambiarPassword email={email} />
      </div>
    </div>
  );
}
