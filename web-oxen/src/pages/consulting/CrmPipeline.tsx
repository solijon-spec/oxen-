import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Target,
  Plus,
  Building2,
  Phone,
  Mail,
  DollarSign,
  TrendingUp,
  Trophy,
  Loader2,
  MapPin,
} from "lucide-react";

import { DashboardShell } from "@/components/consulting/DashboardShell";
import { KanbanBoard, type KanbanColumn } from "@/components/consulting/KanbanBoard";
import { StatCard } from "@/components/consulting/StatCard";
import { SlideOver } from "@/components/consulting/SlideOver";
import { EmptyState } from "@/components/consulting/EmptyState";
import { Field, SelectField } from "@/components/consulting/Field";
import { useConsulting } from "@/contexts/ConsultingContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSEO } from "@/hooks/use-seo";
import { toast } from "@/hooks/use-toast";
import {
  fetchClients,
  createClient,
  updateClientStatus,
  type ConsultingClient,
  type ClientApplicationStatus,
} from "@/lib/consulting";
import {
  testFetchClients,
  testCreateClient,
  testUpdateClientStatus,
} from "@/lib/consulting-test-mode";
import { COUNTRIES } from "@/data/countries";

/* ============================================================
   CRM Pipeline — Odoo-style kanban view over consulting_clients.
   Groups the fine-grained ClientApplicationStatus values into
   6 sales-pipeline stages. Dragging a card between stages writes
   back the canonical status for the target stage; the full
   Clients table page remains the place for granular status edits.
   ============================================================ */

interface PipelineStage {
  id: string;
  label: string;
  accent: string;
  statuses: ClientApplicationStatus[];
  canonical: ClientApplicationStatus;
}

const STAGES: PipelineStage[] = [
  { id: "new", label: "New", accent: "bg-sky-400", statuses: ["new_lead"], canonical: "new_lead" },
  {
    id: "contacted",
    label: "Contacted",
    accent: "bg-blue-400",
    statuses: ["contacted", "consultation_scheduled"],
    canonical: "contacted",
  },
  {
    id: "qualified",
    label: "Qualified",
    accent: "bg-purple-400",
    statuses: ["documents_requested", "documents_received"],
    canonical: "documents_requested",
  },
  {
    id: "proposition",
    label: "Proposition",
    accent: "bg-amber-400",
    statuses: ["under_review", "submitted", "waiting_for_result"],
    canonical: "under_review",
  },
  {
    id: "won",
    label: "Won",
    accent: "bg-emerald-400",
    statuses: ["approved", "travel_completed"],
    canonical: "approved",
  },
  {
    id: "lost",
    label: "Lost",
    accent: "bg-rose-400",
    statuses: ["rejected", "cancelled", "refunded"],
    canonical: "rejected",
  },
];

function stageOf(status: ClientApplicationStatus): PipelineStage {
  return STAGES.find((s) => s.statuses.includes(status)) ?? STAGES[0];
}

/** Dev-only: seeds a few sample leads the first time the local fallback is used, so the pipeline isn't empty. */
function seedLocalDevClientsIfEmpty(companyId: string): ConsultingClient[] {
  const existing = testFetchClients(companyId, { archived: false });
  if (existing.length > 0 || !import.meta.env.DEV) return existing;
  const samples: { full_name: string; phone: string; email: string; destination_country: string; application_status: ClientApplicationStatus }[] = [
    { full_name: "Madina Yusupova", phone: "+998 90 111 22 33", email: "madina.y@example.uz", destination_country: "Germany", application_status: "new_lead" },
    { full_name: "Jahongir Toirov", phone: "+998 93 222 33 44", email: "jahongir.t@example.uz", destination_country: "Poland", application_status: "new_lead" },
    { full_name: "Zilola Nematova", phone: "+998 97 333 44 55", email: "zilola.n@example.uz", destination_country: "South Korea", application_status: "contacted" },
    { full_name: "Shahnoza Ergasheva", phone: "+998 91 444 55 66", email: "shahnoza.e@example.uz", destination_country: "Germany", application_status: "documents_requested" },
    { full_name: "Bekzod Aliyev", phone: "+998 90 555 66 77", email: "bekzod.a@example.uz", destination_country: "Czech Republic", application_status: "under_review" },
    { full_name: "Diyorbek Sultonov", phone: "+998 99 666 77 88", email: "diyorbek.s@example.uz", destination_country: "Germany", application_status: "approved" },
    { full_name: "Kamola Isakova", phone: "+998 93 777 88 99", email: "kamola.i@example.uz", destination_country: "United Kingdom", application_status: "rejected" },
  ];
  for (const s of samples) {
    testCreateClient(
      companyId,
      { ...s, assigned_employee_id: "", payment_status: "pending", final_result: "pending" },
      "dev-seed",
    );
  }
  return testFetchClients(companyId, { archived: false });
}

function money(n: number | null | undefined): string {
  if (!n) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

interface LeadDraft {
  full_name: string;
  phone: string;
  email: string;
  destination_country: string;
}

const EMPTY_DRAFT: LeadDraft = { full_name: "", phone: "", email: "", destination_country: "" };

// Local-dev fallback company id: used only when there is no real
// consulting_company (no Supabase session yet). Keeps the pipeline
// usable via the localStorage-backed test-mode layer until a real
// agency/company is connected — same storage consulting-test-mode.ts
// already uses elsewhere in the dashboard.
const DEV_LOCAL_COMPANY_ID = "dev-local-company";

export default function CrmPipeline() {
  const { company, isTestMode } = useConsulting();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const hasRealCompany = !!company?.id;
  const companyId = company?.id ?? "";
  const useLocalLayer = isTestMode || !hasRealCompany;
  const effectiveCompanyId = hasRealCompany ? companyId : DEV_LOCAL_COMPANY_ID;

  useSEO({ title: "CRM Pipeline | OXEN Consulting", description: "Sales pipeline for your leads and clients" });

  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState<LeadDraft>(EMPTY_DRAFT);
  const [selected, setSelected] = useState<ConsultingClient | null>(null);

  const testClientsQ = useQuery({
    queryKey: ["crm-pipeline-clients-test", effectiveCompanyId],
    queryFn: () => seedLocalDevClientsIfEmpty(effectiveCompanyId),
    enabled: useLocalLayer,
    staleTime: 0,
  });

  const realClientsQ = useQuery({
    queryKey: ["crm-pipeline-clients", companyId],
    queryFn: () => fetchClients(companyId, { archived: false, pageSize: 200 }),
    enabled: !!companyId && !useLocalLayer,
  });

  const clients: ConsultingClient[] = useLocalLayer ? (testClientsQ.data ?? []) : realClientsQ.data?.clients ?? [];
  const isLoading = useLocalLayer ? testClientsQ.isLoading : realClientsQ.isLoading;

  const stats = useMemo(() => {
    const open = clients.filter((c) => {
      const stage = stageOf(c.application_status);
      return stage.id !== "won" && stage.id !== "lost";
    });
    const won = clients.filter((c) => stageOf(c.application_status).id === "won");
    const lost = clients.filter((c) => stageOf(c.application_status).id === "lost");
    const value = (list: ConsultingClient[]) =>
      list.reduce((s, c) => s + (c.service?.price ?? 0), 0);
    const closed = won.length + lost.length;
    return {
      open: open.length,
      openValue: value(open),
      won: won.length,
      wonValue: value(won),
      winRate: closed === 0 ? 0 : Math.round((won.length / closed) * 100),
    };
  }, [clients]);

  const columns: KanbanColumn<ConsultingClient>[] = useMemo(
    () =>
      STAGES.map((s) => ({
        id: s.id,
        title: s.label,
        accent: s.accent,
        items: clients.filter((c) => stageOf(c.application_status).id === s.id),
      })),
    [clients],
  );

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["crm-pipeline-clients", companyId] });
    queryClient.invalidateQueries({ queryKey: ["crm-pipeline-clients-test", effectiveCompanyId] });
    queryClient.invalidateQueries({ queryKey: ["consulting-clients"] });
  };

  const moveMutation = useMutation({
    mutationFn: async ({ client, toStageId }: { client: ConsultingClient; toStageId: string }) => {
      const stage = STAGES.find((s) => s.id === toStageId)!;
      if (useLocalLayer) {
        testUpdateClientStatus(effectiveCompanyId, client.id, stage.canonical, user?.id ?? "");
        return;
      }
      const res = await updateClientStatus(client.id, companyId, stage.canonical, user?.id ?? "");
      if (!res.ok) throw new Error(res.error ?? "Failed to move");
    },
    onSuccess: invalidate,
    onError: () => toast({ title: "Failed to move lead", variant: "destructive" }),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (useLocalLayer) {
        return testCreateClient(
          effectiveCompanyId,
          {
            ...draft,
            application_status: "new_lead",
            assigned_employee_id: "",
            payment_status: "pending",
            final_result: "pending",
          },
          user?.id ?? "",
        );
      }
      return createClient(companyId, { ...draft, application_status: "new_lead" }, user?.id ?? "");
    },
    onSuccess: () => {
      toast({ title: "Lead added to pipeline" });
      invalidate();
      setAddOpen(false);
      setDraft(EMPTY_DRAFT);
    },
    onError: () => toast({ title: "Failed to add lead", variant: "destructive" }),
  });

  return (
    <DashboardShell
      title="CRM Pipeline"
      subtitle="Drag leads through stages — from first contact to won"
      actions={
        <button
          onClick={() => setAddOpen(true)}
          className="flex shrink-0 items-center gap-1.5 rounded-xl gold-gradient px-3 py-2 text-xs font-bold text-primary-foreground transition active:scale-95"
        >
          <Plus className="h-3.5 w-3.5" /> New Lead
        </button>
      }
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 mb-6">
        <StatCard label="Open Leads" value={stats.open} icon={Target} accent="blue" delay={0} />
        <StatCard label="Open Pipeline Value" value={money(stats.openValue)} icon={DollarSign} accent="gold" delay={0.05} />
        <StatCard label="Won" value={`${stats.won} (${money(stats.wonValue)})`} icon={Trophy} accent="green" delay={0.1} />
        <StatCard label="Win Rate" value={`${stats.winRate}%`} icon={TrendingUp} accent="default" delay={0.15} />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : clients.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No leads yet"
          description="Add your first lead to start the pipeline."
          action={{ label: "New Lead", onClick: () => setAddOpen(true) }}
        />
      ) : (
        <KanbanBoard
          columns={columns}
          itemId={(c) => c.id}
          onMove={(item, _from, to) => moveMutation.mutate({ client: item, toStageId: to })}
          renderCard={(c) => (
            <button onClick={() => setSelected(c)} className="block w-full text-left">
              <p className="truncate text-sm font-bold text-foreground">{c.full_name}</p>
              {c.destination_country && (
                <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                  <MapPin className="h-3 w-3 shrink-0" /> {c.destination_country}
                </p>
              )}
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300">{money(c.service?.price)}</span>
                <span className="rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground">
                  {c.application_status.replace(/_/g, " ")}
                </span>
              </div>
            </button>
          )}
        />
      )}

      {/* Add lead */}
      <SlideOver
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="New Lead"
        subtitle="Add a prospective client to the pipeline"
        footer={
          <button
            onClick={() => createMutation.mutate()}
            disabled={!draft.full_name.trim() || createMutation.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-2xl gold-gradient py-3 text-sm font-bold text-primary-foreground transition active:scale-95 disabled:opacity-50"
          >
            {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create Lead
          </button>
        }
      >
        <div className="space-y-4">
          <Field label="Full Name" value={draft.full_name} onChange={(v) => setDraft((d) => ({ ...d, full_name: v }))} required />
          <Field label="Phone" type="tel" value={draft.phone} onChange={(v) => setDraft((d) => ({ ...d, phone: v }))} />
          <Field label="Email" type="email" value={draft.email} onChange={(v) => setDraft((d) => ({ ...d, email: v }))} />
          <SelectField
            label="Destination Country"
            value={draft.destination_country}
            onChange={(v) => setDraft((d) => ({ ...d, destination_country: v }))}
            options={[{ value: "", label: "—" }, ...COUNTRIES.map((c) => ({ value: c.name, label: c.name }))]}
          />
        </div>
      </SlideOver>

      {/* Lead quick view */}
      <SlideOver open={!!selected} onClose={() => setSelected(null)} title={selected?.full_name ?? ""} subtitle={selected?.destination_country ?? undefined}>
        {selected && (
          <div className="space-y-3">
            {selected.email && (
              <div className="flex items-center gap-2 rounded-xl bg-white/[0.04] p-3 text-sm">
                <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> <span className="truncate">{selected.email}</span>
              </div>
            )}
            {selected.phone && (
              <div className="flex items-center gap-2 rounded-xl bg-white/[0.04] p-3 text-sm">
                <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> <span className="truncate">{selected.phone}</span>
              </div>
            )}
            {selected.service && (
              <div className="flex items-center gap-2 rounded-xl bg-white/[0.04] p-3 text-sm">
                <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> <span className="truncate">{selected.service.title}</span>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Full status editing, notes and history are available on the{" "}
              <a href="/consulting/clients" className="text-amber-300 underline">
                Clients
              </a>{" "}
              page.
            </p>
          </div>
        )}
      </SlideOver>
    </DashboardShell>
  );
}
