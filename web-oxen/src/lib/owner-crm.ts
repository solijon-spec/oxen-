import { supabase } from "@/lib/supabase";

/* ============================================================
   Owner CRM — platform-level sales pipeline (Odoo CRM style).
   Leads move through stages: new -> contacted -> qualified ->
   proposition -> won / lost. Owner-only (RLS via is_owner()).
   Tables from migration 0023_owner_crm_leads.sql.

   Local-dev fallback: until that migration is applied to a real
   Supabase project, every read/write below transparently falls
   back to a localStorage mirror (same pattern as
   consulting-test-mode.ts) so the pipeline is still usable while
   building/reviewing the UI. Once the migration exists and the
   query succeeds, Supabase takes over automatically — nothing to
   flip manually.
   ============================================================ */

export type CrmStage = "new" | "contacted" | "qualified" | "proposition" | "won" | "lost";

export const CRM_STAGES: { value: CrmStage; label: string; accent: string }[] = [
  { value: "new", label: "New", accent: "bg-sky-400" },
  { value: "contacted", label: "Contacted", accent: "bg-blue-400" },
  { value: "qualified", label: "Qualified", accent: "bg-purple-400" },
  { value: "proposition", label: "Proposition", accent: "bg-amber-400" },
  { value: "won", label: "Won", accent: "bg-emerald-400" },
  { value: "lost", label: "Lost", accent: "bg-rose-400" },
];

export interface OwnerCrmLead {
  id: string;
  name: string;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  source: string | null;
  stage: CrmStage;
  expected_value: number;
  currency: string;
  probability: number;
  expected_close_date: string | null;
  assigned_owner_email: string | null;
  tags: string[];
  notes: string | null;
  lost_reason: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type OwnerCrmLeadInput = Partial<
  Omit<OwnerCrmLead, "id" | "created_at" | "updated_at" | "created_by">
> & { name: string };

export interface OwnerCrmActivityType {
  id: string;
  lead_id: string;
  type: "call" | "meeting" | "email" | "task" | "note";
  title: string;
  body: string | null;
  due_date: string | null;
  done: boolean;
  created_by: string | null;
  created_at: string;
}

export interface OwnerCrmStats {
  totalOpen: number;
  openValue: number;
  wonCount: number;
  wonValue: number;
  lostCount: number;
  winRate: number;
}

// ── Local-dev fallback store (localStorage) ──

const LEADS_KEY = "oxen.ownercrm.dev.leads";
const ACTIVITIES_KEY = "oxen.ownercrm.dev.activities";

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
    // ignore (private browsing / quota)
  }
}

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function localFetchLeads(): OwnerCrmLead[] {
  return readArr<OwnerCrmLead>(LEADS_KEY).sort((a, b) => b.created_at.localeCompare(a.created_at));
}

/** Dev-only: seeds a few sample leads the first time the local fallback is used, so the pipeline isn't empty. */
function seedLocalDevLeadsIfEmpty(): OwnerCrmLead[] {
  const existing = readArr<OwnerCrmLead>(LEADS_KEY);
  if (existing.length > 0 || !import.meta.env.DEV) return existing;
  const samples: OwnerCrmLeadInput[] = [
    { name: "Sardor Mirzaev", company_name: "Silk Road Travel", email: "sardor@silkroadtravel.uz", phone: "+998 90 123 45 67", source: "Referral", stage: "new", expected_value: 4800, probability: 10 },
    { name: "Lola Tashkentova", company_name: "EduPath Consulting", email: "lola@edupath.uz", phone: "+998 93 222 11 09", source: "Website", stage: "contacted", expected_value: 6200, probability: 25 },
    { name: "Feruza Nazarova", company_name: "Oriens Agency", email: "feruza@oriens.uz", phone: "+998 97 555 88 10", source: "Instagram ad", stage: "qualified", expected_value: 9000, probability: 45, notes: "Demo qilib berildi, shartnoma kutilmoqda." },
    { name: "Botir Ismoilov", company_name: "GlobalEdu Partners", email: "botir@globaledu.uz", phone: "+998 91 777 44 22", source: "Conference", stage: "proposition", expected_value: 12500, probability: 65 },
    { name: "Otabek Yunusov", company_name: "Apex Consulting", email: "otabek@apexconsulting.uz", phone: "+998 90 333 21 44", source: "Referral", stage: "won", expected_value: 14000, probability: 100 },
    { name: "Davron Nurmatov", company_name: "Horizon Agency", email: "davron@horizon.uz", phone: "+998 99 444 55 66", source: "Cold outreach", stage: "lost", expected_value: 5000, probability: 0, lost_reason: "Chose a competitor" },
  ];
  const now = Date.now();
  const rows: OwnerCrmLead[] = samples.map((s, i) => {
    const ts = new Date(now - (samples.length - i) * 86_400_000).toISOString();
    return {
      id: uid("lead"),
      name: s.name,
      company_name: s.company_name ?? null,
      email: s.email ?? null,
      phone: s.phone ?? null,
      source: s.source ?? null,
      stage: s.stage ?? "new",
      expected_value: s.expected_value ?? 0,
      currency: "USD",
      probability: s.probability ?? 20,
      expected_close_date: null,
      assigned_owner_email: null,
      tags: [],
      notes: s.notes ?? null,
      lost_reason: s.lost_reason ?? null,
      created_by: null,
      created_at: ts,
      updated_at: ts,
    };
  });
  writeArr(LEADS_KEY, rows);
  return rows;
}

function localCreateLead(input: OwnerCrmLeadInput, createdBy: string): OwnerCrmLead {
  const rows = readArr<OwnerCrmLead>(LEADS_KEY);
  const now = nowIso();
  const lead: OwnerCrmLead = {
    id: uid("lead"),
    name: input.name,
    company_name: input.company_name ?? null,
    email: input.email ?? null,
    phone: input.phone ?? null,
    source: input.source ?? null,
    stage: input.stage ?? "new",
    expected_value: input.expected_value ?? 0,
    currency: input.currency ?? "USD",
    probability: input.probability ?? 20,
    expected_close_date: input.expected_close_date ?? null,
    assigned_owner_email: input.assigned_owner_email ?? null,
    tags: input.tags ?? [],
    notes: input.notes ?? null,
    lost_reason: null,
    created_by: createdBy || null,
    created_at: now,
    updated_at: now,
  };
  rows.push(lead);
  writeArr(LEADS_KEY, rows);
  return lead;
}

function localUpdateLead(id: string, input: Partial<OwnerCrmLeadInput>): OwnerCrmLead | null {
  const rows = readArr<OwnerCrmLead>(LEADS_KEY);
  const idx = rows.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  rows[idx] = { ...rows[idx], ...input, updated_at: nowIso() };
  writeArr(LEADS_KEY, rows);
  return rows[idx];
}

function localDeleteLead(id: string): void {
  writeArr(LEADS_KEY, readArr<OwnerCrmLead>(LEADS_KEY).filter((r) => r.id !== id));
  writeArr(
    ACTIVITIES_KEY,
    readArr<OwnerCrmActivityType>(ACTIVITIES_KEY).filter((a) => a.lead_id !== id),
  );
}

function localFetchActivities(leadId: string): OwnerCrmActivityType[] {
  return readArr<OwnerCrmActivityType>(ACTIVITIES_KEY)
    .filter((a) => a.lead_id === leadId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

function localAddActivity(input: {
  leadId: string;
  type: OwnerCrmActivityType["type"];
  title: string;
  body?: string | null;
  dueDate?: string | null;
  createdBy: string;
}): OwnerCrmActivityType {
  const rows = readArr<OwnerCrmActivityType>(ACTIVITIES_KEY);
  const activity: OwnerCrmActivityType = {
    id: uid("activity"),
    lead_id: input.leadId,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    due_date: input.dueDate ?? null,
    done: false,
    created_by: input.createdBy || null,
    created_at: nowIso(),
  };
  rows.push(activity);
  writeArr(ACTIVITIES_KEY, rows);
  return activity;
}

function localToggleActivity(id: string, done: boolean): void {
  const rows = readArr<OwnerCrmActivityType>(ACTIVITIES_KEY);
  const idx = rows.findIndex((r) => r.id === id);
  if (idx === -1) return;
  rows[idx] = { ...rows[idx], done };
  writeArr(ACTIVITIES_KEY, rows);
}

// ── Public API (Supabase first, local-dev fallback on failure) ──

export async function fetchOwnerCrmLeads(): Promise<OwnerCrmLead[]> {
  const { data, error } = await supabase
    .from("owner_crm_leads")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    console.warn("owner_crm_leads unavailable, using local-dev fallback:", error.message);
    seedLocalDevLeadsIfEmpty();
    return localFetchLeads();
  }
  return (data ?? []) as unknown as OwnerCrmLead[];
}

export async function fetchOwnerCrmLead(id: string): Promise<OwnerCrmLead | null> {
  const { data, error } = await supabase
    .from("owner_crm_leads")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    return localFetchLeads().find((l) => l.id === id) ?? null;
  }
  return data as unknown as OwnerCrmLead | null;
}

export async function createOwnerCrmLead(
  input: OwnerCrmLeadInput,
  createdBy: string,
): Promise<OwnerCrmLead | null> {
  const { data, error } = await supabase
    .from("owner_crm_leads")
    .insert({
      name: input.name,
      company_name: input.company_name ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      source: input.source ?? null,
      stage: input.stage ?? "new",
      expected_value: input.expected_value ?? 0,
      currency: input.currency ?? "USD",
      probability: input.probability ?? 20,
      expected_close_date: input.expected_close_date ?? null,
      assigned_owner_email: input.assigned_owner_email ?? null,
      tags: input.tags ?? [],
      notes: input.notes ?? null,
      created_by: createdBy,
    })
    .select("*")
    .single();
  if (error) {
    console.warn("owner_crm_leads insert unavailable, using local-dev fallback:", error.message);
    return localCreateLead(input, createdBy);
  }
  return data as unknown as OwnerCrmLead;
}

export async function updateOwnerCrmLead(
  id: string,
  input: Partial<OwnerCrmLeadInput>,
): Promise<OwnerCrmLead | null> {
  const { data, error } = await supabase
    .from("owner_crm_leads")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) {
    return localUpdateLead(id, input);
  }
  return data as unknown as OwnerCrmLead;
}

export async function moveOwnerCrmLeadStage(id: string, stage: CrmStage): Promise<boolean> {
  const { error } = await supabase
    .from("owner_crm_leads")
    .update({ stage, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    return !!localUpdateLead(id, { stage });
  }
  return true;
}

export async function deleteOwnerCrmLead(id: string): Promise<boolean> {
  const { error } = await supabase.from("owner_crm_leads").delete().eq("id", id);
  if (error) {
    localDeleteLead(id);
    return true;
  }
  return true;
}

export function computeOwnerCrmStats(leads: OwnerCrmLead[]): OwnerCrmStats {
  const open = leads.filter((l) => l.stage !== "won" && l.stage !== "lost");
  const won = leads.filter((l) => l.stage === "won");
  const lost = leads.filter((l) => l.stage === "lost");
  const closed = won.length + lost.length;
  return {
    totalOpen: open.length,
    openValue: open.reduce((s, l) => s + (l.expected_value ?? 0), 0),
    wonCount: won.length,
    wonValue: won.reduce((s, l) => s + (l.expected_value ?? 0), 0),
    lostCount: lost.length,
    winRate: closed === 0 ? 0 : Math.round((won.length / closed) * 100),
  };
}

// ── Activities ──

export async function fetchOwnerCrmActivities(leadId: string): Promise<OwnerCrmActivityType[]> {
  const { data, error } = await supabase
    .from("owner_crm_activities")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });
  if (error) {
    return localFetchActivities(leadId);
  }
  return (data ?? []) as unknown as OwnerCrmActivityType[];
}

export async function addOwnerCrmActivity(input: {
  leadId: string;
  type: OwnerCrmActivityType["type"];
  title: string;
  body?: string | null;
  dueDate?: string | null;
  createdBy: string;
}): Promise<OwnerCrmActivityType | null> {
  const { data, error } = await supabase
    .from("owner_crm_activities")
    .insert({
      lead_id: input.leadId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      due_date: input.dueDate ?? null,
      created_by: input.createdBy,
    })
    .select("*")
    .single();
  if (error) {
    return localAddActivity(input);
  }
  return data as unknown as OwnerCrmActivityType;
}

export async function toggleOwnerCrmActivityDone(id: string, done: boolean): Promise<boolean> {
  const { error } = await supabase.from("owner_crm_activities").update({ done }).eq("id", id);
  if (error) {
    localToggleActivity(id, done);
    return true;
  }
  return true;
}
