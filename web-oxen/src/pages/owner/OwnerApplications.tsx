import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  FileStack,
  Search,
  Building2,
  UserCircle,
  Globe2,
  Calendar,
  Eye,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { OwnerShell } from "@/components/consulting/OwnerShell";
import { EmptyState } from "@/components/consulting/EmptyState";
import { useSEO } from "@/hooks/use-seo";
import {
  fetchAllConsultingApplications,
  type ConsultingApplicationSummary,
} from "@/lib/owner-admin";
import { cn } from "@/lib/utils";

const springIn = { type: "spring" as const, stiffness: 260, damping: 26 };

const STATUS_STYLE: Record<string, string> = {
  new: "bg-sky-500/15 text-sky-300",
  documents: "bg-amber-500/15 text-amber-300",
  processing: "bg-yellow-500/15 text-yellow-300",
  submitted: "bg-purple-500/15 text-purple-300",
  approved: "bg-emerald-500/15 text-emerald-300",
  rejected: "bg-destructive/15 text-destructive",
  completed: "bg-emerald-500/15 text-emerald-300",
};

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  documents: "Documents",
  processing: "Processing",
  submitted: "Submitted",
  approved: "Approved",
  rejected: "Rejected",
  completed: "Completed",
};

const FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "documents", label: "Documents" },
  { value: "processing", label: "Processing" },
  { value: "submitted", label: "Submitted" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "completed", label: "Completed" },
];

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

/**
 * OwnerApplications — all consulting applications across all companies.
 * View-only overview for the owners. Individual application management
 * happens in the consulting dashboard (by the company's own team).
 */
export default function OwnerApplications() {
  const navigate = useNavigate();
  useSEO({ title: "Consulting Applications | OXEN Owner", description: "All consulting applications." });

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const appsQ = useQuery({
    queryKey: ["owner-applications", statusFilter],
    queryFn: () => fetchAllConsultingApplications(statusFilter),
    staleTime: 15_000,
  });

  const allApps = appsQ.data ?? [];
  const filtered = search.trim()
    ? allApps.filter((a) =>
        (a.company_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (a.client_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (a.destination_country ?? "").toLowerCase().includes(search.toLowerCase()),
      )
    : allApps;

  return (
    <OwnerShell title="Consulting Applications" subtitle="All applications across all consulting companies">
      {/* Search */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by company, client, or country…"
            className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] py-2.5 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-amber-500/40 focus:outline-none"
          />
        </div>
      </div>

      {/* Filter chips */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setStatusFilter(opt.value)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-semibold transition",
              statusFilter === opt.value
                ? "bg-amber-500/20 text-amber-300"
                : "bg-white/[0.04] text-muted-foreground hover:bg-white/[0.08] hover:text-foreground",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Results */}
      {appsQ.isLoading ? (
        <div className="glass rounded-2xl p-8 text-center text-sm text-muted-foreground">
          Loading applications…
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FileStack}
          title="No applications found"
          description={search ? "Try a different search term." : "No consulting applications match this filter."}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((app, i) => (
            <motion.div
              key={app.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springIn, delay: i * 0.03 }}
              className="glass rounded-2xl p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {/* Client + company info */}
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-muted-foreground">
                    <UserCircle className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-display text-sm font-bold text-foreground">
                      {app.client_name ?? "Unknown client"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {app.company_name ?? "Unknown company"}
                    </p>
                  </div>
                </div>

                {/* Application details */}
                <div className="flex items-center gap-4">
                  <div className="hidden text-right sm:block">
                    <p className="text-[11px] text-muted-foreground">Destination</p>
                    <p className="flex items-center gap-1 text-xs text-foreground">
                      <Globe2 className="h-3 w-3" /> {app.destination_country ?? "—"}
                    </p>
                  </div>
                  <div className="hidden text-right sm:block">
                    <p className="text-[11px] text-muted-foreground">Type</p>
                    <p className="text-xs text-foreground">{app.application_type ?? "—"}</p>
                  </div>
                  <div className="hidden text-right md:block">
                    <p className="text-[11px] text-muted-foreground">Submitted</p>
                    <p className="text-xs text-foreground">{formatDate(app.submission_date)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-muted-foreground">Expected</p>
                    <p className="text-xs text-foreground">{formatDate(app.expected_completion_date)}</p>
                  </div>
                  <span className={cn(
                    "shrink-0 rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider",
                    STATUS_STYLE[app.status] ?? "bg-white/[0.06] text-muted-foreground",
                  )}>
                    {STATUS_LABELS[app.status] ?? app.status}
                  </span>
                  <button
                    onClick={() => navigate(`/owner-admin/accounts/${app.consulting_company_id}`)}
                    className="shrink-0 rounded-lg bg-amber-500/15 px-3 py-2 text-xs font-bold text-amber-300 transition hover:bg-amber-500/25"
                  >
                    <Eye className="mr-1 inline h-3 w-3" /> View Company
                  </button>
                </div>
              </div>

              {/* Mobile-only details */}
              <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground sm:hidden">
                <span className="flex items-center gap-1"><Globe2 className="h-3 w-3" /> {app.destination_country ?? "—"}</span>
                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatDate(app.submission_date)}</span>
              </div>
            </motion.div>
          ))}
          <p className="text-center text-[11px] text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "application" : "applications"}
          </p>
        </div>
      )}
    </OwnerShell>
  );
}
