import { requireUser } from "@/lib/auth";
import { Sidebar } from "@/components/app/sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { perfil } = await requireUser();

  return (
    <div className="min-h-screen md:flex">
      <Sidebar perfil={perfil} />
      <main className="flex-1 min-w-0">
        <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">{children}</div>
      </main>
    </div>
  );
}
