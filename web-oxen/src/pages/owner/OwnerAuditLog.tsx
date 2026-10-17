import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ScrollText, Clock } from "lucide-react";

import { OwnerShell } from "@/components/consulting/OwnerShell";
import { EmptyState } from "@/components/consulting/EmptyState";
import { useSEO } from "@/hooks/use-seo";
import { fetchAuditLogs } from "@/lib/owner-admin";

const springIn = { type: "spring" as const, stiffness: 260, damping: 26 };

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function OwnerAuditLog() {
  useSEO({ title: "Audit Log | OXEN Owner", description: "Owner action history." });

  const auditQ = useQuery({
    queryKey: ["owner-audit-log-full"],
    queryFn: () => fetchAuditLogs(200),
    staleTime: 15_000,
  });

  const logs = auditQ.data ?? [];

  return (
    <OwnerShell title="Audit Log" subtitle="Complete history of owner actions">
      {auditQ.isLoading ? (
        <div className="glass rounded-2xl p-8 text-center text-sm text-muted-foreground">Loading audit log…</div>
      ) : logs.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="No audit entries yet"
          description="Every owner action (activation, extension, suspension, plan change, etc.) is recorded here for accountability."
        />
      ) : (
        <div className="glass divide-y divide-white/[0.04] rounded-2xl">
          {logs.map((log, i) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ ...springIn, delay: i * 0.02 }}
              className="flex items-start gap-3 p-3"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-300">
                <Clock className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">{log.action}</p>
                {log.entity_type && (
                  <p className="text-[11px] text-muted-foreground">
                    {log.entity_type}
                    {log.entity_id ? ` · ${log.entity_id.slice(0, 8)}…` : ""}
                  </p>
                )}
                {log.metadata && Object.keys(log.metadata as object).length > 0 && (
                  <pre className="mt-1 overflow-x-auto rounded-lg bg-white/[0.02] p-2 text-[10px] text-muted-foreground">
                    {JSON.stringify(log.metadata, null, 2)}
                  </pre>
                )}
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[10px] text-muted-foreground">{log.owner_email ?? "Owner"}</p>
                <p className="text-[10px] text-muted-foreground">{formatDate(log.created_at)}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </OwnerShell>
  );
}
