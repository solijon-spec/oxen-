import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  FileStack,
  Plus,
  Search,
  LayoutGrid,
  List,
  Calendar,
  Loader2,
  X,
} from "lucide-react";

import { DashboardShell } from "@/components/consulting/DashboardShell";
import { DataTable, type Column } from "@/components/consulting/DataTable";
import { KanbanBoard, type KanbanColumn } from "@/components/consulting/KanbanBoard";
import { StatusBadge } from "@/components/consulting/StatusBadge";
import { EmptyState } from "@/components/consulting/EmptyState";
import { SlideOver } from "@/components/consulting/SlideOver";
import { Field, SelectField } from "@/components/consulting/Field";
import { useConsulting } from "@/contexts/ConsultingContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSEO } from "@/hooks/use-seo";
import { toast } from "@/hooks/use-toast";
import {
  fetchApplications as apiFetchApplications,
  fetchApplicationHistory as apiFetchApplicationHistory,
  fetchClients as apiFetchClients,
  fetchMembers as apiFetchMembers,
  fetchCompanyPackages as apiFetchCompanyPackages,
  createApplication as apiCreateApplication,
  updateApplicationStatus as apiUpdateApplicationStatus,
  type ConsultingApplication,
  type ApplicationStatus,
  type ConsultingClient,
  type ConsultingPackage,
} from "@/lib/consulting";
import {
  testFetchApplications,
  testFetchApplicationHistory,
  testFetchClients,
  testFetchPackages,
  testCreateApplication,
  testUpdateApplicationStatus,
  type TestApplicationInput,
} from "@/lib/consulting-test-mode";
import { cn } from "@/lib/utils";

const KANBAN_COLUMNS: { id: ApplicationStatus; title: string; accent: string }[] = [
  { id: "new", title: "New", accent: "bg-sky-400" },
  { id: "documents", title: "Documents", accent: "bg-amber-400" },
  { id: "processing", title: "Processing", accent: "bg-orange-400" },
  { id: "submitted", title: "Submitted", accent: "bg-blue-400" },
  { id: "approved", title: "Approved", accent: "bg-emerald-400" },
  { id: "rejected", title: "Rejected", accent: "bg-rose-400" },
  { id: "completed", title: "Completed", accent: "bg-primary" },
];

type ViewMode = "table" | "kanban";

export default function ConsultingApplications() {
  const { company, can, isTestMode } = useConsulting();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const companyId = company?.id ?? "";

  const [view, setView] = useState<ViewMode>("table");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "all">("all");
  const [addOpen, setAddOpen] = useState(false);
  const [historyId, setHistoryId] = useState<string | null>(null);

  useSEO({ title: "Applications | OXEN Consulting", description: "Manage client applications" });

  // Test-mode queries
  const testData = useQuery({
    queryKey: ["consulting-applications-test", companyId, search, statusFilter],
    queryFn: () =>
      testFetchApplications(companyId, {
        search: search.trim() || undefined,
        status: statusFilter,
      }),
    enabled: !!companyId && isTestMode,
    staleTime: 0,
  });

  // Real queries
  const realData = useQuery({
    queryKey: ["consulting-applications", companyId, search, statusFilter],
    queryFn: () =>
      apiFetchApplications(companyId, {
        search: search.trim() || undefined,
        status: statusFilter,
      }),
    enabled: !!companyId && !isTestMode,
  });

  const applications = isTestMode ? (testData.data ?? []) : (realData.data ?? []);
  const isLoading = isTestMode ? testData.isLoading : realData.isLoading;

  const testClients = useQuery({
    queryKey: ["consulting-clients-test-all", companyId],
    queryFn: () => testFetchClients(companyId, {}),
    enabled: !!companyId && isTestMode && addOpen,
    staleTime: 0,
  });

  const realClients = useQuery({
    queryKey: ["consulting-clients-all", companyId],
    queryFn: () => apiFetchClients(companyId, { pageSize: 200 }),
    enabled: !!companyId && !isTestMode && addOpen,
  });

  const clients = isTestMode ? (testClients.data ?? []) : (realClients.data?.clients ?? []);

  const testPackages = useQuery({
    queryKey: ["consulting-packages", companyId],
    queryFn: () => testFetchPackages(companyId),
    enabled: !!companyId && isTestMode && addOpen,
    staleTime: 0,
  });

  const realPackages = useQuery({
    queryKey: ["consulting-packages", companyId],
    queryFn: () => apiFetchCompanyPackages(companyId),
    enabled: !!companyId && !isTestMode && addOpen,
  });

  const packages = isTestMode ? (testPackages.data ?? []) : (realPackages.data ?? []);

  const { data: members = [] } = useQuery({
    queryKey: ["consulting-members", companyId],
    queryFn: () => apiFetchMembers(companyId),
    enabled: !!companyId && !isTestMode,
  });

  const testHistory = useQuery({
    queryKey: ["consulting-application-history-test", historyId, companyId],
    queryFn: () => (historyId ? testFetchApplicationHistory(companyId, historyId) : Promise.resolve([])),
    enabled: !!historyId && isTestMode,
    staleTime: 0,
  });

  const realHistory = useQuery({
    queryKey: ["consulting-application-history", historyId],
    queryFn: () => apiFetchApplicationHistory(historyId!),
    enabled: !!historyId && !isTestMode,
  });

  const history = isTestMode ? (testHistory.data ?? []) : (realHistory.data ?? []);

  const canWrite = can("applications:write");

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["consulting-applications"] });
    queryClient.invalidateQueries({ queryKey: ["consulting-applications-test"] });
    queryClient.invalidateQueries({ queryKey: ["consulting-application-history"] });
  }, [queryClient]);

  const moveMutation = useMutation({
    mutationFn: async ({ app, newStatus, note }: { app: ConsultingApplication; newStatus: ApplicationStatus; note?: string }) => {
      if (isTestMode) {
        testUpdateApplicationStatus(companyId, app, newStatus, user?.id ?? "", note);
        return;
      }
      await apiUpdateApplicationStatus(app, newStatus, user?.id ?? "", note);
    },
    onSuccess: () => {
      toast({ title: "Application status updated" });
      invalidate();
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const addMutation = useMutation({
    mutationFn: async (input: TestApplicationInput & { note?: string }) => {
      if (isTestMode) return testCreateApplication(companyId, input, user?.id ?? "");
      return apiCreateApplication(companyId, input, user?.id ?? "");
    },
    onSuccess: () => {
      toast({ title: "Application created" });
      setAddOpen(false);
      invalidate();
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  // ── Kanban columns (grouped by status) ───────────────────
  const kanbanColumns: KanbanColumn<ConsultingApplication>[] = useMemo(
    () =>
      KANBAN_COLUMNS.map((c) => ({
        id: c.id,
        title: c.title,
        accent: c.accent,
        items: applications.filter((a) => a.status === c.id),
      })),
    [applications],
  );

  const handleMove = useCallback(
    (item: ConsultingApplication, _from: string, to: string) => {
      moveMutation.mutate({ app: item, newStatus: to as ApplicationStatus });
    },
    [moveMutation],
  );

  // ── Table columns ────────────────────────────────────────
  const columns: Column<ConsultingApplication>[] = useMemo(
    () => [
      {
        key: "client",
        header: "Client",
        render: (a) => (
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
              {(a.client?.full_name ?? "?").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {a.client?.full_name ?? "Unknown"}
              </p>
              <p className="truncate text-[10px] text-muted-foreground">
                {a.client?.email ?? a.client?.phone ?? ""}
              </p>
            </div>
          </div>
        ),
      },
      {
        key: "service",
        header: "Package",
        hideOnMobile: true,
        render: (a) => <span className="text-xs text-foreground">{a.service?.title ?? "—"}</span>,
      },
      {
        key: "destination",
        header: "Destination",
        hideOnMobile: true,
        render: (a) => <span className="text-xs text-foreground">{a.destination_country ?? "—"}</span>,
      },
      {
        key: "employee",
        header: "Employee",
        hideOnMobile: true,
        render: (a) => (
          <span className="text-xs text-foreground">{a.assigned_employee?.name ?? "Unassigned"}</span>
        ),
      },
      {
        key: "submitted",
        header: "Submitted",
        hideOnMobile: true,
        render: (a) => (
          <span className="text-xs text-muted-foreground">
            {a.submission_date ? new Date(a.submission_date).toLocaleDateString() : "—"}
          </span>
        ),
      },
      {
        key: "status",
        header: "Status",
        render: (a) => <StatusBadge status={a.status} />,
      },
      {
        key: "actions",
        header: "Actions",
        render: (a) => (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setHistoryId(a.id);
            }}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04] text-muted-foreground transition hover:text-foreground"
            aria-label="View history"
          >
            <Calendar className="h-3.5 w-3.5" />
          </button>
        ),
      },
    ],
    [],
  );

  return (
    <DashboardShell
      title="Applications"
      subtitle="Track every client application from documents to final decision"
      actions={
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl bg-white/[0.04] p-1">
            <button
              onClick={() => setView("table")}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg transition",
                view === "table" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground",
              )}
              aria-label="Table view"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView("kanban")}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg transition",
                view === "kanban" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground",
              )}
              aria-label="Kanban view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
          {canWrite && (
            <button
              onClick={() => setAddOpen(true)}
              className="gold-gradient flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-primary-foreground transition active:scale-95"
            >
              <Plus className="h-4 w-4" />
              New Application
            </button>
          )}
        </div>
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
            placeholder="Search client, type, or destination…"
            className="w-full rounded-xl border border-input bg-background/50 py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ApplicationStatus | "all")}
          className="rounded-xl border border-input bg-background/50 px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
        >
          <option value="all">All statuses</option>
          {KANBAN_COLUMNS.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
      </motion.div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : applications.length === 0 ? (
        <EmptyState
          icon={FileStack}
          title="No applications yet"
          description="Applications are created when a client purchases a package, or you can create one manually. Drag cards between columns to update status."
          action={canWrite ? { label: "Create application", onClick: () => setAddOpen(true) } : undefined}
        />
      ) : view === "table" ? (
        <DataTable
          columns={columns}
          rows={applications}
          rowKey={(a) => a.id}
          onRowClick={(a) => setHistoryId(a.id)}
        />
      ) : (
        <KanbanBoard
          columns={kanbanColumns}
          itemId={(a) => a.id}
          onMove={handleMove}
          renderCard={(a) => (
            <div className="space-y-1.5">
              <p className="text-xs font-bold text-foreground">{a.client?.full_name ?? "Unknown"}</p>
              <p className="text-[10px] text-muted-foreground">{a.service?.title ?? "No package"}</p>
              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-[10px] text-muted-foreground">
                  {a.destination_country ?? "—"}
                </span>
                <StatusBadge status={a.status} />
              </div>
            </div>
          )}
        />
      )}

      {addOpen && (
        <AddApplicationModal
          clients={clients}
          packages={packages}
          members={members}
          isTestMode={isTestMode}
          onClose={() => setAddOpen(false)}
          onSubmit={(input) => addMutation.mutate(input)}
          loading={addMutation.isPending}
        />
      )}

      {/* History slide-over */}
      <SlideOver
        open={!!historyId}
        onClose={() => setHistoryId(null)}
        title="Application History"
        subtitle="Every status change is logged"
      >
        {history.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">No status changes yet</p>
        ) : (
          <ol className="space-y-3">
            {history.map((h, i) => (
              <li key={h.id} className="relative pl-6">
                {i < history.length - 1 && (
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
                    {h.changed_by_profile?.name ?? "Staff"} ·{" "}
                    {new Date(h.created_at).toLocaleString()}
                  </p>
                  {h.note && <p className="mt-1 text-xs text-foreground">{h.note}</p>}
                </div>
              </li>
            ))}
          </ol>
        )}
      </SlideOver>
    </DashboardShell>
  );
}

/* ── Add modal ───────────────────────────────────────────── */

function AddApplicationModal({
  clients,
  packages,
  members,
  isTestMode,
  onClose,
  onSubmit,
  loading,
}: {
  clients: ConsultingClient[];
  packages: ConsultingPackage[];
  members: { user_id: string; profile?: { name: string | null } | null }[];
  isTestMode: boolean;
  onClose: () => void;
  onSubmit: (input: TestApplicationInput) => void;
  loading: boolean;
}) {
  const [clientId, setClientId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [destination, setDestination] = useState("");
  const [appType, setAppType] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [expectedDate, setExpectedDate] = useState("");

  const submit = () => {
    if (!clientId) {
      toast({ title: "Please select a client", variant: "destructive" });
      return;
    }
    onSubmit({
      client_id: clientId,
      service_id: serviceId || null,
      destination_country: destination || null,
      application_type: appType || null,
      assigned_employee_id: employeeId || null,
      expected_completion_date: expectedDate ? new Date(expectedDate).toISOString() : null,
    });
  };

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
        className="fixed left-1/2 top-1/2 z-[81] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2"
      >
        <div className="glass-strong rounded-3xl p-6 shadow-2xl">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-bold">New Application</h3>
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] text-muted-foreground transition hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            <label className="block">
              <span className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                Client <span className="text-primary">*</span>
              </span>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full rounded-xl border border-input bg-background/50 px-3.5 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
              >
                <option value="">Select a client…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.full_name}</option>
                ))}
              </select>
            </label>
            <SelectField<string>
              label="Service package"
              value={serviceId}
              onChange={setServiceId}
              options={[
                { value: "", label: "None" },
                ...packages.map((p) => ({
                  value: p.id,
                  label: p.service?.title ?? "Package",
                })),
              ]}
            />
            <Field label="Destination country" value={destination} onChange={setDestination} placeholder="Canada" />
            <Field label="Application type" value={appType} onChange={setAppType} placeholder="e.g. Student Visa, Tourist Visa" />
            {!isTestMode && (
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">Assigned employee</span>
                <select
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
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
            <Field label="Expected completion date" value={expectedDate} onChange={setExpectedDate} type="date" />
          </div>
          <div className="mt-5 flex gap-3">
            <button
              onClick={onClose}
              className="glass flex-1 rounded-2xl py-3 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={loading || !clientId}
              className="gold-gradient flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-primary-foreground transition active:scale-95 disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Create
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}
