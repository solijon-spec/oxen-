import { supabase } from "@/lib/supabase";
import type { Json } from "@/integrations/supabase/types";

/* ============================================================
   Client <-> Agency messaging.
   Backed by `consulting_messages` (schema from migration 0001,
   RLS tightened + Realtime enabled by migration 0025).

   A "thread" is identified by `client_id` (a consulting_clients
   row). Site visitors get one thread per agency (self-serve lead
   created via requestAgencyContact); agency staff reply from the
   dashboard's "Messages" page.

   Local-dev fallback: until migration 0025 is applied to a real
   Supabase project, every read/write below transparently falls
   back to a localStorage mirror (same pattern as owner-crm.ts /
   vacancies.ts) so the feature is usable while reviewing the UI.
   ============================================================ */

export type MessageSenderRole = "employee" | "client";

export interface ConsultingMessage {
  id: string;
  consulting_company_id: string;
  client_id: string;
  sender_id: string;
  sender_role: MessageSenderRole;
  body: string | null;
  attachments: Json;
  read_at: string | null;
  created_at: string;
}

export interface ClientThread {
  client_id: string;
  consulting_company_id: string;
  client_name: string;
  client_photo_url: string | null;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
}

export interface AgencyThread {
  client_id: string;
  consulting_company_id: string;
  company_name: string;
  company_logo_url: string | null;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
}

// ── Local-dev fallback store (localStorage) ──

const MESSAGES_KEY = "oxen.messages.dev.rows";
const LEADS_KEY = "oxen.messages.dev.leads"; // { id, consulting_company_id, user_id, full_name, email, phone }[]

// Same local-dev fallback ids used by CrmPipeline.tsx/Workers.tsx/Messages.tsx
// (company) and AgencyMessages.tsx (visitor), so a fresh browser with no real
// Supabase session still has something to look at.
const DEV_LOCAL_COMPANY_ID = "dev-local-company";
export const DEV_LOCAL_USER_ID = "dev-local-visitor";

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

interface LocalLeadRow {
  id: string;
  consulting_company_id: string;
  user_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  company_name: string;
  company_logo_url: string | null;
}

function localFindOrCreateLead(input: {
  companyId: string;
  companyName: string;
  companyLogoUrl: string | null;
  userId: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
}): LocalLeadRow {
  const rows = readArr<LocalLeadRow>(LEADS_KEY);
  const existing = rows.find((r) => r.consulting_company_id === input.companyId && r.user_id === input.userId);
  if (existing) return existing;
  const row: LocalLeadRow = {
    id: uid("lead"),
    consulting_company_id: input.companyId,
    user_id: input.userId,
    full_name: input.fullName,
    email: input.email ?? null,
    phone: input.phone ?? null,
    company_name: input.companyName,
    company_logo_url: input.companyLogoUrl,
  };
  rows.push(row);
  writeArr(LEADS_KEY, rows);
  return row;
}

function localInsertMessage(input: {
  companyId: string;
  clientId: string;
  senderId: string;
  senderRole: MessageSenderRole;
  body: string;
}): ConsultingMessage {
  const rows = readArr<ConsultingMessage>(MESSAGES_KEY);
  const msg: ConsultingMessage = {
    id: uid("msg"),
    consulting_company_id: input.companyId,
    client_id: input.clientId,
    sender_id: input.senderId,
    sender_role: input.senderRole,
    body: input.body,
    attachments: [],
    read_at: null,
    created_at: nowIso(),
  };
  rows.push(msg);
  writeArr(MESSAGES_KEY, rows);
  return msg;
}

/** Dev-only: seeds one sample thread (lead + a few messages) the first time the local fallback is used, so Messages pages aren't empty. */
function seedLocalDevMessagesIfEmpty(): void {
  if (!import.meta.env.DEV) return;
  const leads = readArr<LocalLeadRow>(LEADS_KEY);
  if (leads.some((l) => l.consulting_company_id === DEV_LOCAL_COMPANY_ID && l.user_id === DEV_LOCAL_USER_ID)) return;

  const lead = localFindOrCreateLead({
    companyId: DEV_LOCAL_COMPANY_ID,
    companyName: "Silk Road Travel",
    companyLogoUrl: null,
    userId: DEV_LOCAL_USER_ID,
    fullName: "Sevinch Qobilova",
    email: "sevinch@example.uz",
    phone: "+998 90 123 45 67",
  });

  const now = Date.now();
  const script: { role: MessageSenderRole; body: string; minsAgo: number }[] = [
    { role: "client", body: "Salom! Men Germaniyaga o'qishga ketish bo'yicha tur paketi haqida qiziqib qoldim.", minsAgo: 180 },
    { role: "employee", body: "Assalomu alaykum, Sevinch! Albatta, qaysi shahar va qaysi dasturga qiziqasiz?", minsAgo: 170 },
    { role: "client", body: "Berlin, bakalavriat darajasida. Narxi va muddatlari haqida ma'lumot bera olasizmi?", minsAgo: 160 },
    { role: "employee", body: "Hozir to'liq ma'lumot va narxlarni jo'natamiz. Ertaga bepul konsultatsiyaga kelishingiz mumkin.", minsAgo: 30 },
  ];
  for (const s of script) {
    const row: ConsultingMessage = {
      id: uid("msg"),
      consulting_company_id: DEV_LOCAL_COMPANY_ID,
      client_id: lead.id,
      sender_id: s.role === "client" ? DEV_LOCAL_USER_ID : "dev-local-staff",
      sender_role: s.role,
      body: s.body,
      attachments: [],
      read_at: s.minsAgo > 60 ? new Date(now - s.minsAgo * 60_000).toISOString() : null,
      created_at: new Date(now - s.minsAgo * 60_000).toISOString(),
    };
    const rows = readArr<ConsultingMessage>(MESSAGES_KEY);
    rows.push(row);
    writeArr(MESSAGES_KEY, rows);
  }
}

// ── Agency-initiated contact: find-or-create lead + first message ──

export async function requestAgencyContact(input: {
  companyId: string;
  companyName: string;
  companyLogoUrl: string | null;
  userId: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  serviceId?: string | null;
  message: string;
}): Promise<{ clientId: string | null; error: string | null }> {
  // 1. Find-or-create the lead (self-serve upsert on the unique
  // (company, user) index added by migration 0025).
  const { data: client, error: upsertErr } = await supabase
    .from("consulting_clients")
    .upsert(
      {
        consulting_company_id: input.companyId,
        user_id: input.userId,
        full_name: input.fullName,
        email: input.email ?? null,
        phone: input.phone ?? null,
        service_id: input.serviceId ?? null,
        application_status: "new_lead",
      },
      { onConflict: "consulting_company_id,user_id", ignoreDuplicates: false },
    )
    .select("id")
    .single();

  let clientId = (client as { id: string } | null)?.id ?? null;

  if (upsertErr || !clientId) {
    console.warn("requestAgencyContact: consulting_clients unavailable, using local-dev fallback:", upsertErr?.message);
    const lead = localFindOrCreateLead({
      companyId: input.companyId,
      companyName: input.companyName,
      companyLogoUrl: input.companyLogoUrl,
      userId: input.userId,
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
    });
    clientId = lead.id;
  }

  // 2. Send the opening message.
  const { error: msgErr } = await supabase.from("consulting_messages").insert({
    consulting_company_id: input.companyId,
    client_id: clientId,
    sender_id: input.userId,
    sender_role: "client",
    body: input.message,
  });
  if (msgErr) {
    localInsertMessage({ companyId: input.companyId, clientId, senderId: input.userId, senderRole: "client", body: input.message });
  }

  return { clientId, error: null };
}

// ── Thread messages ──

export async function fetchThreadMessages(clientId: string): Promise<ConsultingMessage[]> {
  const { data, error } = await supabase
    .from("consulting_messages")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: true });
  if (error) {
    console.warn("fetchThreadMessages: using local-dev fallback:", error.message);
    return readArr<ConsultingMessage>(MESSAGES_KEY)
      .filter((m) => m.client_id === clientId)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  }
  return (data ?? []) as unknown as ConsultingMessage[];
}

export async function sendMessage(input: {
  companyId: string;
  clientId: string;
  senderId: string;
  senderRole: MessageSenderRole;
  body: string;
}): Promise<ConsultingMessage | null> {
  const { data, error } = await supabase
    .from("consulting_messages")
    .insert({
      consulting_company_id: input.companyId,
      client_id: input.clientId,
      sender_id: input.senderId,
      sender_role: input.senderRole,
      body: input.body,
    })
    .select("*")
    .single();
  if (error) {
    console.warn("sendMessage: using local-dev fallback:", error.message);
    return localInsertMessage(input);
  }
  return data as unknown as ConsultingMessage;
}

/** Marks the OTHER party's messages in this thread as read. */
export async function markThreadRead(clientId: string, readerRole: MessageSenderRole): Promise<void> {
  const otherRole: MessageSenderRole = readerRole === "employee" ? "client" : "employee";
  const { error } = await supabase
    .from("consulting_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("client_id", clientId)
    .eq("sender_role", otherRole)
    .is("read_at", null);
  if (error) {
    const rows = readArr<ConsultingMessage>(MESSAGES_KEY);
    let changed = false;
    for (const m of rows) {
      if (m.client_id === clientId && m.sender_role === otherRole && !m.read_at) {
        m.read_at = nowIso();
        changed = true;
      }
    }
    if (changed) writeArr(MESSAGES_KEY, rows);
  }
}

export function subscribeToThread(clientId: string, onMessage: () => void): () => void {
  const channel = supabase
    .channel(`consulting-thread:${clientId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "consulting_messages", filter: `client_id=eq.${clientId}` },
      onMessage,
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "consulting_messages", filter: `client_id=eq.${clientId}` },
      onMessage,
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

// ── Agency dashboard: list of client threads ──

export async function fetchCompanyThreads(companyId: string): Promise<ClientThread[]> {
  const { data: clients, error: clientsErr } = await supabase
    .from("consulting_clients")
    .select("id, full_name, photo_url")
    .eq("consulting_company_id", companyId);
  if (clientsErr) {
    console.warn("fetchCompanyThreads: using local-dev fallback:", clientsErr.message);
    return localFetchCompanyThreads(companyId);
  }
  const clientRows = (clients ?? []) as { id: string; full_name: string; photo_url: string | null }[];
  if (clientRows.length === 0) return [];

  const { data: messages, error: msgErr } = await supabase
    .from("consulting_messages")
    .select("client_id, body, sender_role, read_at, created_at")
    .eq("consulting_company_id", companyId)
    .order("created_at", { ascending: true });
  if (msgErr) {
    console.warn("fetchCompanyThreads: messages unavailable, using local-dev fallback:", msgErr.message);
    return localFetchCompanyThreads(companyId);
  }

  const byClient = new Map<string, { body: string | null; at: string }[]>();
  const unread = new Map<string, number>();
  for (const m of (messages ?? []) as { client_id: string; body: string | null; sender_role: string; read_at: string | null; created_at: string }[]) {
    if (!byClient.has(m.client_id)) byClient.set(m.client_id, []);
    byClient.get(m.client_id)!.push({ body: m.body, at: m.created_at });
    if (m.sender_role === "client" && !m.read_at) {
      unread.set(m.client_id, (unread.get(m.client_id) ?? 0) + 1);
    }
  }

  return clientRows
    .map((c) => {
      const msgs = byClient.get(c.id) ?? [];
      const last = msgs[msgs.length - 1];
      return {
        client_id: c.id,
        consulting_company_id: companyId,
        client_name: c.full_name,
        client_photo_url: c.photo_url,
        last_message: last?.body ?? null,
        last_message_at: last?.at ?? null,
        unread_count: unread.get(c.id) ?? 0,
      };
    })
    .filter((t) => t.last_message !== null)
    .sort((a, b) => (b.last_message_at ?? "").localeCompare(a.last_message_at ?? ""));
}

function localFetchCompanyThreads(companyId: string): ClientThread[] {
  seedLocalDevMessagesIfEmpty();
  const leads = readArr<LocalLeadRow>(LEADS_KEY).filter((l) => l.consulting_company_id === companyId);
  const messages = readArr<ConsultingMessage>(MESSAGES_KEY).filter((m) => m.consulting_company_id === companyId);
  return leads
    .map((l) => {
      const msgs = messages.filter((m) => m.client_id === l.id).sort((a, b) => a.created_at.localeCompare(b.created_at));
      const last = msgs[msgs.length - 1];
      const unread = msgs.filter((m) => m.sender_role === "client" && !m.read_at).length;
      return {
        client_id: l.id,
        consulting_company_id: companyId,
        client_name: l.full_name,
        client_photo_url: null,
        last_message: last?.body ?? null,
        last_message_at: last?.created_at ?? null,
        unread_count: unread,
      };
    })
    .filter((t) => t.last_message !== null)
    .sort((a, b) => (b.last_message_at ?? "").localeCompare(a.last_message_at ?? ""));
}

// ── Site-visitor side: list of agency threads ──

export async function fetchMyAgencyThreads(userId: string): Promise<AgencyThread[]> {
  const { data: clients, error: clientsErr } = await supabase
    .from("consulting_clients")
    .select("id, consulting_company_id, company:consulting_companies!consulting_clients_consulting_company_id_fkey(name,logo_url)")
    .eq("user_id", userId);
  if (clientsErr) {
    console.warn("fetchMyAgencyThreads: using local-dev fallback:", clientsErr.message);
    return localFetchMyAgencyThreads(userId);
  }
  const clientRows = (clients ?? []) as unknown as {
    id: string;
    consulting_company_id: string;
    company: { name: string; logo_url: string | null } | null;
  }[];
  if (clientRows.length === 0) return [];

  const clientIds = clientRows.map((c) => c.id);
  const { data: messages, error: msgErr } = await supabase
    .from("consulting_messages")
    .select("client_id, body, sender_role, read_at, created_at")
    .in("client_id", clientIds)
    .order("created_at", { ascending: true });
  if (msgErr) {
    console.warn("fetchMyAgencyThreads: messages unavailable, using local-dev fallback:", msgErr.message);
    return localFetchMyAgencyThreads(userId);
  }

  const byClient = new Map<string, { body: string | null; at: string }[]>();
  const unread = new Map<string, number>();
  for (const m of (messages ?? []) as { client_id: string; body: string | null; sender_role: string; read_at: string | null; created_at: string }[]) {
    if (!byClient.has(m.client_id)) byClient.set(m.client_id, []);
    byClient.get(m.client_id)!.push({ body: m.body, at: m.created_at });
    if (m.sender_role === "employee" && !m.read_at) {
      unread.set(m.client_id, (unread.get(m.client_id) ?? 0) + 1);
    }
  }

  return clientRows.map((c) => {
    const msgs = byClient.get(c.id) ?? [];
    const last = msgs[msgs.length - 1];
    return {
      client_id: c.id,
      consulting_company_id: c.consulting_company_id,
      company_name: c.company?.name ?? "Agency",
      company_logo_url: c.company?.logo_url ?? null,
      last_message: last?.body ?? null,
      last_message_at: last?.at ?? null,
      unread_count: unread.get(c.id) ?? 0,
    };
  }).sort((a, b) => (b.last_message_at ?? "").localeCompare(a.last_message_at ?? ""));
}

function localFetchMyAgencyThreads(userId: string): AgencyThread[] {
  seedLocalDevMessagesIfEmpty();
  const leads = readArr<LocalLeadRow>(LEADS_KEY).filter((l) => l.user_id === userId);
  const messages = readArr<ConsultingMessage>(MESSAGES_KEY);
  return leads.map((l) => {
    const msgs = messages.filter((m) => m.client_id === l.id).sort((a, b) => a.created_at.localeCompare(b.created_at));
    const last = msgs[msgs.length - 1];
    const unread = msgs.filter((m) => m.sender_role === "employee" && !m.read_at).length;
    return {
      client_id: l.id,
      consulting_company_id: l.consulting_company_id,
      company_name: l.company_name,
      company_logo_url: l.company_logo_url,
      last_message: last?.body ?? null,
      last_message_at: last?.created_at ?? null,
      unread_count: unread,
    };
  }).sort((a, b) => (b.last_message_at ?? "").localeCompare(a.last_message_at ?? ""));
}
