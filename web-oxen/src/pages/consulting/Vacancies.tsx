import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Briefcase,
  Plus,
  MapPin,
  Users,
  Eye,
  Trash2,
  Loader2,
  DollarSign,
  Edit3,
  ExternalLink,
} from "lucide-react";

import { DashboardShell } from "@/components/consulting/DashboardShell";
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
  fetchAgencyVacancies,
  upsertVacancy,
  deleteVacancy,
  setVacancyStatus,
  EMPLOYMENT_TYPE_LABELS,
  EXPERIENCE_LEVEL_LABELS,
  type Vacancy,
  type VacancyInput,
  type VacancyStatus,
  type EmploymentType,
  type ExperienceLevel,
} from "@/lib/vacancies";
import { cn } from "@/lib/utils";

function money(n: number | null, currency: string): string {
  if (!n) return "—";
  return `${n.toLocaleString()} ${currency}`;
}

function salaryRange(v: Vacancy): string {
  if (v.salary_is_negotiable && !v.salary_min && !v.salary_max) return "Negotiable";
  if (v.salary_min && v.salary_max) return `${money(v.salary_min, v.currency)} – ${money(v.salary_max, v.currency)}`;
  if (v.salary_min) return `${money(v.salary_min, v.currency)}+`;
  if (v.salary_max) return `Up to ${money(v.salary_max, v.currency)}`;
  return "—";
}

const EMPTY_DRAFT: VacancyInput = {
  title: "",
  description: "",
  department: "",
  employment_type: "full_time",
  experience_level: "any",
  location_city: "",
  location_country: "",
  requirements: "",
  responsibilities: "",
  benefits: "",
  salary_min: undefined,
  salary_max: undefined,
  currency: "UZS",
  salary_is_negotiable: false,
  openings_count: 1,
  contact_email: "",
  contact_phone: "",
  status: "draft",
};

// Local-dev fallback company id: used only when there is no real
// consulting_company (no Supabase session yet) — same convention as
// CrmPipeline.tsx and Workers.tsx, so all three dev datasets line up.
const DEV_LOCAL_COMPANY_ID = "dev-local-company";

export default function ConsultingVacancies() {
  const { company, can } = useConsulting();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const hasRealCompany = !!company?.id;
  const companyId = hasRealCompany ? company!.id : DEV_LOCAL_COMPANY_ID;
  // Without a real company/role yet (dev-local fallback), there is no
  // member role to check permissions against — default to allowing
  // writes so the page is usable before Supabase is connected.
  const canWrite = hasRealCompany ? can("vacancies:write") : true;

  useSEO({ title: "Vacancies | OXEN Consulting", description: "Post job openings for your agency" });

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Vacancy | null>(null);
  const [draft, setDraft] = useState<VacancyInput>(EMPTY_DRAFT);
  const [deleteTarget, setDeleteTarget] = useState<Vacancy | null>(null);

  const vacanciesQ = useQuery({
    queryKey: ["consulting-vacancies", companyId],
    queryFn: () => fetchAgencyVacancies(companyId),
    enabled: !!companyId,
  });

  const vacancies = vacanciesQ.data ?? [];

  const stats = useMemo(() => {
    const published = vacancies.filter((v) => v.status === "published");
    const totalOpenings = published.reduce((s, v) => s + v.openings_count, 0);
    const totalViews = vacancies.reduce((s, v) => s + v.views, 0);
    return { total: vacancies.length, published: published.length, totalOpenings, totalViews };
  }, [vacancies]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["consulting-vacancies", companyId] });

  const openCreate = () => {
    setEditing(null);
    setDraft(EMPTY_DRAFT);
    setEditorOpen(true);
  };

  const openEdit = (v: Vacancy) => {
    setEditing(v);
    setDraft({
      title: v.title,
      description: v.description,
      department: v.department ?? "",
      employment_type: v.employment_type,
      experience_level: v.experience_level,
      location_city: v.location_city ?? "",
      location_country: v.location_country ?? "",
      requirements: v.requirements ?? "",
      responsibilities: v.responsibilities ?? "",
      benefits: v.benefits ?? "",
      salary_min: v.salary_min ?? undefined,
      salary_max: v.salary_max ?? undefined,
      currency: v.currency,
      salary_is_negotiable: v.salary_is_negotiable,
      openings_count: v.openings_count,
      contact_email: v.contact_email ?? "",
      contact_phone: v.contact_phone ?? "",
      status: v.status,
    });
    setEditorOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: (status: VacancyStatus) =>
      upsertVacancy(companyId, user?.id ?? "", { ...draft, status }, editing?.id),
    onSuccess: ({ error }) => {
      if (error) {
        toast({ title: "Failed to save", description: error, variant: "destructive" });
        return;
      }
      toast({ title: editing ? "Vacancy updated" : "Vacancy created" });
      invalidate();
      setEditorOpen(false);
    },
    onError: () => toast({ title: "Failed to save vacancy", variant: "destructive" }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: VacancyStatus }) => setVacancyStatus(id, status, companyId),
    onSuccess: invalidate,
    onError: () => toast({ title: "Failed to update status", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteVacancy(id, companyId),
    onSuccess: () => {
      toast({ title: "Vacancy deleted" });
      invalidate();
      setDeleteTarget(null);
    },
    onError: () => toast({ title: "Failed to delete vacancy", variant: "destructive" }),
  });

  return (
    <DashboardShell
      title="Vacancies"
      subtitle="Post job openings — published ones appear on the public /jobs page"
      actions={
        canWrite && (
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 rounded-xl gold-gradient px-3 py-2 text-xs font-bold text-primary-foreground transition active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" /> New Vacancy
          </button>
        )
      }
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 mb-6">
        <div className="glass rounded-2xl p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Total</p>
          <p className="mt-1.5 font-display text-2xl font-extrabold">{stats.total}</p>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Published</p>
          <p className="mt-1.5 font-display text-2xl font-extrabold text-emerald-400">{stats.published}</p>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Open Positions</p>
          <p className="mt-1.5 font-display text-2xl font-extrabold text-amber-300">{stats.totalOpenings}</p>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Total Views</p>
          <p className="mt-1.5 font-display text-2xl font-extrabold">{stats.totalViews}</p>
        </div>
      </div>

      {vacanciesQ.isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : vacancies.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No vacancies yet"
          description="Post your first job opening to start receiving applications."
          action={canWrite ? { label: "New Vacancy", onClick: openCreate } : undefined}
        />
      ) : (
        <div className="space-y-2.5">
          {vacancies.map((v) => (
            <div key={v.id} className="glass rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-display text-base font-bold truncate">{v.title}</p>
                    <StatusBadge status={v.status} />
                  </div>
                  <div className="mt-1.5 flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Briefcase className="h-3 w-3" /> {EMPLOYMENT_TYPE_LABELS[v.employment_type]}
                    </span>
                    {(v.location_city || v.location_country) && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {[v.location_city, v.location_country].filter(Boolean).join(", ")}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" /> {salaryRange(v)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" /> {v.openings_count} opening{v.openings_count > 1 ? "s" : ""}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" /> {v.views}
                    </span>
                  </div>
                </div>
                {canWrite && (
                  <div className="flex shrink-0 items-center gap-1.5">
                    {v.status === "published" && (
                      <a
                        href={`/vacancy/${v.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06] text-muted-foreground transition hover:bg-white/[0.12] hover:text-foreground"
                        title="View public page"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                    <button
                      onClick={() => openEdit(v)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06] text-muted-foreground transition hover:bg-white/[0.12] hover:text-foreground"
                      title="Edit"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(v)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10 text-destructive transition hover:bg-destructive/15"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
              {canWrite && (
                <div className="mt-3 flex items-center gap-2 border-t border-white/[0.06] pt-3">
                  {(["draft", "published", "closed", "archived"] as VacancyStatus[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => statusMutation.mutate({ id: v.id, status: s })}
                      disabled={v.status === s}
                      className={cn(
                        "rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition",
                        v.status === s
                          ? "bg-primary/20 text-primary cursor-default"
                          : "bg-white/[0.04] text-muted-foreground hover:bg-white/[0.08]",
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Editor */}
      <SlideOver
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={editing ? "Edit Vacancy" : "New Vacancy"}
        width="max-w-lg"
        footer={
          <div className="flex gap-2.5">
            <button
              onClick={() => saveMutation.mutate("draft")}
              disabled={!draft.title.trim() || !draft.description.trim() || saveMutation.isPending}
              className="flex-1 rounded-2xl bg-white/[0.06] py-3 text-sm font-bold text-foreground transition hover:bg-white/[0.1] disabled:opacity-50"
            >
              Save Draft
            </button>
            <button
              onClick={() => saveMutation.mutate("published")}
              disabled={!draft.title.trim() || !draft.description.trim() || saveMutation.isPending}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl gold-gradient py-3 text-sm font-bold text-primary-foreground transition active:scale-95 disabled:opacity-50"
            >
              {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Publish
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <Field label="Job Title" value={draft.title} onChange={(v) => setDraft((d) => ({ ...d, title: v }))} required />
          <Field label="Department" value={draft.department ?? ""} onChange={(v) => setDraft((d) => ({ ...d, department: v }))} placeholder="Marketing, Sales, Education…" />
          <div className="grid grid-cols-2 gap-3">
            <SelectField
              label="Employment Type"
              value={draft.employment_type as EmploymentType}
              onChange={(v) => setDraft((d) => ({ ...d, employment_type: v }))}
              options={Object.entries(EMPLOYMENT_TYPE_LABELS).map(([value, label]) => ({ value: value as EmploymentType, label }))}
            />
            <SelectField
              label="Experience Level"
              value={draft.experience_level as ExperienceLevel}
              onChange={(v) => setDraft((d) => ({ ...d, experience_level: v }))}
              options={Object.entries(EXPERIENCE_LEVEL_LABELS).map(([value, label]) => ({ value: value as ExperienceLevel, label }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="City" value={draft.location_city ?? ""} onChange={(v) => setDraft((d) => ({ ...d, location_city: v }))} />
            <Field label="Country" value={draft.location_country ?? ""} onChange={(v) => setDraft((d) => ({ ...d, location_country: v }))} />
          </div>
          <Field label="Description" type="textarea" value={draft.description} onChange={(v) => setDraft((d) => ({ ...d, description: v }))} required />
          <Field label="Requirements" type="textarea" value={draft.requirements ?? ""} onChange={(v) => setDraft((d) => ({ ...d, requirements: v }))} />
          <Field label="Responsibilities" type="textarea" value={draft.responsibilities ?? ""} onChange={(v) => setDraft((d) => ({ ...d, responsibilities: v }))} />
          <Field label="Benefits" type="textarea" value={draft.benefits ?? ""} onChange={(v) => setDraft((d) => ({ ...d, benefits: v }))} />
          <div className="grid grid-cols-3 gap-3">
            <Field
              label="Salary Min"
              type="number"
              value={draft.salary_min ? String(draft.salary_min) : ""}
              onChange={(v) => setDraft((d) => ({ ...d, salary_min: v ? Number(v) : undefined }))}
            />
            <Field
              label="Salary Max"
              type="number"
              value={draft.salary_max ? String(draft.salary_max) : ""}
              onChange={(v) => setDraft((d) => ({ ...d, salary_max: v ? Number(v) : undefined }))}
            />
            <Field label="Currency" value={draft.currency ?? "UZS"} onChange={(v) => setDraft((d) => ({ ...d, currency: v }))} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!draft.salary_is_negotiable}
              onChange={(e) => setDraft((d) => ({ ...d, salary_is_negotiable: e.target.checked }))}
              className="h-4 w-4 rounded border-input accent-primary"
            />
            Salary is negotiable
          </label>
          <Field
            label="Number of Openings"
            type="number"
            value={String(draft.openings_count ?? 1)}
            onChange={(v) => setDraft((d) => ({ ...d, openings_count: Math.max(1, Number(v) || 1) }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Contact Email" type="email" value={draft.contact_email ?? ""} onChange={(v) => setDraft((d) => ({ ...d, contact_email: v }))} />
            <Field label="Contact Phone" type="tel" value={draft.contact_phone ?? ""} onChange={(v) => setDraft((d) => ({ ...d, contact_phone: v }))} />
          </div>
        </div>
      </SlideOver>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete vacancy?"
        message={`This will permanently remove "${deleteTarget?.title}" and its applications.`}
        confirmLabel="Delete"
        destructive
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </DashboardShell>
  );
}
