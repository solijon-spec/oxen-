import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Users,
  Plus,
  Search,
  Download,
  Archive,
  Mail,
  Phone,
  Loader2,
  X,
  Edit3,
  StickyNote,
  CheckSquare,
  Clock,
  FileText,
  Calendar,
  MapPin,
  CreditCard,
} from "lucide-react";

import { DashboardShell } from "@/components/consulting/DashboardShell";
import { DataTable, type Column } from "@/components/consulting/DataTable";
import { StatusBadge } from "@/components/consulting/StatusBadge";
import { EmptyState } from "@/components/consulting/EmptyState";
import { SlideOver } from "@/components/consulting/SlideOver";
import { ConfirmDialog } from "@/components/consulting/ConfirmDialog";
import { Field, SelectField } from "@/components/consulting/Field";
import { useConsulting } from "@/contexts/ConsultingContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSEO } from "@/hooks/use-seo";
import { toast } from "@/hooks/use-toast";
import {
  fetchClients as apiFetchClients,
  fetchClientById as apiFetchClientById,
  fetchClientNotes as apiFetchClientNotes,
  fetchClientStatusHistory as apiFetchClientStatusHistory,
  fetchMembers as apiFetchMembers,
  fetchCompanyPackages as apiFetchCompanyPackages,
  createClient as apiCreateClient,
  updateClient as apiUpdateClient,
  archiveClient as apiArchiveClient,
  addClientNote as apiAddClientNote,
  updateClientStatus as apiUpdateClientStatus,
  type ConsultingClient,
  type ClientApplicationStatus,
  type FinalResult,
  type PaymentStatus,
} from "@/lib/consulting";
import {
  testFetchClients,
  testFetchClient,
  testFetchClientNotes,
  testFetchClientStatusHistory,
  testCreateClient,
  testUpdateClient,
  testArchiveClient,
  testAddClientNote,
  testUpdateClientStatus,
  type TestClientInput,
} from "@/lib/consulting-test-mode";
import { COUNTRIES } from "@/data/countries";
import { cn } from "@/lib/utils";

const CLIENT_STATUSES: { value: ClientApplicationStatus; label: string }[] = [
  { value: "new_lead", label: "New Lead" },
  { value: "contacted", label: "Contacted" },
  { value: "documents_requested", label: "Documents Requested" },
  { value: "documents_received", label: "Documents Received" },
  { value: "under_review", label: "Under Review" },
  { value: "submitted", label: "Submitted" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "travel_completed", label: "Travel Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "refunded", label: "Refunded" },
];

const PAYMENT_OPTIONS: { value: PaymentStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "failed", label: "Failed" },
  { value: "refunded", label: "Refunded" },
  { value: "partial", label: "Partial" },
];

const FINAL_OPTIONS: { value: FinalResult; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "success", label: "Success" },
  { value: "unsuccessful", label: "Unsuccessful" },
  { value: "cancelled", label: "Cancelled" },
];

interface AddClientInput {
  full_name: string;
  phone: string;
  email: string;
  destination_country: string;
  assigned_employee_id: string;
  application_status: ClientApplicationStatus;
  payment_status: PaymentStatus;
  final_result: FinalResult;
  service_id: string;
}

export default function ConsultingClients() {
  const { company, can, isTestMode, role } = useConsulting();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const companyId = company?.id ?? "";

  // Consultant RBAC: consultants only see clients assigned to them.
  const isConsultant = role === "consultant";
  const assignedEmployeeId = isConsultant ? (user?.id ?? "") : undefined;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ClientApplicationStatus | "all">("all");
  const [employeeFilter, setEmployeeFilter] = useState<string>("all");
  const [archivedView, setArchivedView] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<ConsultingClient | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<ConsultingClient | null>(null);

  useSEO({ title: "Clients | OXEN Consulting", description: "Manage your consulting clients" });

  // Test-mode queries
  const testClients = useQuery({
    queryKey: ["consulting-clients-test", companyId, search, statusFilter, employeeFilter, archivedView, assignedEmployeeId ?? "any"],
    queryFn: () => {
      const rows = testFetchClients(companyId, {
        search: search.trim() || undefined,
        status: statusFilter,
        archived: archivedView,
      });
      // Consultant RBAC: filter to assigned clients only in test mode.
      return isConsultant ? rows.filter((r) => r.assigned_employee_id === assignedEmployeeId) : rows;
    },
    enabled: !!companyId && isTestMode,
    staleTime: 0,
  });

  // Real queries
  const realClients = useQuery({
    queryKey: ["consulting-clients", companyId, search, statusFilter, employeeFilter, archivedView, assignedEmployeeId ?? "any"],
    queryFn: () =>
      apiFetchClients(companyId, {
        search: search.trim() || undefined,
        status: statusFilter,
        employeeId: isConsultant ? assignedEmployeeId : (employeeFilter === "all" ? undefined : employeeFilter),
        archived: archivedView,
        pageSize: 100,
      }),
    enabled: !!companyId && !isTestMode,
  });

  const clients = isTestMode ? (testClients.data ?? []) : (realClients.data?.clients ?? []);
  const isLoading = isTestMode ? testClients.isLoading : realClients.isLoading;

  const { data: members = [] } = useQuery({
    queryKey: ["consulting-members", companyId],
    queryFn: () => apiFetchMembers(companyId),
    enabled: !!companyId && !isTestMode,
  });

  const { data: packages = [] } = useQuery({
    queryKey: ["consulting-packages", companyId],
    queryFn: () => apiFetchCompanyPackages(companyId),
    enabled: !!companyId,
  });

  const canWrite = can("clients:write");
  // Consultants can't write to clients (only read assigned). Support agents can read but not write.
  const canWriteClients = canWrite && !isConsultant;

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["consulting-clients"] });
    queryClient.invalidateQueries({ queryKey: ["consulting-clients-test"] });
    queryClient.invalidateQueries({ queryKey: ["consulting-client"] });
  }, [queryClient]);

  // ── Mutations ──────────────────────────────────────────
  const addMutation = useMutation({
    mutationFn: async (input: AddClientInput) => {
      if (isTestMode) {
        return testCreateClient(companyId, input as TestClientInput, user?.id ?? "");
      }
      return apiCreateClient(
        companyId,
        {
          full_name: input.full_name,
          phone: input.phone || null,
          email: input.email || null,
          destination_country: input.destination_country || null,
          assigned_employee_id: input.assigned_employee_id || null,
          application_status: input.application_status,
          payment_status: input.payment_status,
          final_result: input.final_result,
          service_id: input.service_id || null,
        },
        user?.id ?? "",
      );
    },
    onSuccess: () => {
      toast({ title: "Client added" });
      setAddOpen(false);
      invalidate();
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<ConsultingClient> }) => {
      if (isTestMode) return testUpdateClient(companyId, id, input);
      return apiUpdateClient(id, input);
    },
    onSuccess: () => {
      toast({ title: "Client updated" });
      setEditing(null);
      invalidate();
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const archiveMutation = useMutation({
    mutationFn: async ({ id, archive }: { id: string; archive: boolean }) => {
      if (isTestMode) return testArchiveClient(companyId, id, archive);
      return apiArchiveClient(id, archive);
    },
    onSuccess: () => {
      toast({ title: archiveTarget?.is_archived ? "Client restored" : "Client archived" });
      setArchiveTarget(null);
      invalidate();
    },
    onError: () => toast({ title: "Failed to archive", variant: "destructive" }),
  });

  // ── CSV export ─────────────────────────────────────────
  const exportCsv = useCallback(() => {
    if (clients.length === 0) {
      toast({ title: "No clients to export", variant: "destructive" });
      return;
    }
    const header = [
      "Full Name", "Phone", "Email", "Package", "Destination", "Assigned Employee",
      "Purchase Date", "Payment Status", "Application Status", "Last Activity",
    ];
    const lines = clients.map((r) =>
      [
        r.full_name,
        r.phone ?? "",
        r.email ?? "",
        r.service?.title ?? "",
        r.destination_country ?? "",
        r.assigned_employee?.name ?? "",
        r.purchase_date ?? "",
        r.payment_status,
        r.application_status,
        r.last_activity_at,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `oxen-clients-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "CSV exported" });
  }, [clients]);

  // ── Columns ────────────────────────────────────────────
  const columns: Column<ConsultingClient>[] = useMemo(
    () => [
      {
        key: "name",
        header: "Full name",
        render: (c) => (
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15">
              {c.photo_url ? (
                <img src={c.photo_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs font-bold text-primary">
                  {c.full_name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{c.full_name}</p>
              <p className="truncate text-[10px] text-muted-foreground">{c.email ?? c.phone ?? "—"}</p>
            </div>
          </div>
        ),
      },
      { key: "phone", header: "Phone", hideOnMobile: true, render: (c) => <span className="text-xs text-foreground">{c.phone ?? "—"}</span> },
      { key: "email", header: "Email", hideOnMobile: true, render: (c) => <span className="text-xs text-foreground">{c.email ?? "—"}</span> },
      { key: "package", header: "Package", hideOnMobile: true, render: (c) => <span className="text-xs text-foreground">{c.service?.title ?? "—"}</span> },
      { key: "destination", header: "Destination", hideOnMobile: true, render: (c) => <span className="text-xs text-foreground">{c.destination_country ?? "—"}</span> },
      { key: "purchase", header: "Purchase", hideOnMobile: true, render: (c) => <span className="text-xs text-muted-foreground">{c.purchase_date ? new Date(c.purchase_date).toLocaleDateString() : "—"}</span> },
      { key: "payment", header: "Payment", render: (c) => <StatusBadge status={c.payment_status} /> },
      { key: "app_status", header: "Application", render: (c) => <StatusBadge status={c.application_status} /> },
      { key: "employee", header: "Employee", hideOnMobile: true, render: (c) => <span className="text-xs text-foreground">{c.assigned_employee?.name ?? "Unassigned"}</span> },
      { key: "activity", header: "Last activity", hideOnMobile: true, render: (c) => <span className="text-xs text-muted-foreground">{new Date(c.last_activity_at).toLocaleDateString()}</span> },
      {
        key: "actions",
        header: "Actions",
        render: (c) => (
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); setProfileId(c.id); }}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04] text-muted-foreground transition hover:text-foreground"
              aria-label="View"
            >
              <Search className="h-3.5 w-3.5" />
            </button>
            {canWriteClients && (
              <button
                onClick={(e) => { e.stopPropagation(); setEditing(c); }}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary transition hover:bg-primary/20"
                aria-label="Edit"
              >
                <Edit3 className="h-3.5 w-3.5" />
              </button>
            )}
            {canWriteClients && (
              <button
                onClick={(e) => { e.stopPropagation(); setArchiveTarget(c); }}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10 text-destructive transition hover:bg-destructive/20"
                aria-label="Archive"
              >
                <Archive className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ),
      },
    ],
    [canWrite, canWriteClients],
  );

  return (
    <DashboardShell
      title="Clients"
      subtitle="People who purchased your services or contacted your company"
      actions={
        canWriteClients && (
          <button
            onClick={() => setAddOpen(true)}
            className="gold-gradient flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-primary-foreground transition active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Add Client
          </button>
        )
      }
    >
      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 flex flex-wrap items-center gap-2"
      >
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, phone…"
            className="w-full rounded-xl border border-input bg-background/50 py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ClientApplicationStatus | "all")}
          className="rounded-xl border border-input bg-background/50 px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
        >
          <option value="all">All statuses</option>
          {CLIENT_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        {!isTestMode && (
          <select
            value={employeeFilter}
            onChange={(e) => setEmployeeFilter(e.target.value)}
            className="rounded-xl border border-input bg-background/50 px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
          >
            <option value="all">All employees</option>
            {members.map((m) => (
              <option key={m.id} value={m.user_id}>
                {m.profile?.name ?? "User"}
              </option>
            ))}
          </select>
        )}
        <button
          onClick={() => setArchivedView((v) => !v)}
          className={cn(
            "glass flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition",
            archivedView ? "border-primary/40 text-primary" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Archive className="h-3.5 w-3.5" />
          {archivedView ? "Archived" : "Active"}
        </button>
        <button
          onClick={exportCsv}
          className="glass flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-foreground transition hover:border-primary/30"
        >
          <Download className="h-3.5 w-3.5" />
          CSV
        </button>
      </motion.div>

      <DataTable
        columns={columns}
        rows={clients}
        rowKey={(c) => c.id}
        onRowClick={(c) => setProfileId(c.id)}
        loading={isLoading}
        empty={
          <EmptyState
            icon={Users}
            title={archivedView ? "No archived clients" : isConsultant ? "No clients assigned to you" : "No clients yet"}
            description={archivedView
              ? "Archived clients will appear here. Restore them any time."
              : isConsultant
                ? "Clients assigned to you will appear here. Ask a manager or admin to assign clients to see them in your list."
                : "When users purchase your service packages or contact your company, they'll appear here. You can also add clients manually."}
            action={canWriteClients && !archivedView ? { label: "Add your first client", onClick: () => setAddOpen(true) } : undefined}
          />
        }
      />

      {(addOpen || editing) && (
        <ClientFormModal
          isTestMode={isTestMode}
          initial={editing ?? undefined}
          members={members}
          packages={packages}
          onClose={() => { setAddOpen(false); setEditing(null); }}
          onSubmit={(input) => {
            if (editing) updateMutation.mutate({ id: editing.id, input });
            else addMutation.mutate(input);
          }}
          loading={addMutation.isPending || updateMutation.isPending}
        />
      )}

      <SlideOver
        open={!!profileId}
        onClose={() => setProfileId(null)}
        title={editing?.full_name ?? "Client"}
        subtitle="Client profile"
        width="max-w-lg"
      >
        {profileId && (
          <ClientProfileBody
            companyId={companyId}
            isTestMode={isTestMode}
            clientId={profileId}
            canWrite={canWrite}
            currentUserId={user?.id ?? ""}
            onNoteAdded={invalidate}
          />
        )}
      </SlideOver>

      <ConfirmDialog
        open={!!archiveTarget}
        title={archiveTarget?.is_archived ? "Restore client" : "Archive client"}
        message={
          archiveTarget?.is_archived
            ? `Restore ${archiveTarget?.full_name}? They'll reappear in your active list.`
            : `Archive ${archiveTarget?.full_name}? They'll be hidden from the active list but their data is preserved.`
        }
        confirmLabel={archiveTarget?.is_archived ? "Restore" : "Archive"}
        destructive={!archiveTarget?.is_archived}
        loading={archiveMutation.isPending}
        onConfirm={() => {
          if (archiveTarget) archiveMutation.mutate({ id: archiveTarget.id, archive: !archiveTarget.is_archived });
        }}
        onCancel={() => setArchiveTarget(null)}
      />
    </DashboardShell>
  );
}

/* ── Add/Edit modal ──────────────────────────────────────── */

function ClientFormModal({
  isTestMode,
  initial,
  members,
  packages,
  onClose,
  onSubmit,
  loading,
}: {
  isTestMode: boolean;
  initial?: ConsultingClient;
  members: { user_id: string; profile?: { name: string | null } | null }[];
  packages: { id: string; service?: { title: string } | null }[];
  onClose: () => void;
  onSubmit: (input: AddClientInput) => void;
  loading: boolean;
}) {
  const [form, setForm] = useState<AddClientInput>({
    full_name: initial?.full_name ?? "",
    phone: initial?.phone ?? "",
    email: initial?.email ?? "",
    destination_country: initial?.destination_country ?? "",
    assigned_employee_id: initial?.assigned_employee_id ?? "",
    application_status: initial?.application_status ?? "new_lead",
    payment_status: initial?.payment_status ?? "pending",
    final_result: initial?.final_result ?? "pending",
    service_id: initial?.service_id ?? "",
  });

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onClose}
        className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 26 }}
        className="fixed left-1/2 top-1/2 z-[90] w-[calc(100%-1rem)] max-w-[640px] -translate-x-1/2 -translate-y-1/2 sm:w-[calc(100%-2rem)]"
      >
        <div className="glass-strong flex max-h-[calc(100vh-32px)] flex-col overflow-hidden rounded-3xl shadow-2xl">
          {/* Sticky header */}
          <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] px-6 py-4">
            <h3 className="font-display text-lg font-bold">{initial ? "Edit Client" : "Add Client"}</h3>
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] text-muted-foreground transition hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {/* Scrollable form body */}
          <div className="flex-1 space-y-3 overflow-y-auto px-6 py-4">
            <Field
              label="Full name"
              value={form.full_name}
              onChange={(v) => setForm((f) => ({ ...f, full_name: v }))}
              placeholder="John Smith"
              required
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Phone" value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} type="tel" placeholder="+1 555 123 4567" />
              <Field label="Email" value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))} type="email" placeholder="john@example.com" />
            </div>
            <SelectField<string>
              label="Destination country"
              value={form.destination_country}
              onChange={(v) => setForm((f) => ({ ...f, destination_country: v }))}
              options={[{ value: "", label: "None" }, ...COUNTRIES.map((c) => ({ value: c.name, label: c.name }))]}
            />
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">Selected package</span>
              <select
                value={form.service_id}
                onChange={(e) => setForm((f) => ({ ...f, service_id: e.target.value }))}
                className="w-full rounded-xl border border-input bg-background/50 px-3.5 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
              >
                <option value="">None</option>
                {packages.map((p) => (
                  <option key={p.id} value={p.id}>{p.service?.title ?? "Package"}</option>
                ))}
              </select>
            </label>
            {!isTestMode && (
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">Assigned employee</span>
                <select
                  value={form.assigned_employee_id}
                  onChange={(e) => setForm((f) => ({ ...f, assigned_employee_id: e.target.value }))}
                  className="w-full rounded-xl border border-input bg-background/50 px-3.5 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
                >
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.profile?.name ?? "Team member"}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className="grid gap-3 sm:grid-cols-3">
              <SelectField<ClientApplicationStatus>
                label="Application status"
                value={form.application_status}
                onChange={(v) => setForm((f) => ({ ...f, application_status: v }))}
                options={CLIENT_STATUSES}
              />
              <SelectField<PaymentStatus>
                label="Payment status"
                value={form.payment_status}
                onChange={(v) => setForm((f) => ({ ...f, payment_status: v }))}
                options={PAYMENT_OPTIONS}
              />
              <SelectField<FinalResult>
                label="Final result"
                value={form.final_result}
                onChange={(v) => setForm((f) => ({ ...f, final_result: v }))}
                options={FINAL_OPTIONS}
              />
            </div>
          </div>
          {/* Sticky footer */}
          <div className="flex shrink-0 gap-3 border-t border-white/[0.06] bg-background/80 px-6 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur-md">
            <button
              onClick={onClose}
              className="glass flex-1 rounded-2xl py-3 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
            >
              Cancel
            </button>
            <button
              onClick={() => form.full_name.trim() && onSubmit(form)}
              disabled={loading || !form.full_name.trim()}
              className="gold-gradient flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-primary-foreground transition active:scale-95 disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {initial ? "Save Changes" : "Add Client"}
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}

/* ── Profile body with 7 sections ───────────────────────── */

type ProfileTab = "info" | "package" | "payment" | "timeline" | "notes" | "documents" | "history";

function ClientProfileBody({
  companyId,
  isTestMode,
  clientId,
  canWrite,
  currentUserId,
  onNoteAdded,
}: {
  companyId: string;
  isTestMode: boolean;
  clientId: string;
  canWrite: boolean;
  currentUserId: string;
  onNoteAdded: () => void;
}) {
  const [tab, setTab] = useState<ProfileTab>("info");
  const [noteBody, setNoteBody] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [statusNote, setStatusNote] = useState("");
  const [changingStatus, setChangingStatus] = useState(false);

  const profile = useQuery({
    queryKey: ["consulting-client", clientId, isTestMode],
    queryFn: () => (isTestMode ? testFetchClient(companyId, clientId) : apiFetchClientById(clientId)),
    enabled: !!clientId,
    staleTime: 0,
  });

  const notes = useQuery({
    queryKey: ["consulting-client-notes", clientId, isTestMode],
    queryFn: () => (isTestMode ? testFetchClientNotes(companyId, clientId) : apiFetchClientNotes(clientId)),
    enabled: !!clientId,
    staleTime: 0,
  });

  const history = useQuery({
    queryKey: ["consulting-client-history", clientId, isTestMode],
    queryFn: () => (isTestMode ? testFetchClientStatusHistory(companyId, clientId) : apiFetchClientStatusHistory(clientId)),
    enabled: !!clientId,
    staleTime: 0,
  });

  if (profile.isLoading || !profile.data) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }
  const c = profile.data;

  const tabs: { id: ProfileTab; label: string }[] = [
    { id: "info", label: "Info" },
    { id: "package", label: "Package" },
    { id: "payment", label: "Payment" },
    { id: "timeline", label: "Timeline" },
    { id: "notes", label: "Notes" },
    { id: "documents", label: "Documents" },
    { id: "history", label: "History" },
  ];

  const handleAddNote = async () => {
    if (!noteBody.trim()) return;
    setAddingNote(true);
    try {
      if (isTestMode) testAddClientNote(companyId, clientId, currentUserId, noteBody.trim(), true);
      else await apiAddClientNote(companyId, clientId, currentUserId, noteBody.trim(), true);
      setNoteBody("");
      onNoteAdded();
      toast({ title: "Note added" });
    } finally {
      setAddingNote(false);
    }
  };

  const handleChangeStatus = async (newStatus: ClientApplicationStatus) => {
    if (newStatus === c.application_status) return;
    setChangingStatus(true);
    try {
      if (isTestMode) {
        testUpdateClientStatus(companyId, clientId, newStatus, currentUserId, statusNote || undefined);
      } else {
        const res = await apiUpdateClientStatus(clientId, companyId, newStatus, currentUserId, statusNote || undefined);
        if (!res.ok) throw new Error(res.error ?? "Failed");
      }
      toast({ title: "Status updated" });
      setStatusNote("");
      onNoteAdded();
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : "Failed", variant: "destructive" });
    } finally {
      setChangingStatus(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-primary/15">
          {c.photo_url ? (
            <img src={c.photo_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-lg font-bold text-primary">{c.full_name.charAt(0).toUpperCase()}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-base font-bold text-foreground">{c.full_name}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <StatusBadge status={c.payment_status} />
            <StatusBadge status={c.application_status} />
            <StatusBadge status={c.final_result} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-xl bg-white/[0.04] p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition",
              tab === t.id ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "info" && (
        <div className="space-y-2">
          <InfoRow icon={Mail} label="Email" value={c.email ?? "—"} />
          <InfoRow icon={Phone} label="Phone" value={c.phone ?? "—"} />
          <InfoRow icon={MapPin} label="Destination" value={c.destination_country ?? "—"} />
          <InfoRow icon={Users} label="Assigned to" value={c.assigned_employee?.name ?? "Unassigned"} />
          <InfoRow icon={Calendar} label="Created" value={new Date(c.created_at).toLocaleDateString()} />
          <InfoRow icon={Clock} label="Last activity" value={new Date(c.last_activity_at).toLocaleDateString()} />
        </div>
      )}

      {tab === "package" && (
        <div className="space-y-3">
          <div className="glass rounded-xl p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Selected package</p>
            <p className="mt-1 font-display text-sm font-bold text-foreground">{c.service?.title ?? "None"}</p>
            {c.service?.price != null && (
              <p className="mt-0.5 text-xs text-primary">${Number(c.service.price).toLocaleString()}</p>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Package details, benefits, and requirements will appear here once a package is linked.
          </p>
        </div>
      )}

      {tab === "payment" && (
        <div className="space-y-3">
          <div className="glass rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CreditCard className="h-4 w-4" /> Payment status
              </div>
              <StatusBadge status={c.payment_status} />
            </div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Package price</span>
              <span className="font-display font-bold text-foreground">
                {c.service?.price != null ? `$${Number(c.service.price).toLocaleString()}` : "—"}
              </span>
            </div>
            {c.purchase_date && (
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Purchase date</span>
                <span className="text-foreground">{new Date(c.purchase_date).toLocaleDateString()}</span>
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Detailed transaction history will be available in the Payments module (next phase).
          </p>
        </div>
      )}

      {tab === "timeline" && (
        <div className="space-y-2">
          <InfoRow icon={Plus} label="Created" value={new Date(c.created_at).toLocaleString()} />
          {c.purchase_date && (
            <InfoRow icon={CheckSquare} label="Purchase date" value={new Date(c.purchase_date).toLocaleString()} />
          )}
          <InfoRow icon={Clock} label="Last activity" value={new Date(c.last_activity_at).toLocaleString()} />
        </div>
      )}

      {tab === "notes" && (
        <div className="space-y-3">
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-3 py-2 text-[11px] text-amber-300/90">
            <StickyNote className="mr-1 inline h-3 w-3" />
            Internal notes — never visible to the client.
          </div>
          {canWrite && (
            <div className="space-y-2">
              <textarea
                value={noteBody}
                onChange={(e) => setNoteBody(e.target.value)}
                placeholder="Add an internal note…"
                rows={2}
                className="w-full resize-none rounded-xl border border-input bg-background/50 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
              <button
                onClick={handleAddNote}
                disabled={addingNote || !noteBody.trim()}
                className="gold-gradient flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-primary-foreground transition active:scale-95 disabled:opacity-50"
              >
                {addingNote ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                Add Note
              </button>
            </div>
          )}
          {notes.data && notes.data.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">No notes yet</p>
          ) : (
            <div className="space-y-2">
              {notes.data?.map((n) => (
                <div key={n.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>{n.author?.name ?? "Staff"}</span>
                    <span>{new Date(n.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="mt-1.5 text-xs text-foreground">{n.body}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "documents" && (
        <div className="space-y-3">
          <div className="glass flex flex-col items-center gap-2 rounded-xl p-6 text-center">
            <FileText className="h-6 w-6 text-muted-foreground/50" />
            <p className="text-xs font-semibold text-foreground">Documents</p>
            <p className="text-[11px] text-muted-foreground">
              Document upload and management will be available in the next phase. For now, keep documents in your own storage and link them in notes.
            </p>
          </div>
        </div>
      )}

      {tab === "history" && (
        <div className="space-y-3">
          {canWrite && (
            <div className="space-y-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
              <p className="text-[11px] font-semibold text-muted-foreground">Change status</p>
              <select
                defaultValue={c.application_status}
                onChange={(e) => handleChangeStatus(e.target.value as ClientApplicationStatus)}
                disabled={changingStatus}
                className="w-full rounded-xl border border-input bg-background/50 px-3 py-2 text-sm focus:border-primary focus:outline-none disabled:opacity-50"
              >
                {CLIENT_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              <input
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                placeholder="Optional note for this change…"
                className="w-full rounded-xl border border-input bg-background/50 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
              {changingStatus && <p className="text-[10px] text-muted-foreground">Saving…</p>}
            </div>
          )}
          {(!history.data || history.data.length === 0) ? (
            <p className="py-6 text-center text-xs text-muted-foreground">No status changes yet</p>
          ) : (
            <ol className="space-y-3">
              {history.data.map((h, i) => (
                <li key={h.id} className="relative pl-6">
                  {i < (history.data?.length ?? 0) - 1 && (
                    <span className="absolute left-[7px] top-4 h-full w-px bg-white/[0.06]" />
                  )}
                  <span className="absolute left-0 top-1 h-3.5 w-3.5 rounded-full border-2 border-primary bg-card" />
                  <div className="rounded-xl bg-white/[0.02] p-3">
                    <div className="flex items-center gap-2">
                      {h.previous_status && <StatusBadge status={h.previous_status} />}
                      <span className="text-[10px] text-muted-foreground">→</span>
                      <StatusBadge status={h.new_status} />
                    </div>
                    <p className="mt-1.5 text-[11px] text-muted-foreground">
                      {h.changed_by_profile?.name ?? "Staff"} · {new Date(h.created_at).toLocaleString()}
                    </p>
                    {h.note && <p className="mt-1 text-xs text-foreground">{h.note}</p>}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      <p className="border-t border-white/[0.06] pt-2 text-center text-[10px] text-muted-foreground">
        Client ID: {c.id.slice(0, 8)}
      </p>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.02] px-3 py-2.5">
      <span className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </span>
      <span className="text-right text-xs font-semibold text-foreground">{value}</span>
    </div>
  );
}
