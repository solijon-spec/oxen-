import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  CreditCard,
  FileStack,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  RotateCcw,
  ShieldAlert,
  UserCheck,
  X,
  CheckCheck,
  Building2,
  Mail,
  Calendar,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { OwnerShell } from "@/components/consulting/OwnerShell";
import { EmptyState } from "@/components/consulting/EmptyState";
import { useSEO } from "@/hooks/use-seo";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchOwnerNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type OwnerNotification,
  type OwnerEventType,
} from "@/lib/owner-admin";
import { cn } from "@/lib/utils";

const springIn = { type: "spring" as const, stiffness: 260, damping: 26 };

const EVENT_META: Record<
  OwnerEventType,
  { label: string; icon: LucideIcon; color: string }
> = {
  payment_submitted: { label: "Payment Submitted", icon: CreditCard, color: "bg-sky-500/15 text-sky-300" },
  premium_application: { label: "Premium Application", icon: FileStack, color: "bg-amber-500/15 text-amber-300" },
  payment_confirmation_required: { label: "Payment Confirmation Required", icon: CheckCircle2, color: "bg-amber-500/15 text-amber-300" },
  subscription_expiring_7: { label: "Subscription Expiring in 7 Days", icon: AlertTriangle, color: "bg-orange-500/15 text-orange-300" },
  subscription_expiring_30: { label: "Subscription Expiring in 30 Days", icon: Clock, color: "bg-yellow-500/15 text-yellow-300" },
  subscription_expired: { label: "Subscription Expired", icon: XCircle, color: "bg-destructive/15 text-destructive" },
  payment_rejected: { label: "Payment Rejected", icon: XCircle, color: "bg-destructive/15 text-destructive" },
  refund_request: { label: "Refund Request", icon: RotateCcw, color: "bg-purple-500/15 text-purple-300" },
  suspicious_activity: { label: "Suspicious Account Activity", icon: ShieldAlert, color: "bg-rose-500/15 text-rose-300" },
  pending_email_registered: { label: "Pending Email Registered", icon: UserCheck, color: "bg-emerald-500/15 text-emerald-300" },
};

function formatDateTime(iso: string): string {
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

/**
 * OwnerNotifications — private notifications for the two platform owners.
 * Only owner accounts see these. Each notification shows event type,
 * company, Google account, date/time, related entities, View details,
 * and Mark as read.
 */
export default function OwnerNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  useSEO({ title: "Notifications | OXEN Owner", description: "Private owner notifications." });

  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const notifQ = useQuery({
    queryKey: ["owner-notifications", filter],
    queryFn: () => fetchOwnerNotifications(filter),
    staleTime: 15_000,
    refetchInterval: 60_000,
  });

  const notifications = notifQ.data ?? [];

  const handleMarkRead = useCallback(
    async (id: string) => {
      if (!user) return;
      const ok = await markNotificationRead(id, user.id);
      if (ok) {
        queryClient.invalidateQueries({ queryKey: ["owner-notifications"] });
        queryClient.invalidateQueries({ queryKey: ["owner-unread-notif-count"] });
      } else {
        toast({ title: "Failed to mark as read", variant: "destructive" });
      }
    },
    [user, queryClient, toast],
  );

  const handleMarkAllRead = useCallback(async () => {
    if (!user) return;
    const ok = await markAllNotificationsRead(user.id);
    if (ok) {
      toast({ title: "All notifications marked as read" });
      queryClient.invalidateQueries({ queryKey: ["owner-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["owner-unread-notif-count"] });
    } else {
      toast({ title: "Failed to mark all as read", variant: "destructive" });
    }
  }, [user, queryClient, toast]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <OwnerShell
      title="Notifications"
      subtitle="Private alerts for the two OXEN platform owners"
      actions={
        unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1.5 rounded-xl bg-amber-500/15 px-3 py-2 text-xs font-bold text-amber-300 transition hover:bg-amber-500/25"
          >
            <CheckCheck className="h-3.5 w-3.5" /> Mark all read
          </button>
        )
      }
    >
      {/* Filter chips */}
      <div className="mb-4 flex gap-1.5">
        {(["all", "unread"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-semibold transition",
              filter === f
                ? "bg-amber-500/20 text-amber-300"
                : "bg-white/[0.04] text-muted-foreground hover:bg-white/[0.08] hover:text-foreground",
            )}
          >
            {f === "all" ? "All" : `Unread (${unreadCount})`}
          </button>
        ))}
      </div>

      {/* Notifications list */}
      {notifQ.isLoading ? (
        <div className="glass rounded-2xl p-8 text-center text-sm text-muted-foreground">Loading notifications…</div>
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications"
          description={filter === "unread"
            ? "There are no unread notifications."
            : "Owner notifications will appear here as events occur."}
        />
      ) : (
        <div className="space-y-2">
          {notifications.map((n, i) => {
            const meta = EVENT_META[n.event_type] ?? { label: n.event_type, icon: Bell, color: "bg-white/[0.06] text-muted-foreground" };
            const Icon = meta.icon;
            const isExpanded = expanded === n.id;
            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...springIn, delay: i * 0.03 }}
                className={cn(
                  "glass rounded-2xl p-4 transition",
                  !n.is_read && "ring-1 ring-amber-500/20",
                )}
              >
                <div className="flex items-start gap-3">
                  <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", meta.color)}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-bold text-foreground">{meta.label}</p>
                      {!n.is_read && (
                        <span className="flex h-2 w-2 shrink-0 rounded-full bg-amber-400" />
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {n.consulting_company_name ?? "—"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatDateTime(n.created_at)}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <button
                      onClick={() => setExpanded(isExpanded ? null : n.id)}
                      className="rounded-lg bg-white/[0.04] px-2.5 py-1.5 text-xs font-semibold text-foreground transition hover:bg-white/[0.08]"
                    >
                      Details
                    </button>
                    {!n.is_read && (
                      <button
                        onClick={() => handleMarkRead(n.id)}
                        className="rounded-lg bg-amber-500/15 px-2.5 py-1.5 text-xs font-bold text-amber-300 transition hover:bg-amber-500/25"
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 space-y-2 border-t border-white/[0.04] pt-3">
                        {n.user_name && (
                          <DetailRow icon={UserCheck} label="Google Account" value={n.user_name} />
                        )}
                        {n.user_email && (
                          <DetailRow icon={Mail} label="Email" value={n.user_email} />
                        )}
                        {n.consulting_company_name && (
                          <DetailRow icon={Building2} label="Company" value={n.consulting_company_name} />
                        )}
                        <DetailRow icon={Calendar} label="Date & Time" value={formatDateTime(n.created_at)} />
                        {n.subscription_id && (
                          <DetailRow icon={Clock} label="Subscription" value={n.subscription_id.slice(0, 8)} />
                        )}
                        {n.payment_request_id && (
                          <DetailRow icon={CreditCard} label="Payment Request" value={n.payment_request_id.slice(0, 8)} />
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
          <p className="text-center text-[11px] text-muted-foreground">
            {notifications.length} {notifications.length === 1 ? "notification" : "notifications"}
          </p>
        </div>
      )}
    </OwnerShell>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-muted-foreground">
        <Icon className="h-3 w-3" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="truncate text-sm text-foreground">{value}</p>
      </div>
    </div>
  );
}
