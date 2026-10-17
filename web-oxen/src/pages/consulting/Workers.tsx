import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Users, Mail, Phone, FileText, Trash2, Loader2, UserCheck } from "lucide-react";

import { DashboardShell } from "@/components/consulting/DashboardShell";
import { KanbanBoard, type KanbanColumn } from "@/components/consulting/KanbanBoard";
import { StatCard } from "@/components/consulting/StatCard";
import { SlideOver } from "@/components/consulting/SlideOver";
import { EmptyState } from "@/components/consulting/EmptyState";
import { ConfirmDialog } from "@/components/consulting/ConfirmDialog";
import { useConsulting } from "@/contexts/ConsultingContext";
import { useSEO } from "@/hooks/use-seo";
import { toast } from "@/hooks/use-toast";
import {
  fetchCompanyApplications,
  updateApplicationStage,
  deleteApplication,
  APPLICATION_STAGES,
  type VacancyApplication,
  type ApplicationStage,
} from "@/lib/vacancies";

/* ============================================================
   Workers — CRM pipeline for job applicants (Odoo Recruitment
   style): New -> Screening -> Interview -> Offer -> Hired/Rejected.
   Reads consulting_vacancy_applications across every vacancy the
   agency has posted.
   ============================================================ */

// Same local-dev fallback company id used by CrmPipeline.tsx, so the
// two pipelines share one consistent dev dataset until a real agency
// is connected.
const DEV_LOCAL_COMPANY_ID = "dev-local-company";

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return "—";
  }
}

export default function ConsultingWorkers() {
  const { company } = useConsulting();
  const queryClient = useQueryClient();
  const companyId = company?.id || DEV_LOCAL_COMPANY_ID;

  useSEO({ title: "Workers | OXEN Consulting", description: "Recruitment pipeline for job applicants" });

  const [selected, setSelected] = useState<VacancyApplication | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<VacancyApplication | null>(null);

  const appsQ = useQuery({
    queryKey: ["consulting-worker-applications", companyId],
    queryFn: () => fetchCompanyApplications(companyId),
  });

  const applications = appsQ.data ?? [];

  const stats = useMemo(() => {
    const open = applications.filter((a) => a.stage !== "hired" && a.stage !== "rejected");
    const hired = applications.filter((a) => a.stage === "hired");
    const interview = applications.filter((a) => a.stage === "interview" || a.stage === "offer");
    return { total: applications.length, open: open.length, hired: hired.length, interview: interview.length };
  }, [applications]);

  const columns: KanbanColumn<VacancyApplication>[] = useMemo(
    () =>
      APPLICATION_STAGES.map((s) => ({
        id: s.value,
        title: s.label,
        accent: s.accent,
        items: applications.filter((a) => a.stage === s.value),
      })),
    [applications],
  );

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["consulting-worker-applications", companyId] });

  const moveMutation = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: ApplicationStage }) => updateApplicationStage(id, stage),
    onSuccess: invalidate,
    onError: () => toast({ title: "Failed to move applicant", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteApplication(id),
    onSuccess: () => {
      toast({ title: "Application removed" });
      invalidate();
      setDeleteTarget(null);
      setSelected(null);
    },
    onError: () => toast({ title: "Failed to remove application", variant: "destructive" }),
  });

  return (
    <DashboardShell title="Workers" subtitle="Recruitment pipeline — applicants from your published vacancies">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 mb-6">
        <StatCard label="Total Applicants" value={stats.total} icon={Users} accent="blue" delay={0} />
        <StatCard label="In Progress" value={stats.open} icon={UserCheck} accent="default" delay={0.05} />
        <StatCard label="In Interview/Offer" value={stats.interview} icon={UserCheck} accent="gold" delay={0.1} />
        <StatCard label="Hired" value={stats.hired} icon={UserCheck} accent="green" delay={0.15} />
      </div>

      {appsQ.isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : applications.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No applicants yet"
          description="Applications submitted to your published vacancies will show up here."
        />
      ) : (
        <KanbanBoard
          columns={columns}
          itemId={(a) => a.id}
          onMove={(item, _from, to) => moveMutation.mutate({ id: item.id, stage: to as ApplicationStage })}
          renderCard={(a) => (
            <button onClick={() => setSelected(a)} className="block w-full text-left">
              <p className="truncate text-sm font-bold text-foreground">{a.full_name}</p>
              {a.vacancy?.title && (
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{a.vacancy.title}</p>
              )}
              <p className="mt-2 text-[10px] text-muted-foreground/70">{formatDate(a.created_at)}</p>
            </button>
          )}
        />
      )}

      <SlideOver open={!!selected} onClose={() => setSelected(null)} title={selected?.full_name ?? ""} subtitle={selected?.vacancy?.title ?? undefined}
        footer={
          selected && (
            <button
              onClick={() => setDeleteTarget(selected)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-destructive/10 py-3 text-sm font-bold text-destructive transition hover:bg-destructive/15"
            >
              <Trash2 className="h-4 w-4" /> Remove Application
            </button>
          )
        }
      >
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
            {selected.resume_url && (
              <a href={selected.resume_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl bg-white/[0.04] p-3 text-sm text-amber-300 hover:underline">
                <FileText className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">Resume / CV link</span>
              </a>
            )}
            {selected.cover_note && (
              <div className="rounded-xl bg-white/[0.04] p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Cover Note</p>
                <p className="text-sm text-foreground/90 whitespace-pre-wrap">{selected.cover_note}</p>
              </div>
            )}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {APPLICATION_STAGES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => moveMutation.mutate({ id: selected.id, stage: s.value })}
                  disabled={selected.stage === s.value}
                  className={
                    selected.stage === s.value
                      ? "rounded-full bg-primary/20 px-3 py-1 text-[11px] font-bold text-primary cursor-default"
                      : "rounded-full bg-white/[0.04] px-3 py-1 text-[11px] font-semibold text-muted-foreground transition hover:bg-white/[0.08]"
                  }
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </SlideOver>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Remove application?"
        message={`This will permanently remove "${deleteTarget?.full_name}"'s application.`}
        confirmLabel="Remove"
        destructive
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </DashboardShell>
  );
}
