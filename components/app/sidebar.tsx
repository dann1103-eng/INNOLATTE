"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  IceCream,
  LayoutDashboard,
  Users,
  Package,
  ClipboardList,
  Route,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Perfil } from "@/lib/types";

const NAV = [
  { href: "/", label: "Inicio", icon: LayoutDashboard, exact: true },
  { href: "/pedidos", label: "Pedidos", icon: ClipboardList },
  { href: "/rutas", label: "Rutas", icon: Route },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/catalogo", label: "Catálogo", icon: Package },
];

export function Sidebar({ perfil }: { perfil: Perfil }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <>
      {/* Barra superior móvil */}
      <div className="no-print md:hidden sticky top-0 z-30 flex items-center justify-between border-b border-line bg-surface px-4 h-14">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
            <IceCream className="size-4.5" />
          </div>
          <span className="font-semibold">INNOLATTE</span>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="p-2 -mr-2 text-muted"
          aria-label="Menú"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {/* Overlay móvil */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/30"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={cn(
          "no-print fixed z-40 md:z-auto md:static inset-y-0 left-0 w-64 shrink-0 border-r border-line bg-surface flex flex-col transition-transform md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="hidden md:flex items-center gap-2.5 px-5 h-16 border-b border-line">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
            <IceCream className="size-5" />
          </div>
          <div className="leading-tight">
            <div className="font-bold">INNOLATTE</div>
            <div className="text-xs text-muted">Toma de pedidos</div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 mt-2 md:mt-0">
          {NAV.map((item) => {
            const active = isActive(item.href, item.exact);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-ink",
                )}
              >
                <Icon className="size-4.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-line p-3">
          <Link
            href="/perfil"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-brand-700 text-sm font-semibold">
              {(perfil.nombre || "U").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{perfil.nombre || "Usuario"}</div>
              <div className="text-xs text-muted capitalize">{perfil.rol}</div>
            </div>
          </Link>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <LogOut className="size-4.5" />
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
