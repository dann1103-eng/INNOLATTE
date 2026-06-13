/**
 * Importa "TOMA DE PEDIDOS.xlsx" a Supabase.
 *
 * Uso:
 *   1. Crea .env.local con NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.
 *   2. Coloca el Excel y pasa su ruta (o usa la ruta por defecto):
 *        npm run import:excel -- "C:/ruta/TOMA DE PEDIDOS.xlsx"
 *
 * Es idempotente: se puede correr varias veces (upsert por código).
 */
import "dotenv/config";
import { config as loadEnv } from "dotenv";
import path from "node:path";
import ExcelJS from "exceljs";
import { createClient } from "@supabase/supabase-js";

// Carga .env.local explícitamente (Next usa ese archivo).
loadEnv({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const EXCEL_PATH =
  process.argv[2] ||
  process.env.EXCEL_PATH ||
  "C:/Users/Daniel/Downloads/TOMA DE PEDIDOS.xlsx";

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "❌ Faltan variables. Define NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

// -------- Helpers para leer celdas de exceljs --------
function cellText(value: ExcelJS.CellValue): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (value instanceof Date) return value.toISOString();
  // Celda con fórmula: { formula, result }
  if (typeof value === "object" && "result" in value) {
    return cellText((value as ExcelJS.CellFormulaValue).result as ExcelJS.CellValue);
  }
  // Texto enriquecido: { richText: [...] }
  if (typeof value === "object" && "richText" in value) {
    return (value as ExcelJS.CellRichTextValue).richText
      .map((r) => r.text)
      .join("")
      .trim() || null;
  }
  if (typeof value === "object" && "text" in value) {
    return String((value as { text: string }).text).trim() || null;
  }
  return null;
}

function cellNumber(value: ExcelJS.CellValue): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return isFinite(value) ? value : null;
  if (typeof value === "object" && "result" in value) {
    return cellNumber((value as ExcelJS.CellFormulaValue).result as ExcelJS.CellValue);
  }
  const n = Number(cellText(value));
  return isFinite(n) ? n : null;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

const FORMAS_VALIDAS = new Set(["CONTADO", "CREDITO"]);

async function importClientes(wb: ExcelJS.Workbook) {
  const ws = wb.getWorksheet("BASE DATOS CLIENTES");
  if (!ws) throw new Error("No se encontró la hoja 'BASE DATOS CLIENTES'");

  const rows: Record<string, unknown>[] = [];
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // encabezado
    const c = (i: number) => row.getCell(i).value;
    const codigo = cellText(c(1));
    const nombre = cellText(c(2));
    if (!codigo || !nombre) return; // fila vacía

    const forma = (cellText(c(15)) || "").toUpperCase();
    rows.push({
      codigo_cliente: codigo,
      nombre,
      nombre_comercial: cellText(c(3)),
      telefono: cellText(c(4)),
      correo: cellText(c(5)),
      contacto_nombre: cellText(c(6)),
      contacto_telefono: cellText(c(7)),
      direccion_fiscal: cellText(c(8)),
      direccion_entrega: cellText(c(9)),
      departamento: cellText(c(10)),
      municipio: cellText(c(11)),
      distrito: cellText(c(12)),
      canal: cellText(c(13)),
      lista_precios: cellNumber(c(14)) ?? 2,
      forma_pago: FORMAS_VALIDAS.has(forma) ? forma : "CONTADO",
      activo: true,
    });
  });

  const { error } = await supabase
    .from("clientes")
    .upsert(rows, { onConflict: "codigo_cliente" });
  if (error) throw new Error(`Clientes: ${error.message}`);
  console.log(`✅ Clientes importados: ${rows.length}`);
}

async function importCatalogo(wb: ExcelJS.Workbook) {
  const ws = wb.getWorksheet("CATALOGO");
  if (!ws) throw new Error("No se encontró la hoja 'CATALOGO'");

  // Detecta las columnas de precio (encabezados P1, P2, ... P20) por su número.
  const header = ws.getRow(1);
  const priceCols: { col: number; lista: number }[] = [];
  header.eachCell((cell, col) => {
    const txt = cellText(cell.value);
    const m = txt && /^P(\d{1,2})$/.exec(txt);
    if (m) priceCols.push({ col, lista: Number(m[1]) });
  });

  const productos: Record<string, unknown>[] = [];
  const preciosPorCodigo = new Map<string, { lista: number; precio: number }[]>();

  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const c = (i: number) => row.getCell(i).value;
    const codigo = cellText(c(1));
    if (!codigo) return;

    // Recoge precios válidos (> 0).
    const precios: { lista: number; precio: number }[] = [];
    for (const { col, lista } of priceCols) {
      const p = cellNumber(c(col));
      if (p !== null && p > 0) precios.push({ lista, precio: round2(p) });
    }
    if (precios.length === 0) return; // fila sin precios = no es producto real

    productos.push({
      codigo,
      descripcion: cellText(c(2)) ?? codigo,
      categoria: cellText(c(3)),
      familia: cellText(c(5)),
      sabor: cellText(c(7)),
      presentacion: cellText(c(9)),
      peso_kg: cellNumber(c(11)),
      costo: cellNumber(c(12)),
      activo: true,
    });
    preciosPorCodigo.set(codigo, precios);
  });

  // Upsert de productos (devuelve ids).
  const { data: prodData, error: prodErr } = await supabase
    .from("productos")
    .upsert(productos, { onConflict: "codigo" })
    .select("id, codigo");
  if (prodErr) throw new Error(`Productos: ${prodErr.message}`);
  console.log(`✅ Productos importados: ${prodData?.length ?? 0}`);

  // Mapea codigo -> id e inserta precios.
  const idPorCodigo = new Map<string, string>();
  for (const p of prodData ?? []) idPorCodigo.set(p.codigo, p.id);

  const filasPrecios: { producto_id: string; lista: number; precio: number }[] = [];
  for (const [codigo, precios] of preciosPorCodigo) {
    const pid = idPorCodigo.get(codigo);
    if (!pid) continue;
    for (const { lista, precio } of precios) {
      filasPrecios.push({ producto_id: pid, lista, precio });
    }
  }

  const { error: precErr } = await supabase
    .from("producto_precios")
    .upsert(filasPrecios, { onConflict: "producto_id,lista" });
  if (precErr) throw new Error(`Precios: ${precErr.message}`);
  console.log(
    `✅ Precios importados: ${filasPrecios.length} (listas detectadas: ${priceCols
      .map((p) => "P" + p.lista)
      .join(", ")})`,
  );
}

async function main() {
  console.log(`📖 Leyendo: ${path.resolve(EXCEL_PATH)}`);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(EXCEL_PATH);

  await importClientes(wb);
  await importCatalogo(wb);

  console.log("\n🎉 Importación completada.");
}

main().catch((err) => {
  console.error("\n❌ Error en la importación:", err.message);
  process.exit(1);
});
