import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Activity,
  UserPlus,
  ShieldCheck,
  UserCheck,
  Ban,
  UserMinus,
  Users,
  FileStack,
  Package,
  Trash2,
  Mail,
  Search,
  Filter,
} from "lucide-react";

import { DashboardShell } from "@/components/consulting/DashboardShell";
import { EmptyState } from "@/components/consulting/EmptyState";
import { StatusBadge } from "@/components/consulting/StatusBadge";
import { useConsulting } from "@/contexts/ConsultingContext";
import { useSEO } from "@/hooks/use-seo";
import {
  fetchActivityLogs as apiFetchActivityLogs,
  type ConsultingActivityLog,
} from "@/lib/consulting";
import {
  testFetchActivityLogs,
} from "@/lib/consulting-test-mode";
import { cn } from "@/lib/utils";

const ACTION_LABELS: Record<string, string> = {
  employee_invited: "Employee invited",
  employee_role_changed: "Employee role changed",
  employee_suspended: "Employee suspended",
  employee_activated: "Employee activated",
  employee_removed: "Employee removed",
  client_created: "Client created",
  client_assigned: "Client assigned",
  client_status_changed: "Client status changed",
  application_status_changed: "Application status changed",
  package_published: "Package published",
  package_unpublished: "Package unpublished",
  package_deleted: "Package deleted",
  package_created: "Package created",
  package_updated: "Package updated",
};

const ACTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  employee_invited: UserPlus,
  employee_role_changed: ShieldCheck,
  employee_suspended: Ban,
  employee_activated: UserCheck,
  employee_removed: UserMinus,
  client_created: Users,
  client_assigned: UserCheck,
  client_status_changed: FileStack,
  application_status_changed: FileStack,
  package_published: Package,
  package_unpublished: Package,
  package_deleted: Trash2,
  package_created: Package,
  package_updated: Package,
};

const ACTION_FILTERS = Object.keys(ACTION_LABELS);

export default function ConsultingActivityLog() {
  const { company, isTestMode } = useConsulting();
  const queryClient = useQueryClient();
  const companyId = company?.id ?? "";

  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");

  useSEO({ title: "Activity Log | OXEN Consulting", description: "Audit trail of all team actions" });

  const testLogsQ = useQuery({
    queryKey: ["consulting-activity-test", companyId],
    queryFn: () => testFetchActivityLogs(companyId, {}),
    enabled: !!companyId && isTestMode,
    staleTime: 0,
  });
  const realLogsQ = useQuery({
    queryKey: ["consulting-activity", companyId],
    queryFn: () => apiFetchActivityLogs(companyId, { limit: 200 }),
    enabled: !!companyId && !isTestMode,
  });
  const logs = isTestMode ? (testLogsQ.data ?? []) : (realLogsQ.data ?? []);

  const filtered = useMemo(() => {
    let rows = logs as ConsultingActivityLog[];
    if (actionFilter !== "all") rows = rows.filter((l) => l.action === actionFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (l) =>
          (l.actor?.name ?? "").toLowerCase().includes(q) ||
          (l.action ?? "").toLowerCase().includes(q) ||
          (l.entity_type ?? "").toLowerCase().includes(q),
      );
    }
    return rows;
  }, [logs, actionFilter, search]);

  // Group by day
  const grouped = useMemo(() => {
    const groups = new Map<string, ConsultingActivityLog[]>();
    for (const l of filtered) {
      const day = new Date(l.created_at).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      if (!groups.has(day)) groups.set(day, []);
      groups.get(day)!.push(l);
    }
    return Array.from(groups.entries());
  }, [filtered]);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["consulting-activity"] });
    queryClient.invalidateQueries({ queryKey: ["consulting-activity-test"] });
  }, [queryClient]);

  return (
    <DashboardShell
      title="Activity Log"
      subtitle="Audit trail of every important action in your company"
      actions={
        <button
          onClick={invalidate}
          className="glass flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-foreground transition hover:border-primary/30"
        >
          <Activity className="h-3.5 w-3.5" />
          Refresh
        </button>
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
            placeholder="Search actor or action…"
            className="w-full rounded-xl border border-input bg-background/50 py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="rounded-xl border border-input bg-background/50 py-2.5 pl-9 pr-8 text-sm text-foreground focus:border-primary focus:outline-none"
          >
            <option value="all">All actions</option>
            {ACTION_FILTERS.map((a) => (
              <option key={a} value={a}>{ACTION_LABELS[a]}</option>
            ))}
          </select>
        </div>
      </motion.div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="No activity yet"
          description="Every important team action — invites, role changes, client assignments, status updates, package publishing — will appear here as a timeline."
        />
      ) : (
        <div className="space-y-6">
          {grouped.map(([day, dayLogs]) => (
            <motion.div
              key={day}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {day}
                </span>
                <span className="h-px flex-1 bg-white/[0.06]" />
                <span className="text-[10px] text-muted-foreground">{dayLogs.length} {dayLogs.length === 1 ? "event" : "events"}</span>
              </div>
              <ol className="space-y-2">
                {dayLogs.map((log, i) => {
                  const Icon = ACTION_ICONS[log.action] ?? Activity;
                  const label = ACTION_LABELS[log.action] ?? log.action.replace(/_/g, " ");
                  const meta = log.metadata as Record<string, unknown> | null;
                  return (
                    <li
                      key={log.id}
                      className="glass flex items-start gap-3 rounded-xl p-3"
                    >
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-foreground">{label}</p>
                          <StatusBadge
                            status="active"
                            label={log.entity_type ?? "entity"}
                            className="capitalize"
                          />
                        </div>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          <span className="font-semibold text-foreground/80">
                            {log.actor?.name ?? "System"}
                          </span>
                          {" · "}
                          {new Date(log.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                        {meta && Object.keys(meta).length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {Object.entries(meta).slice(0, 4).map(([k, v]) => (
                              <span
                                key={k}
                                className="inline-flex items-center rounded-md bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-muted-foreground"
                              >
                                {k}: <span className="ml-1 text-foreground/80">{String(v)}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      {i === 0 && (
                        <span className="mt-0.5 hidden shrink-0 rounded-md bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary sm:inline-block">
                          Latest
                        </span>
                      )}
                    </li>
                  );
                })}
              </ol>
            </motion.div>
          ))}
        </div>
      )}

      {isTestMode && (
        <div className="mt-6 rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] px-4 py-3 text-xs text-amber-200/90">
          <Mail className="mr-1 inline h-3 w-3" />
          In test mode, activity logs are stored locally and only visible on this device. After the migration is applied,
          logs will be persisted in Supabase and visible to all team members with the <code className="font-mono">activity:read</code> permission.
        </div>
      )}
    </DashboardShell>
  );
}
