import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Target,
  Plus,
  Trash2,
  Phone,
  Mail,
  Building2,
  DollarSign,
  TrendingUp,
  Trophy,
  XCircle,
  Loader2,
  CalendarClock,
  StickyNote,
  CheckSquare,
  PhoneCall,
  Users as UsersIcon,
} from "lucide-react";

import { OwnerShell } from "@/components/consulting/OwnerShell";
import { KanbanBoard, type KanbanColumn } from "@/components/consulting/KanbanBoard";
import { StatCard } from "@/components/consulting/StatCard";
import { SlideOver } from "@/components/consulting/SlideOver";
import { EmptyState } from "@/components/consulting/EmptyState";
import { ConfirmDialog } from "@/components/consulting/ConfirmDialog";
import { Field, SelectField } from "@/components/consulting/Field";
import { useAuth } from "@/contexts/AuthContext";
import { useSEO } from "@/hooks/use-seo";
import { toast } from "@/hooks/use-toast";
import {
  fetchOwnerCrmLeads,
  createOwnerCrmLead,
  updateOwnerCrmLead,
  moveOwnerCrmLeadStage,
  deleteOwnerCrmLead,
  computeOwnerCrmStats,
  fetchOwnerCrmActivities,
  addOwnerCrmActivity,
  toggleOwnerCrmActivityDone,
  CRM_STAGES,
  type OwnerCrmLead,
  type CrmStage,
  type OwnerCrmActivityType,
} from "@/lib/owner-crm";
import { cn } from "@/lib/utils";

function money(n: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n || 0);
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return "—";
  }
}

const EMPTY_LEAD: OwnerCrmLeadDraft = {
  name: "",
  company_name: "",
  email: "",
  phone: "",
  source: "",
  stage: "new",
  expected_value: 0,
  currency: "USD",
  probability: 20,
  expected_close_date: "",
  notes: "",
};

interface OwnerCrmLeadDraft {
  name: string;
  company_name: string;
  email: string;
  phone: string;
  source: string;
  stage: CrmStage;
  expected_value: number;
  currency: string;
  probability: number;
  expected_close_date: string;
  notes: string;
}

const ACTIVITY_ICONS: Record<OwnerCrmActivityType["type"], React.ComponentType<{ className?: string }>> = {
  call: PhoneCall,
  meeting: UsersIcon,
  email: Mail,
  task: CheckSquare,
  note: StickyNote,
};

/**
 * OwnerCRM — platform-level sales pipeline (Odoo CRM style) for
 * the OXEN owners: leads move New -> Contacted -> Qualified ->
 * Proposition -> Won/Lost on a drag-and-drop kanban board.
 */
export default function OwnerCRM() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  useSEO({ title: "CRM | OXEN Owner", description: "Platform sales pipeline." });

  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState<OwnerCrmLeadDraft>(EMPTY_LEAD);
  const [selected, setSelected] = useState<OwnerCrmLead | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OwnerCrmLead | null>(null);
  const [newActivity, setNewActivity] = useState({ type: "note" as OwnerCrmActivityType["type"], title: "", body: "" });

  const leadsQ = useQuery({
    queryKey: ["owner-crm-leads"],
    queryFn: fetchOwnerCrmLeads,
    staleTime: 10_000,
  });

  const activitiesQ = useQuery({
    queryKey: ["owner-crm-activities", selected?.id],
    queryFn: () => fetchOwnerCrmActivities(selected!.id),
    enabled: !!selected,
  });

  const leads = leadsQ.data ?? [];
  const stats = useMemo(() => computeOwnerCrmStats(leads), [leads]);

  const columns: KanbanColumn<OwnerCrmLead>[] = useMemo(
    () =>
      CRM_STAGES.map((s) => ({
        id: s.value,
        title: s.label,
        accent: s.accent,
        items: leads.filter((l) => l.stage === s.value),
      })),
    [leads],
  );

  const moveMutation = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: CrmStage }) => moveOwnerCrmLeadStage(id, stage),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["owner-crm-leads"] }),
    onError: () => toast({ title: "Failed to move lead", variant: "destructive" }),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createOwnerCrmLead(
        {
          name: draft.name,
          company_name: draft.company_name || null,
          email: draft.email || null,
          phone: draft.phone || null,
          source: draft.source || null,
          stage: draft.stage,
          expected_value: Number(draft.expected_value) || 0,
          currency: draft.currency,
          probability: Number(draft.probability) || 0,
          expected_close_date: draft.expected_close_date || null,
          notes: draft.notes || null,
        },
        user?.id ?? "",
      ),
    onSuccess: () => {
      toast({ title: "Lead created" });
      queryClient.invalidateQueries({ queryKey: ["owner-crm-leads"] });
      setAddOpen(false);
      setDraft(EMPTY_LEAD);
    },
    onError: () => toast({ title: "Failed to create lead", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: (input: Partial<OwnerCrmLead>) => updateOwnerCrmLead(selected!.id, input),
    onSuccess: (updated) => {
      toast({ title: "Lead updated" });
      queryClient.invalidateQueries({ queryKey: ["owner-crm-leads"] });
      if (updated) setSelected(updated);
    },
    onError: () => toast({ title: "Failed to update lead", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteOwnerCrmLead(id),
    onSuccess: () => {
      toast({ title: "Lead deleted" });
      queryClient.invalidateQueries({ queryKey: ["owner-crm-leads"] });
      setDeleteTarget(null);
      setSelected(null);
    },
    onError: () => toast({ title: "Failed to delete lead", variant: "destructive" }),
  });

  const addActivityMutation = useMutation({
    mutationFn: () =>
      addOwnerCrmActivity({
        leadId: selected!.id,
        type: newActivity.type,
        title: newActivity.title,
        body: newActivity.body || null,
        createdBy: user?.id ?? "",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner-crm-activities", selected?.id] });
      setNewActivity({ type: "note", title: "", body: "" });
    },
    onError: () => toast({ title: "Failed to add activity", variant: "destructive" }),
  });

  const toggleActivityMutation = useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) => toggleOwnerCrmActivityDone(id, done),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["owner-crm-activities", selected?.id] }),
  });

  return (
    <OwnerShell
      title="CRM"
      subtitle="Platform sales pipeline — track prospective agencies & partners"
      actions={
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-1.5 rounded-xl bg-amber-500/15 px-3 py-2 text-xs font-bold text-amber-300 transition hover:bg-amber-500/25"
        >
          <Plus className="h-3.5 w-3.5" /> New Lead
        </button>
      }
    >
      {/* Pipeline stats */}
      <section>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Open Leads" value={stats.totalOpen} icon={Target} accent="blue" delay={0} />
          <StatCard label="Open Pipeline Value" value={money(stats.openValue)} icon={DollarSign} accent="gold" delay={0.05} />
          <StatCard label="Won" value={`${stats.wonCount} (${money(stats.wonValue)})`} icon={Trophy} accent="green" delay={0.1} />
          <StatCard label="Win Rate" value={`${stats.winRate}%`} icon={TrendingUp} accent="default" delay={0.15} />
        </div>
      </section>

      {/* Kanban pipeline */}
      <section className="mt-8">
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Pipeline
        </h3>
        {leadsQ.isLoading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : leads.length === 0 ? (
          <EmptyState
            icon={Target}
            title="No leads yet"
            description="Add your first sales lead to start tracking the pipeline."
            action={{ label: "New Lead", onClick: () => setAddOpen(true) }}
          />
        ) : (
          <KanbanBoard
            columns={columns}
            itemId={(l) => l.id}
            onMove={(item, _from, to) => moveMutation.mutate({ id: item.id, stage: to as CrmStage })}
            renderCard={(lead) => (
              <button onClick={() => setSelected(lead)} className="block w-full text-left">
                <p className="truncate text-sm font-bold text-foreground">{lead.name}</p>
                {lead.company_name && (
                  <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                    <Building2 className="h-3 w-3 shrink-0" /> {lead.company_name}
                  </p>
                )}
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300">{money(lead.expected_value, lead.currency)}</span>
                  <span className="rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground">
                    {lead.probability}%
                  </span>
                </div>
              </button>
            )}
          />
        )}
      </section>

      {/* Add lead slide-over */}
      <SlideOver
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="New Lead"
        subtitle="Add a prospective agency or partner to the pipeline"
        footer={
          <button
            onClick={() => createMutation.mutate()}
            disabled={!draft.name.trim() || createMutation.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-2xl gold-gradient py-3 text-sm font-bold text-primary-foreground transition active:scale-95 disabled:opacity-50"
          >
            {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create Lead
          </button>
        }
      >
        <div className="space-y-4">
          <Field label="Contact Name" value={draft.name} onChange={(v) => setDraft((d) => ({ ...d, name: v }))} required />
          <Field label="Company" value={draft.company_name} onChange={(v) => setDraft((d) => ({ ...d, company_name: v }))} />
          <Field label="Email" type="email" value={draft.email} onChange={(v) => setDraft((d) => ({ ...d, email: v }))} />
          <Field label="Phone" type="tel" value={draft.phone} onChange={(v) => setDraft((d) => ({ ...d, phone: v }))} />
          <Field label="Source" value={draft.source} onChange={(v) => setDraft((d) => ({ ...d, source: v }))} placeholder="Referral, website, event…" />
          <SelectField
            label="Stage"
            value={draft.stage}
            onChange={(v) => setDraft((d) => ({ ...d, stage: v }))}
            options={CRM_STAGES.map((s) => ({ value: s.value, label: s.label }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Expected Value (USD)"
              type="number"
              value={String(draft.expected_value)}
              onChange={(v) => setDraft((d) => ({ ...d, expected_value: Number(v) || 0 }))}
            />
            <Field
              label="Probability (%)"
              type="number"
              value={String(draft.probability)}
              onChange={(v) => setDraft((d) => ({ ...d, probability: Number(v) || 0 }))}
            />
          </div>
          <Field
            label="Expected Close Date"
            type="date"
            value={draft.expected_close_date}
            onChange={(v) => setDraft((d) => ({ ...d, expected_close_date: v }))}
          />
          <Field label="Notes" type="textarea" value={draft.notes} onChange={(v) => setDraft((d) => ({ ...d, notes: v }))} />
        </div>
      </SlideOver>

      {/* Lead detail slide-over */}
      <SlideOver
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.name ?? ""}
        subtitle={selected?.company_name ?? undefined}
        width="max-w-lg"
        footer={
          selected && (
            <button
              onClick={() => setDeleteTarget(selected)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-destructive/10 py-3 text-sm font-bold text-destructive transition hover:bg-destructive/15"
            >
              <Trash2 className="h-4 w-4" /> Delete Lead
            </button>
          )
        }
      >
        {selected && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              {selected.email && (
                <div className="flex items-center gap-2 rounded-xl bg-white/[0.04] p-3 text-sm">
                  <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{selected.email}</span>
                </div>
              )}
              {selected.phone && (
                <div className="flex items-center gap-2 rounded-xl bg-white/[0.04] p-3 text-sm">
                  <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{selected.phone}</span>
                </div>
              )}
            </div>

            <SelectField
              label="Stage"
              value={selected.stage}
              onChange={(v) => updateMutation.mutate({ stage: v })}
              options={CRM_STAGES.map((s) => ({ value: s.value, label: s.label }))}
            />

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-white/[0.04] p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Expected Value</p>
                <p className="mt-1 font-display text-lg font-bold text-amber-300">
                  {money(selected.expected_value, selected.currency)}
                </p>
              </div>
              <div className="rounded-xl bg-white/[0.04] p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Probability</p>
                <p className="mt-1 font-display text-lg font-bold text-foreground">{selected.probability}%</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CalendarClock className="h-3.5 w-3.5" /> Expected close: {formatDate(selected.expected_close_date)}
            </div>

            {selected.notes && (
              <div className="rounded-xl bg-white/[0.04] p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Notes</p>
                <p className="text-sm text-foreground/90 whitespace-pre-wrap">{selected.notes}</p>
              </div>
            )}

            {/* Activities */}
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Activities
              </p>
              <div className="space-y-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <div className="flex gap-2">
                  <select
                    value={newActivity.type}
                    onChange={(e) =>
                      setNewActivity((a) => ({ ...a, type: e.target.value as OwnerCrmActivityType["type"] }))
                    }
                    className="rounded-lg border border-input bg-background/50 px-2 py-2 text-xs"
                  >
                    {(["note", "call", "meeting", "email", "task"] as const).map((t) => (
                      <option key={t} value={t} className="bg-[#0f172a] text-white">
                        {t}
                      </option>
                    ))}
                  </select>
                  <input
                    value={newActivity.title}
                    onChange={(e) => setNewActivity((a) => ({ ...a, title: e.target.value }))}
                    placeholder="Quick note or activity title…"
                    className="flex-1 rounded-lg border border-input bg-background/50 px-3 py-2 text-xs"
                  />
                  <button
                    onClick={() => addActivityMutation.mutate()}
                    disabled={!newActivity.title.trim() || addActivityMutation.isPending}
                    className="shrink-0 rounded-lg bg-amber-500/15 px-3 py-2 text-xs font-bold text-amber-300 transition hover:bg-amber-500/25 disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>

                <div className="space-y-1.5 pt-1">
                  {(activitiesQ.data ?? []).length === 0 && (
                    <p className="py-3 text-center text-[11px] text-muted-foreground">No activities yet</p>
                  )}
                  {(activitiesQ.data ?? []).map((a) => {
                    const Icon = ACTIVITY_ICONS[a.type];
                    return (
                      <div key={a.id} className="flex items-start gap-2 rounded-lg bg-white/[0.03] p-2.5">
                        <button
                          onClick={() => toggleActivityMutation.mutate({ id: a.id, done: !a.done })}
                          className={cn(
                            "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                            a.done ? "border-emerald-400 bg-emerald-400/20 text-emerald-400" : "border-white/20",
                          )}
                        >
                          {a.done && <CheckSquare className="h-3 w-3" />}
                        </button>
                        <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p className={cn("truncate text-xs font-semibold", a.done && "text-muted-foreground line-through")}>
                            {a.title}
                          </p>
                          {a.body && <p className="mt-0.5 text-[11px] text-muted-foreground">{a.body}</p>}
                          <p className="mt-0.5 text-[10px] text-muted-foreground/60">{formatDate(a.created_at)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </SlideOver>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete lead?"
        message={`This will permanently remove "${deleteTarget?.name}" from the pipeline.`}
        confirmLabel="Delete"
        destructive
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </OwnerShell>
  );
}
