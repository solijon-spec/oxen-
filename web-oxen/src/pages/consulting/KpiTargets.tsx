import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Target, Plus, Trash2, Loader2, Users, MapPin, TrendingUp } from "lucide-react";

import { DashboardShell } from "@/components/consulting/DashboardShell";
import { EmptyState } from "@/components/consulting/EmptyState";
import { SlideOver } from "@/components/consulting/SlideOver";
import { ConfirmDialog } from "@/components/consulting/ConfirmDialog";
import { Field, SelectField } from "@/components/consulting/Field";
import { useConsulting } from "@/contexts/ConsultingContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSEO } from "@/hooks/use-seo";
import { toast } from "@/hooks/use-toast";
import { fetchMembers } from "@/lib/consulting";
import {
  fetchKpiProgress,
  upsertKpiTarget,
  deleteKpiTarget,
  currentPeriod,
  type KpiTargetType,
  type KpiProgress,
} from "@/lib/kpi";
import { COUNTRIES } from "@/data/countries";

function money(n: number, currency: string): string {
  return `${n.toLocaleString()} ${currency}`;
}

function monthLabel(period: string): string {
  const [y, m] = period.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

interface Draft {
  target_type: KpiTargetType;
  employee_id: string;
  tour_type: string;
  target_amount: string;
  currency: string;
}

const EMPTY_DRAFT: Draft = { target_type: "employee", employee_id: "", tour_type: "", target_amount: "", currency: "UZS" };

export default function KpiTargets() {
  const { company, can } = useConsulting();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const companyId = company?.id ?? "";
  const canWrite = can("settings:write");
  const period = currentPeriod();

  useSEO({ title: "KPI Targets | OXEN Consulting", description: "Monthly sales targets per employee and tour type" });

  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [deleteTarget, setDeleteTarget] = useState<KpiProgress | null>(null);

  const membersQ = useQuery({
    queryKey: ["kpi-members", companyId],
    queryFn: () => fetchMembers(companyId),
    enabled: !!companyId,
  });
  const members = membersQ.data ?? [];

  const progressQ = useQuery({
    queryKey: ["kpi-progress", companyId, period],
    queryFn: () => fetchKpiProgress(companyId, period),
    enabled: !!companyId,
  });
  const progress = progressQ.data ?? [];

  const employeeTargets = useMemo(() => progress.filter((p) => p.target.target_type === "employee"), [progress]);
  const tourTargets = useMemo(() => progress.filter((p) => p.target.target_type === "tour_type"), [progress]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["kpi-progress", companyId, period] });

  const createMutation = useMutation({
    mutationFn: () => {
      const employee = members.find((m) => m.user_id === draft.employee_id);
      return upsertKpiTarget(companyId, user?.id ?? "", {
        period,
        target_type: draft.target_type,
        employee_id: draft.target_type === "employee" ? draft.employee_id : null,
        employee_name: employee?.profile?.name ?? null,
        tour_type: draft.target_type === "tour_type" ? draft.tour_type : null,
        target_amount: Number(draft.target_amount) || 0,
        currency: draft.currency,
      });
    },
    onSuccess: ({ error }) => {
      if (error) {
        toast({ title: "Failed to save target", description: error, variant: "destructive" });
        return;
      }
      toast({ title: "KPI target saved" });
      invalidate();
      setAddOpen(false);
      setDraft(EMPTY_DRAFT);
    },
    onError: () => toast({ title: "Failed to save target", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteKpiTarget(id),
    onSuccess: () => {
      toast({ title: "KPI target removed" });
      invalidate();
      setDeleteTarget(null);
    },
  });

  const canSave =
    draft.target_type === "employee"
      ? !!draft.employee_id && Number(draft.target_amount) > 0
      : !!draft.tour_type && Number(draft.target_amount) > 0;

  return (
    <DashboardShell
      title="KPI Targets"
      subtitle={`Monthly sales targets — ${monthLabel(period)}`}
      actions={
        canWrite && (
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-1.5 rounded-xl gold-gradient px-3 py-2 text-xs font-bold text-primary-foreground transition active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" /> New Target
          </button>
        )
      }
    >
      {progressQ.isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : progress.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No KPI targets yet"
          description="Set a monthly sales target per employee or per tour type to track performance."
          action={canWrite ? { label: "New Target", onClick: () => setAddOpen(true) } : undefined}
        />
      ) : (
        <div className="space-y-6">
          {employeeTargets.length > 0 && (
            <section>
              <h3 className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                <Users className="h-3.5 w-3.5" /> By Employee
              </h3>
              <div className="space-y-2.5">
                {employeeTargets.map((p) => (
                  <ProgressRow key={p.target.id} p={p} onDelete={canWrite ? () => setDeleteTarget(p) : undefined} />
                ))}
              </div>
            </section>
          )}
          {tourTargets.length > 0 && (
            <section>
              <h3 className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" /> By Tour Type
              </h3>
              <div className="space-y-2.5">
                {tourTargets.map((p) => (
                  <ProgressRow key={p.target.id} p={p} onDelete={canWrite ? () => setDeleteTarget(p) : undefined} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <SlideOver
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="New KPI Target"
        subtitle={monthLabel(period)}
        footer={
          <button
            onClick={() => createMutation.mutate()}
            disabled={!canSave || createMutation.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-2xl gold-gradient py-3 text-sm font-bold text-primary-foreground transition active:scale-95 disabled:opacity-50"
          >
            {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Target
          </button>
        }
      >
        <div className="space-y-4">
          <SelectField
            label="Target Type"
            value={draft.target_type}
            onChange={(v) => setDraft((d) => ({ ...d, target_type: v }))}
            options={[
              { value: "employee", label: "Employee" },
              { value: "tour_type", label: "Tour Type" },
            ]}
          />
          {draft.target_type === "employee" ? (
            <SelectField
              label="Employee"
              value={draft.employee_id}
              onChange={(v) => setDraft((d) => ({ ...d, employee_id: v }))}
              options={[
                { value: "", label: "Select employee…" },
                ...members.map((m) => ({ value: m.user_id, label: m.profile?.name ?? m.user_id })),
              ]}
            />
          ) : (
            <SelectField
              label="Tour Destination"
              value={draft.tour_type}
              onChange={(v) => setDraft((d) => ({ ...d, tour_type: v }))}
              options={[{ value: "", label: "Select country…" }, ...COUNTRIES.map((c) => ({ value: c.name, label: c.name }))]}
            />
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Target Amount"
              type="number"
              value={draft.target_amount}
              onChange={(v) => setDraft((d) => ({ ...d, target_amount: v }))}
            />
            <Field label="Currency" value={draft.currency} onChange={(v) => setDraft((d) => ({ ...d, currency: v }))} />
          </div>
        </div>
      </SlideOver>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Remove KPI target?"
        message={`This will remove the target for "${deleteTarget?.label}".`}
        confirmLabel="Remove"
        destructive
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.target.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </DashboardShell>
  );
}

function ProgressRow({ p, onDelete }: { p: KpiProgress; onDelete?: () => void }) {
  const pct = Math.min(100, p.percent);
  const over = p.percent >= 100;
  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="truncate text-sm font-bold text-foreground">{p.label}</p>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold ${over ? "text-emerald-400" : "text-amber-300"}`}>{p.percent}%</span>
          {onDelete && (
            <button onClick={onDelete} className="flex h-7 w-7 items-center justify-center rounded-lg bg-destructive/10 text-destructive transition hover:bg-destructive/15">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
      <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className={`h-full rounded-full transition-all ${over ? "bg-emerald-400" : "bg-primary"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <TrendingUp className="h-3 w-3" /> {money(p.actual_amount, p.target.currency)} sold ({p.actual_count})
        </span>
        <span>target: {money(p.target.target_amount, p.target.currency)}</span>
      </div>
    </div>
  );
}
