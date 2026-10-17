import { supabase } from "@/lib/supabase";
import { fetchPosSales } from "@/lib/consulting-pos";

/* ============================================================
   Monthly KPI targets — per employee or per tour/destination
   type. Set by an admin in Settings, compared against actual
   POS sales (consulting-pos.ts) in Analytics.
   Table from migration 0026_consulting_kpi_targets.sql.

   Local-dev fallback: until that migration is applied, reads/
   writes fall back to a localStorage mirror (same pattern as
   owner-crm.ts / vacancies.ts), so the UI works before Supabase
   is connected.
   ============================================================ */

export type KpiTargetType = "employee" | "tour_type";

export interface KpiTarget {
  id: string;
  consulting_company_id: string;
  period: string; // 'YYYY-MM'
  target_type: KpiTargetType;
  employee_id: string | null;
  tour_type: string | null;
  target_amount: number;
  target_count: number | null;
  currency: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  /** Joined employee name (member targets only) */
  employee_name?: string | null;
}

export interface KpiProgress {
  target: KpiTarget;
  label: string;
  actual_amount: number;
  actual_count: number;
  percent: number;
}

export function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function periodRange(period: string): { from: string; to: string } {
  const [y, m] = period.split("-").map(Number);
  const from = new Date(y, m - 1, 1).toISOString();
  const to = new Date(y, m, 0, 23, 59, 59, 999).toISOString();
  return { from, to };
}

// ── Local-dev fallback store ──

const TARGETS_KEY = "oxen.kpi.dev.targets";

function readArr<T>(k: string): T[] {
  try {
    const raw = localStorage.getItem(k);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function writeArr<T>(k: string, rows: T[]): void {
  try {
    localStorage.setItem(k, JSON.stringify(rows));
  } catch {
    // ignore
  }
}

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function localFetchTargets(companyId: string, period: string): KpiTarget[] {
  return readArr<KpiTarget>(TARGETS_KEY).filter(
    (t) => t.consulting_company_id === companyId && t.period === period,
  );
}

// ── CRUD ──

export async function fetchKpiTargets(companyId: string, period: string): Promise<KpiTarget[]> {
  const { data, error } = await supabase
    .from("consulting_kpi_targets")
    .select("*, employee:profiles!consulting_kpi_targets_employee_id_fkey(name)")
    .eq("consulting_company_id", companyId)
    .eq("period", period)
    .order("created_at", { ascending: true });
  if (error) {
    console.warn("consulting_kpi_targets unavailable, using local-dev fallback:", error.message);
    return localFetchTargets(companyId, period);
  }
  return ((data ?? []) as unknown as (KpiTarget & { employee: { name: string | null } | null })[]).map((t) => ({
    ...t,
    employee_name: t.employee?.name ?? null,
  }));
}

export interface KpiTargetInput {
  period: string;
  target_type: KpiTargetType;
  employee_id?: string | null;
  employee_name?: string | null;
  tour_type?: string | null;
  target_amount: number;
  target_count?: number | null;
  currency?: string;
}

export async function upsertKpiTarget(
  companyId: string,
  createdBy: string,
  input: KpiTargetInput,
  existingId?: string,
): Promise<{ target: KpiTarget | null; error: string | null }> {
  const row = {
    consulting_company_id: companyId,
    period: input.period,
    target_type: input.target_type,
    employee_id: input.target_type === "employee" ? input.employee_id ?? null : null,
    tour_type: input.target_type === "tour_type" ? input.tour_type ?? null : null,
    target_amount: input.target_amount,
    target_count: input.target_count ?? null,
    currency: input.currency ?? "UZS",
    created_by: createdBy,
  };

  if (existingId) {
    const { data, error } = await supabase
      .from("consulting_kpi_targets")
      .update({ ...row, updated_at: new Date().toISOString() })
      .eq("id", existingId)
      .select("*")
      .single();
    if (error) {
      const rows = readArr<KpiTarget>(TARGETS_KEY);
      const idx = rows.findIndex((t) => t.id === existingId);
      if (idx === -1) return { target: null, error: error.message };
      rows[idx] = { ...rows[idx], ...row, employee_name: input.employee_name ?? null, updated_at: nowIso() };
      writeArr(TARGETS_KEY, rows);
      return { target: rows[idx], error: null };
    }
    return { target: data as unknown as KpiTarget, error: null };
  }

  const { data, error } = await supabase.from("consulting_kpi_targets").insert(row).select("*").single();
  if (error) {
    const now = nowIso();
    const target: KpiTarget = {
      id: uid("kpi"),
      ...row,
      employee_name: input.employee_name ?? null,
      created_at: now,
      updated_at: now,
    };
    const rows = readArr<KpiTarget>(TARGETS_KEY);
    rows.push(target);
    writeArr(TARGETS_KEY, rows);
    return { target, error: null };
  }
  return { target: data as unknown as KpiTarget, error: null };
}

export async function deleteKpiTarget(id: string): Promise<boolean> {
  const { error } = await supabase.from("consulting_kpi_targets").delete().eq("id", id);
  if (error) {
    writeArr(TARGETS_KEY, readArr<KpiTarget>(TARGETS_KEY).filter((t) => t.id !== id));
    return true;
  }
  return true;
}

// ── Progress: target vs actual POS sales for the period ──

export async function fetchKpiProgress(companyId: string, period: string): Promise<KpiProgress[]> {
  const targets = await fetchKpiTargets(companyId, period);
  if (targets.length === 0) return [];

  const { from, to } = periodRange(period);
  const sales = fetchPosSales(companyId, { dateFrom: from, dateTo: to }).filter((s) => s.sale_status !== "cancelled");

  return targets.map((target) => {
    const matching =
      target.target_type === "employee"
        ? sales.filter((s) => s.assigned_employee_id === target.employee_id)
        : sales.filter((s) => s.destination_country === target.tour_type);

    const actual_amount = matching.reduce((sum, s) => sum + (s.final_price ?? 0), 0);
    const actual_count = matching.length;
    const percent = target.target_amount > 0 ? Math.round((actual_amount / target.target_amount) * 100) : 0;
    const label =
      target.target_type === "employee" ? (target.employee_name ?? "Employee") : (target.tour_type ?? "Tour type");

    return { target, label, actual_amount, actual_count, percent };
  });
}
