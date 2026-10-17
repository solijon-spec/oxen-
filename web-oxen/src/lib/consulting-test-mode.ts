import type { Json } from "@/integrations/supabase/types";
import type {
  ConsultingClient,
  ConsultingClientNote,
  ConsultingClientStatusHistory,
  ConsultingApplication,
  ConsultingApplicationHistory,
  ConsultingPackage,
  ConsultingPackageMedia,
  ConsultingActivityLog,
  ConsultingMember,
  ConsultingInvitation,
  EmployeeStats,
  AnalyticsStats,
  MemberRole,
  MemberStatus,
  ClientApplicationStatus,
  ApplicationStatus,
  PaymentStatus,
  FinalResult,
} from "@/lib/consulting";

/* ============================================================
   Consulting Test-Mode data layer (localStorage)
   ------------------------------------------------
   When Supabase consulting tables are NOT yet applied
   (ConsultingContext `isTestMode === true`), the Phase 4 pages
   read/write through this module instead of Supabase. All data
   is kept in localStorage under the company's test id so the
   dashboard remains fully usable in test mode.

   Storage keys:
     oxen.consulting.test.<companyId>.packages
     oxen.consulting.test.<companyId>.packageMedia
     oxen.consulting.test.<companyId>.clients
     oxen.consulting.test.<companyId>.clientNotes
     oxen.consulting.test.<companyId>.clientHistory
     oxen.consulting.test.<companyId>.applications
     oxen.consulting.test.<companyId>.applicationHistory

   Each write also publishes a synthetic event so React Query
   `queryCache` can be invalidated by callers (we expose a
   `subscribeTestMode` helper, but simpler: callers just bump
   a state counter after writes).
   ============================================================ */

const PREFIX = "oxen.consulting.test";

function key(companyId: string, kind: string): string {
  return `${PREFIX}.${companyId}.${kind}`;
}

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
  } catch (e) {
    console.error("test-mode write failed", k, e);
  }
}

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

// ── Packages ──────────────────────────────────────────────

export interface TestPackageInput {
  title: string;
  description: string;
  category: string;
  destination_country: string;
  price: number;
  currency: string;
  duration: string;
  estimated_processing_time: string;
  long_description: string;
  cover_image: string;
  gallery: string[];
  video_url: string;
  included_services: string[];
  requirements: string[];
  required_documents: string[];
  benefits: string[];
  who_this_is_for: string;
  refund_conditions: string;
  faq: { question: string; answer: string }[];
  available_slots: string;
  is_published: boolean;
}

export function testFetchPackages(companyId: string): ConsultingPackage[] {
  const rows = readArr<ConsultingPackage>(key(companyId, "packages"));
  return rows.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

export function testFetchPackage(companyId: string, packageId: string): ConsultingPackage | null {
  return testFetchPackages(companyId).find((p) => p.id === packageId) ?? null;
}

export function testUpsertPackage(
  companyId: string,
  input: TestPackageInput,
  createdBy: string,
  existingId?: string,
): ConsultingPackage {
  const k = key(companyId, "packages");
  const rows = readArr<ConsultingPackage>(k);
  const now = nowIso();

  // We store the "service-like" fields directly on the package row as
  // a synthetic `service` joined object so the UI doesn't need a real
  // services table. The ConsultingPackage type already supports a
  // `service` field.
  if (existingId) {
    const idx = rows.findIndex((r) => r.id === existingId);
    if (idx === -1) throw new Error("Package not found");
    const prev = rows[idx];
    const updated: ConsultingPackage = {
      ...prev,
      destination_country: input.destination_country || null,
      estimated_processing_time: input.estimated_processing_time || null,
      included_services: input.included_services as unknown as Json,
      required_documents: input.required_documents as unknown as Json,
      what_client_receives: input.benefits as unknown as Json,
      who_this_is_for: input.who_this_is_for || null,
      refund_conditions: input.refund_conditions || null,
      contact_info: { video_url: input.video_url || null, long_description: input.long_description || null } as unknown as Json,
      available_slots: input.available_slots ? parseInt(input.available_slots, 10) : null,
      faq: input.faq as unknown as Json,
      is_published: input.is_published,
      updated_at: now,
      service: {
        id: prev.service?.id ?? prev.id,
        title: input.title,
        description: input.description,
        cover_image: input.cover_image || null,
        price: input.price,
        currency: input.currency,
        category: input.category,
        is_active: true,
      },
    };
    rows[idx] = updated;
    writeArr(k, rows);
    return updated;
  }

  const id = uid("pkg");
  const pkg: ConsultingPackage = {
    id,
    consulting_company_id: companyId,
    service_id: id, // synthetic link to itself
    destination_country: input.destination_country || null,
    estimated_processing_time: input.estimated_processing_time || null,
    included_services: input.included_services as unknown as Json,
    required_documents: input.required_documents as unknown as Json,
    what_client_receives: input.benefits as unknown as Json,
    who_this_is_for: input.who_this_is_for || null,
    refund_conditions: input.refund_conditions || null,
    contact_info: { video_url: input.video_url || null, long_description: input.long_description || null } as unknown as Json,
    available_slots: input.available_slots ? parseInt(input.available_slots, 10) : null,
    faq: input.faq as unknown as Json,
    is_published: input.is_published,
    created_at: now,
    updated_at: now,
    created_by: createdBy,
    service: {
      id,
      title: input.title,
      description: input.description,
      cover_image: input.cover_image || null,
      price: input.price,
      currency: input.currency,
      category: input.category,
      is_active: true,
    },
  };
  rows.push(pkg);
  writeArr(k, rows);
  return pkg;
}

export function testDuplicatePackage(
  companyId: string,
  source: ConsultingPackage,
  createdBy: string,
): ConsultingPackage | null {
  const srcService = source.service;
  if (!srcService) return null;
  const copy = testUpsertPackage(
    companyId,
    {
      title: `${srcService.title} (Copy)`,
      description: srcService.description,
      category: srcService.category,
      destination_country: source.destination_country ?? "",
      price: srcService.price,
      currency: srcService.currency,
      duration: "",
      estimated_processing_time: source.estimated_processing_time ?? "",
      long_description: (source.contact_info as { long_description?: string } | null)?.long_description ?? "",
      cover_image: srcService.cover_image ?? "",
      gallery: testFetchPackageMedia(companyId, source.id)
        .filter((m) => m.kind === "image")
        .map((m) => m.url),
      video_url: (source.contact_info as { video_url?: string } | null)?.video_url ?? "",
      included_services: (source.included_services as unknown as string[]) ?? [],
      requirements: [],
      required_documents: (source.required_documents as unknown as string[]) ?? [],
      benefits: (source.what_client_receives as unknown as string[]) ?? [],
      who_this_is_for: source.who_this_is_for ?? "",
      refund_conditions: source.refund_conditions ?? "",
      faq: (source.faq as unknown as { question: string; answer: string }[]) ?? [],
      available_slots: source.available_slots?.toString() ?? "",
      is_published: false,
    },
    createdBy,
  );
  // Copy media too
  const media = testFetchPackageMedia(companyId, source.id);
  for (const m of media) {
    testAddPackageMedia(companyId, copy.id, { kind: m.kind, url: m.url, title: m.title, position: m.position }, createdBy);
  }
  return copy;
}

export function testDeletePackage(companyId: string, packageId: string): boolean {
  const k = key(companyId, "packages");
  const rows = readArr<ConsultingPackage>(k).filter((p) => p.id !== packageId);
  writeArr(k, rows);
  // also drop media
  writeArr(
    key(companyId, "packageMedia"),
    testFetchPackageMedia(companyId, packageId).filter(() => false),
  );
  return true;
}

export function testSetPackagePublished(companyId: string, packageId: string, published: boolean): boolean {
  const k = key(companyId, "packages");
  const rows = readArr<ConsultingPackage>(k);
  const idx = rows.findIndex((r) => r.id === packageId);
  if (idx === -1) return false;
  rows[idx] = { ...rows[idx], is_published: published, updated_at: nowIso() };
  writeArr(k, rows);
  return true;
}

// ── Package media ─────────────────────────────────────────

export function testFetchPackageMedia(companyId: string, packageId: string): ConsultingPackageMedia[] {
  const rows = readArr<ConsultingPackageMedia>(key(companyId, "packageMedia"));
  return rows
    .filter((m) => m.package_id === packageId)
    .sort((a, b) => a.position - b.position);
}

export function testAddPackageMedia(
  companyId: string,
  packageId: string,
  input: { kind: "image" | "video"; url: string; title?: string | null; position?: number },
  createdBy: string,
): ConsultingPackageMedia {
  const k = key(companyId, "packageMedia");
  const rows = readArr<ConsultingPackageMedia>(k);
  const now = nowIso();
  const media: ConsultingPackageMedia = {
    id: uid("media"),
    consulting_company_id: companyId,
    package_id: packageId,
    kind: input.kind,
    url: input.url,
    title: input.title ?? null,
    position: input.position ?? rows.filter((m) => m.package_id === packageId).length,
    created_by: createdBy,
    created_at: now,
    updated_at: now,
  };
  rows.push(media);
  writeArr(k, rows);
  return media;
}

export function testRemovePackageMedia(companyId: string, mediaId: string): boolean {
  const k = key(companyId, "packageMedia");
  const rows = readArr<ConsultingPackageMedia>(k).filter((m) => m.id !== mediaId);
  writeArr(k, rows);
  return true;
}

export function testClearPackageMedia(companyId: string, packageId: string): boolean {
  const k = key(companyId, "packageMedia");
  const rows = readArr<ConsultingPackageMedia>(k).filter((m) => m.package_id !== packageId);
  writeArr(k, rows);
  return true;
}

// ── Clients ───────────────────────────────────────────────

export interface TestClientInput {
  full_name: string;
  phone: string;
  email: string;
  destination_country: string;
  assigned_employee_id: string;
  application_status: ClientApplicationStatus;
  payment_status: PaymentStatus;
  final_result: FinalResult;
  service_id?: string | null;
  purchase_date?: string | null;
}

export function testFetchClients(
  companyId: string,
  opts: {
    search?: string;
    status?: ClientApplicationStatus | "all";
    archived?: boolean;
  } = {},
): ConsultingClient[] {
  let rows = readArr<ConsultingClient>(key(companyId, "clients"));
  if (opts.archived === undefined) {
    rows = rows.filter((r) => !r.is_archived);
  } else {
    rows = rows.filter((r) => r.is_archived === opts.archived);
  }
  if (opts.status && opts.status !== "all") {
    rows = rows.filter((r) => r.application_status === opts.status);
  }
  if (opts.search?.trim()) {
    const q = opts.search.toLowerCase();
    rows = rows.filter(
      (r) =>
        r.full_name.toLowerCase().includes(q) ||
        (r.email ?? "").toLowerCase().includes(q) ||
        (r.phone ?? "").toLowerCase().includes(q),
    );
  }
  return rows.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

export function testFetchClient(companyId: string, clientId: string): ConsultingClient | null {
  return readArr<ConsultingClient>(key(companyId, "clients")).find((c) => c.id === clientId) ?? null;
}

export function testCreateClient(
  companyId: string,
  input: TestClientInput,
  createdBy: string,
): ConsultingClient {
  const k = key(companyId, "clients");
  const rows = readArr<ConsultingClient>(k);
  const now = nowIso();
  const client: ConsultingClient = {
    id: uid("client"),
    consulting_company_id: companyId,
    user_id: null,
    full_name: input.full_name,
    phone: input.phone || null,
    email: input.email || null,
    photo_url: null,
    service_id: input.service_id ?? null,
    destination_country: input.destination_country || null,
    assigned_employee_id: input.assigned_employee_id || null,
    purchase_date: input.purchase_date ?? null,
    payment_status: input.payment_status,
    application_status: input.application_status,
    final_result: input.final_result,
    last_activity_at: now,
    is_archived: false,
    metadata: {} as Json,
    created_at: now,
    updated_at: now,
    created_by: createdBy,
  };
  rows.push(client);
  writeArr(k, rows);
  return client;
}

export function testUpdateClient(companyId: string, clientId: string, patch: Partial<ConsultingClient>): ConsultingClient | null {
  const k = key(companyId, "clients");
  const rows = readArr<ConsultingClient>(k);
  const idx = rows.findIndex((r) => r.id === clientId);
  if (idx === -1) return null;
  rows[idx] = { ...rows[idx], ...patch, updated_at: nowIso() };
  writeArr(k, rows);
  return rows[idx];
}

export function testArchiveClient(companyId: string, clientId: string, archive: boolean): boolean {
  const updated = testUpdateClient(companyId, clientId, { is_archived: archive });
  return !!updated;
}

export function testUpdateClientStatus(
  companyId: string,
  clientId: string,
  newStatus: ClientApplicationStatus,
  changedBy: string,
  note?: string,
): boolean {
  const client = testFetchClient(companyId, clientId);
  if (!client) return false;
  const previous = client.application_status;
  if (previous === newStatus) return true;
  testUpdateClient(companyId, clientId, { application_status: newStatus, last_activity_at: nowIso() });
  const k = key(companyId, "clientHistory");
  const rows = readArr<ConsultingClientStatusHistory>(k);
  rows.push({
    id: uid("hist"),
    consulting_company_id: companyId,
    client_id: clientId,
    previous_status: previous,
    new_status: newStatus,
    changed_by: changedBy,
    note: note ?? null,
    created_at: nowIso(),
    changed_by_profile: { name: "You", avatar_url: null },
  });
  writeArr(k, rows);
  return true;
}

// ── Client notes ──────────────────────────────────────────

export function testFetchClientNotes(companyId: string, clientId: string): ConsultingClientNote[] {
  return readArr<ConsultingClientNote>(key(companyId, "clientNotes"))
    .filter((n) => n.client_id === clientId)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

export function testAddClientNote(
  companyId: string,
  clientId: string,
  authorId: string,
  body: string,
  isInternal = true,
): ConsultingClientNote {
  const k = key(companyId, "clientNotes");
  const rows = readArr<ConsultingClientNote>(k);
  const now = nowIso();
  const note: ConsultingClientNote = {
    id: uid("note"),
    consulting_company_id: companyId,
    client_id: clientId,
    author_id: authorId,
    body,
    is_internal: isInternal,
    created_at: now,
    updated_at: now,
    author: { name: "You", avatar_url: null },
  };
  rows.push(note);
  writeArr(k, rows);
  return note;
}

// ── Client status history ─────────────────────────────────

export function testFetchClientStatusHistory(companyId: string, clientId: string): ConsultingClientStatusHistory[] {
  return readArr<ConsultingClientStatusHistory>(key(companyId, "clientHistory"))
    .filter((h) => h.client_id === clientId)
    .sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
}

// ── Applications ──────────────────────────────────────────

export interface TestApplicationInput {
  client_id: string;
  service_id?: string | null;
  destination_country?: string | null;
  application_type?: string | null;
  assigned_employee_id?: string | null;
  expected_completion_date?: string | null;
}

export function testFetchApplications(
  companyId: string,
  opts: { status?: ApplicationStatus | "all"; search?: string } = {},
): ConsultingApplication[] {
  let rows = readArr<ConsultingApplication>(key(companyId, "applications"));
  // Attach client/service joins for rendering
  const clients = readArr<ConsultingClient>(key(companyId, "clients"));
  const packages = readArr<ConsultingPackage>(key(companyId, "packages"));
  rows = rows.map((a) => ({
    ...a,
    client: clients.find((c) => c.id === a.client_id) ?? null,
    service: packages.find((p) => p.id === a.service_id)?.service ?? null,
  }));
  if (opts.status && opts.status !== "all") {
    rows = rows.filter((r) => r.status === opts.status);
  }
  if (opts.search?.trim()) {
    const q = opts.search.toLowerCase();
    rows = rows.filter(
      (r) =>
        (r.application_type ?? "").toLowerCase().includes(q) ||
        (r.destination_country ?? "").toLowerCase().includes(q) ||
        (r.client?.full_name ?? "").toLowerCase().includes(q),
    );
  }
  return rows.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

export function testCreateApplication(
  companyId: string,
  input: TestApplicationInput,
  createdBy: string,
): ConsultingApplication {
  const k = key(companyId, "applications");
  const rows = readArr<ConsultingApplication>(k);
  const now = nowIso();
  const app: ConsultingApplication = {
    id: uid("app"),
    consulting_company_id: companyId,
    client_id: input.client_id,
    service_id: input.service_id ?? null,
    destination_country: input.destination_country ?? null,
    application_type: input.application_type ?? null,
    assigned_employee_id: input.assigned_employee_id ?? null,
    submission_date: null,
    expected_completion_date: input.expected_completion_date ?? null,
    status: "new",
    required_documents: [] as unknown as Json,
    uploaded_documents: [] as unknown as Json,
    internal_notes: null,
    client_visible_updates: null,
    final_decision: null,
    failure_reason: null,
    created_at: now,
    updated_at: now,
    created_by: createdBy,
  };
  rows.push(app);
  writeArr(k, rows);
  return app;
}

export function testUpdateApplicationStatus(
  companyId: string,
  application: ConsultingApplication,
  newStatus: ApplicationStatus,
  changedBy: string,
  note?: string,
): void {
  const previous = application.status;
  if (previous === newStatus) return;
  const k = key(companyId, "applications");
  const rows = readArr<ConsultingApplication>(k);
  const idx = rows.findIndex((r) => r.id === application.id);
  if (idx === -1) return;
  rows[idx] = { ...rows[idx], status: newStatus, updated_at: nowIso() };
  writeArr(k, rows);

  const hk = key(companyId, "applicationHistory");
  const hist = readArr<ConsultingApplicationHistory>(hk);
  hist.push({
    id: uid("ahist"),
    consulting_company_id: companyId,
    application_id: application.id,
    previous_status: previous,
    new_status: newStatus,
    changed_by: changedBy,
    note: note ?? null,
    created_at: nowIso(),
    changed_by_profile: { name: "You", avatar_url: null },
  });
  writeArr(hk, hist);
}

export function testFetchApplicationHistory(companyId: string, applicationId: string): ConsultingApplicationHistory[] {
  return readArr<ConsultingApplicationHistory>(key(companyId, "applicationHistory"))
    .filter((h) => h.application_id === applicationId)
    .sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
}

/* ============================================================
   Phase 5 — Members, invitations, activity logs, analytics
   ============================================================ */

// ── Members (employees) ─────────────────────────────────────

export function testFetchMembers(companyId: string): ConsultingMember[] {
  const rows = readArr<ConsultingMember>(key(companyId, "members"));
  return rows.sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
}

export function testFetchMember(companyId: string, memberId: string): ConsultingMember | null {
  return readArr<ConsultingMember>(key(companyId, "members")).find((m) => m.id === memberId) ?? null;
}

export interface TestMemberInput {
  user_id?: string | null;
  full_name: string;
  email: string;
  phone?: string | null;
  avatar_url?: string | null;
  role: MemberRole;
  status?: MemberStatus;
}

/** Add a test-mode member row. If `user_id` is omitted, a synthetic id is generated. */
export function testAddMember(
  companyId: string,
  input: TestMemberInput,
  invitedBy: string,
): ConsultingMember {
  const k = key(companyId, "members");
  const rows = readArr<ConsultingMember>(k);
  const now = nowIso();
  const id = uid("member");
  const userId = input.user_id ?? `test-user-${Math.random().toString(36).slice(2, 10)}`;
  const member: ConsultingMember = {
    id,
    consulting_company_id: companyId,
    user_id: userId,
    role: input.role,
    status: input.status ?? "active",
    invited_by: invitedBy,
    last_active_at: now,
    created_at: now,
    updated_at: now,
    profile: {
      name: input.full_name,
      email: input.email,
      avatar_url: input.avatar_url ?? null,
    },
  } satisfies ConsultingMember;
  rows.push(member);
  writeArr(k, rows);
  return member;
}

export function testUpdateMemberRole(
  companyId: string,
  memberId: string,
  role: MemberRole,
): ConsultingMember | null {
  const k = key(companyId, "members");
  const rows = readArr<ConsultingMember>(k);
  const idx = rows.findIndex((r) => r.id === memberId);
  if (idx === -1) return null;
  rows[idx] = { ...rows[idx], role, updated_at: nowIso() };
  writeArr(k, rows);
  return rows[idx];
}

export function testUpdateMemberStatus(
  companyId: string,
  memberId: string,
  status: MemberStatus,
): ConsultingMember | null {
  const k = key(companyId, "members");
  const rows = readArr<ConsultingMember>(k);
  const idx = rows.findIndex((r) => r.id === memberId);
  if (idx === -1) return null;
  rows[idx] = { ...rows[idx], status, updated_at: nowIso() };
  writeArr(k, rows);
  return rows[idx];
}

export function testRemoveMember(companyId: string, memberId: string): boolean {
  return !!testUpdateMemberStatus(companyId, memberId, "removed");
}

// ── Invitations ─────────────────────────────────────────────

export function testFetchInvitations(companyId: string): ConsultingInvitation[] {
  const rows = readArr<ConsultingInvitation>(key(companyId, "invitations"));
  return rows.filter((r) => r.status === "pending").sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

export function testCreateInvitation(
  companyId: string,
  email: string,
  role: MemberRole,
  invitedBy: string,
  fullName?: string,
): { invitation: ConsultingInvitation; member: ConsultingMember } {
  const k = key(companyId, "invitations");
  const rows = readArr<ConsultingInvitation>(k);
  const now = nowIso();
  const id = uid("invite");
  const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
  const invitation: ConsultingInvitation = {
    id,
    consulting_company_id: companyId,
    email: email.toLowerCase().trim(),
    role,
    token,
    status: "pending",
    invited_by: invitedBy,
    created_at: now,
    updated_at: now,
  };
  rows.push(invitation);
  writeArr(k, rows);
  // Also create a member row with `invited` status (so employees page can render immediately).
  const member = testAddMember(
    companyId,
    { full_name: fullName ?? email.split("@")[0], email, role, status: "invited" },
    invitedBy,
  );
  return { invitation, member };
}

export function testRevokeInvitation(companyId: string, invitationId: string): boolean {
  const k = key(companyId, "invitations");
  const rows = readArr<ConsultingInvitation>(k);
  const idx = rows.findIndex((r) => r.id === invitationId);
  if (idx === -1) return false;
  rows[idx] = { ...rows[idx], status: "revoked", updated_at: nowIso() };
  writeArr(k, rows);
  return true;
}

// ── Assign client to employee (test mode) ───────────────────

export function testAssignClientToEmployee(
  companyId: string,
  clientId: string,
  employeeId: string | null,
): boolean {
  const k = key(companyId, "clients");
  const rows = readArr<ConsultingClient>(k);
  const idx = rows.findIndex((r) => r.id === clientId);
  if (idx === -1) return false;
  rows[idx] = {
    ...rows[idx],
    assigned_employee_id: employeeId,
    last_activity_at: nowIso(),
    updated_at: nowIso(),
  };
  writeArr(k, rows);
  return true;
}

// ── Activity log ────────────────────────────────────────────

export function testLogActivity(
  companyId: string,
  actorId: string | null,
  action: string,
  entityType?: string | null,
  entityId?: string | null,
  metadata?: Record<string, unknown> | null,
): ConsultingActivityLog {
  const k = key(companyId, "activityLogs");
  const rows = readArr<ConsultingActivityLog>(k);
  const now = nowIso();
  const id = uid("activity");
  // Look up actor name from members
  const members = testFetchMembers(companyId);
  const actor = actorId ? members.find((m) => m.user_id === actorId) : null;
  const log: ConsultingActivityLog = {
    id,
    consulting_company_id: companyId,
    actor_id: actorId,
    action,
    entity_type: entityType ?? null,
    entity_id: entityId ?? null,
    metadata: (metadata ?? {}) as unknown as Json,
    created_at: now,
    actor: actor?.profile ?? { name: "System", avatar_url: null },
  };
  rows.push(log);
  writeArr(k, rows);
  return log;
}

export function testFetchActivityLogs(
  companyId: string,
  opts: { action?: string; actorId?: string; limit?: number } = {},
): ConsultingActivityLog[] {
  let rows = readArr<ConsultingActivityLog>(key(companyId, "activityLogs"));
  // Re-attach actor profile in case it was updated since the log was written.
  const members = testFetchMembers(companyId);
  rows = rows.map((l) => ({
    ...l,
    actor: l.actor ?? members.find((m) => m.user_id === l.actor_id)?.profile ?? null,
  }));
  if (opts.action) rows = rows.filter((r) => r.action === opts.action);
  if (opts.actorId) rows = rows.filter((r) => r.actor_id === opts.actorId);
  const sorted = rows.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  return opts.limit ? sorted.slice(0, opts.limit) : sorted;
}

// ── Employee stats (computed from clients + payments) ───────

export function testFetchEmployeeStats(companyId: string): EmployeeStats[] {
  const members = testFetchMembers(companyId).filter((m) => m.status !== "removed");
  const clients = readArr<ConsultingClient>(key(companyId, "clients"));
  return members.map((m) => {
    const myClients = clients.filter((c) => c.assigned_employee_id === m.user_id);
    const totalClients = myClients.length;
    const activeClients = myClients.filter((c) => !c.is_archived).length;
    const successful = myClients.filter((c) => c.final_result === "success").length;
    const unsuccessful = myClients.filter((c) => c.final_result === "unsuccessful").length;
    const decided = successful + unsuccessful;
    const successRate = decided === 0 ? 0 : Math.round((successful / decided) * 1000) / 10;
    // Test mode: revenue is 0 (no test-mode payments). Real mode computes from payments.
    return {
      member_id: m.id,
      consulting_company_id: companyId,
      user_id: m.user_id,
      role: m.role,
      status: m.status,
      active_clients: activeClients,
      total_clients: totalClients,
      successful_clients: successful,
      unsuccessful_clients: unsuccessful,
      revenue_generated: 0,
      success_rate: successRate,
      last_active_at: m.last_active_at,
      created_at: m.created_at,
      profile: m.profile,
    };
  });
}

// ── Analytics stats (test mode computes from local clients) ─

export function testFetchAnalyticsStats(
  companyId: string,
  range?: { start: string; end: string },
): AnalyticsStats {
  const clients = readArr<ConsultingClient>(key(companyId, "clients")).filter((c) => !c.is_archived);
  const totalClients = clients.length;
  const newClientsPeriod = range
    ? clients.filter((c) => c.created_at >= range.start && c.created_at < range.end).length
    : 0;
  const successfulClients = clients.filter((c) => c.final_result === "success").length;
  const unsuccessfulClients = clients.filter((c) => c.final_result === "unsuccessful").length;
  const pendingClients = clients.filter((c) => c.final_result === "pending").length;
  const activeApplications = readArr<ConsultingApplication>(key(companyId, "applications")).filter(
    (a) => ["new", "documents", "processing", "submitted"].includes(a.status),
  ).length;
  const decided = successfulClients + unsuccessfulClients;
  const successRate = decided === 0 ? 0 : Math.round((successfulClients / decided) * 1000) / 10;
  return {
    totalClients,
    newClientsPeriod,
    activeApplications,
    successfulClients,
    unsuccessfulClients,
    pendingClients,
    monthlyRevenue: 0,
    annualRevenue: 0,
    totalRevenue: 0,
    successRate,
  };
}

export function testFetchAnalyticsMonthlySeries(
  companyId: string,
  months = 6,
): { label: string; clients: number; revenue: number; success: number; unsuccessful: number }[] {
  const clients = readArr<ConsultingClient>(key(companyId, "clients"));
  const out: { label: string; clients: number; revenue: number; success: number; unsuccessful: number }[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const label = start.toLocaleDateString("en-US", { month: "short" });
    const monthClients = clients.filter(
      (c) => c.created_at >= start.toISOString() && c.created_at < end.toISOString(),
    );
    out.push({
      label,
      clients: monthClients.length,
      revenue: 0,
      success: monthClients.filter((c) => c.final_result === "success").length,
      unsuccessful: monthClients.filter((c) => c.final_result === "unsuccessful").length,
    });
  }
  return out;
}

export function testFetchFinalResultDistribution(
  companyId: string,
): { label: string; count: number; color: string }[] {
  const clients = readArr<ConsultingClient>(key(companyId, "clients"));
  return [
    { label: "Success", count: clients.filter((c) => c.final_result === "success").length, color: "#10b981" },
    { label: "Unsuccessful", count: clients.filter((c) => c.final_result === "unsuccessful").length, color: "#ef4444" },
    { label: "Pending", count: clients.filter((c) => c.final_result === "pending").length, color: "#f59e0b" },
  ];
}

export function testFetchClientsByDestination(
  companyId: string,
): { label: string; count: number }[] {
  const clients = readArr<ConsultingClient>(key(companyId, "clients")).filter((c) => !c.is_archived);
  const buckets = new Map<string, number>();
  for (const c of clients) {
    const label = c.destination_country ?? "Unspecified";
    buckets.set(label, (buckets.get(label) ?? 0) + 1);
  }
  return Array.from(buckets.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

export function testFetchEmployeePerformance(
  companyId: string,
): { label: string; clients: number; successful: number }[] {
  return testFetchEmployeeStats(companyId)
    .map((s) => ({
      label: s.profile?.name ?? "Member",
      clients: s.total_clients,
      successful: s.successful_clients,
    }))
    .sort((a, b) => b.clients - a.clients)
    .slice(0, 8);
}

export function testFetchClientsByPackage(
  companyId: string,
): { label: string; count: number }[] {
  const clients = readArr<ConsultingClient>(key(companyId, "clients")).filter((c) => !c.is_archived);
  const packages = readArr<ConsultingPackage>(key(companyId, "packages"));
  const buckets = new Map<string, number>();
  for (const c of clients) {
    const pkg = packages.find((p) => p.id === c.service_id);
    const label = pkg?.service?.title ?? "Unassigned";
    buckets.set(label, (buckets.get(label) ?? 0) + 1);
  }
  return Array.from(buckets.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

export function testFetchApplicationStatusDistribution(
  companyId: string,
): { status: ApplicationStatus; count: number }[] {
  const apps = readArr<ConsultingApplication>(key(companyId, "applications"));
  const buckets = new Map<ApplicationStatus, number>();
  for (const a of apps) {
    buckets.set(a.status, (buckets.get(a.status) ?? 0) + 1);
  }
  return Array.from(buckets.entries()).map(([status, count]) => ({ status, count }));
}
