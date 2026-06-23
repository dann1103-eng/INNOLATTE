-- ============================================================
-- INNOLATTE · Precios con hasta 6 decimales
-- Pegar este archivo completo en: Supabase -> SQL Editor -> New query -> Run
-- ============================================================
-- Amplía la escala de las columnas de dinero de 2 a 6 decimales para poder
-- manejar precios finos (cuadrar el valor sin IVA con el valor con IVA exacto
-- de lo que se factura al cliente). No hay pérdida de datos: solo se aumenta la
-- precisión; los valores existentes (2 decimales) se conservan tal cual.
-- ============================================================

-- ---------- PRECIOS POR LISTA ----------
alter table public.producto_precios
  alter column precio type numeric(14,6);

-- ---------- PEDIDOS (cabecera) ----------
alter table public.pedidos
  alter column subtotal type numeric(16,6),
  alter column total    type numeric(16,6);

-- ---------- LÍNEAS DE PEDIDO (snapshot) ----------
alter table public.pedido_items
  alter column precio_unitario type numeric(14,6),
  alter column subtotal        type numeric(16,6);
