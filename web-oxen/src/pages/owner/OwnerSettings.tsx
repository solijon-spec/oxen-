import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Settings as SettingsIcon,
  Shield,
  Crown,
  Bell,
  Lock,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  Bot,
  Loader2,
  Check,
  Eye,
  EyeOff,
} from "lucide-react";

import { OwnerShell } from "@/components/consulting/OwnerShell";
import { useSEO } from "@/hooks/use-seo";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { checkOwnerAccess, fetchAuditLogs } from "@/lib/owner-admin";
import { fetchAiSettings, upsertAiSettings, type AiProvider } from "@/lib/green-card";
import { cn } from "@/lib/utils";

const springIn = { type: "spring" as const, stiffness: 260, damping: 26 };

/**
 * OwnerSettings — owner panel settings: owner identity, security info,
 * notification preferences (view-only for now), and protected-action
 * guardrails info. Does not allow changing owner roles (protected process).
 */
export default function OwnerSettings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  useSEO({ title: "Settings | OXEN Owner", description: "Owner panel settings." });

  const accessQ = useQuery({
    queryKey: ["owner-access-settings-page", user?.id],
    queryFn: () => checkOwnerAccess(),
    staleTime: 60_000,
  });

  const auditQ = useQuery({
    queryKey: ["owner-settings-audit-recent"],
    queryFn: () => fetchAuditLogs(5),
    staleTime: 30_000,
  });

  const aiSettingsQ = useQuery({
    queryKey: ["owner-ai-settings"],
    queryFn: fetchAiSettings,
    staleTime: 30_000,
  });

  const recentAudit = auditQ.data ?? [];
  const isLinked = !!accessQ.data?.user_id;

  const [aiProvider, setAiProvider] = useState<AiProvider>("openai");
  const [aiKey, setAiKey] = useState("");
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (aiSettingsQ.data) {
      setAiProvider(aiSettingsQ.data.provider);
      setAiKey(aiSettingsQ.data.api_key ?? "");
    }
  }, [aiSettingsQ.data]);

  const saveAiMutation = useMutation({
    mutationFn: () => upsertAiSettings(aiProvider, aiKey.trim(), user?.id ?? ""),
    onSuccess: (ok) => {
      if (!ok) {
        toast({ title: "Failed to save AI settings", variant: "destructive" });
        return;
      }
      toast({ title: "AI settings saved" });
      queryClient.invalidateQueries({ queryKey: ["owner-ai-settings"] });
    },
    onError: () => toast({ title: "Failed to save AI settings", variant: "destructive" }),
  });

  return (
    <OwnerShell title="Settings" subtitle="Owner panel configuration and security">
      {/* Owner identity */}
      <section>
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Owner Identity
        </h3>
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springIn}
          className="glass rounded-2xl p-5"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400/20 to-amber-600/10 text-amber-300">
              <Crown className="h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-base font-bold text-foreground">{user?.name}</p>
              <p className="truncate text-sm text-muted-foreground">{accessQ.data?.email ?? user?.email}</p>
            </div>
            <span className={cn(
              "shrink-0 rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider",
              isLinked ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300",
            )}>
              {isLinked ? "Linked" : "Pending"}
            </span>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Your Supabase user_id is linked to the <code className="rounded bg-white/[0.06] px-1 text-foreground">owner_admins</code> table.
            Owner access is verified server-side on every request via the <code className="rounded bg-white/[0.06] px-1 text-foreground">is_owner()</code> SQL function.
          </p>
        </motion.div>
      </section>

      {/* Two-owner protection */}
      <section className="mt-8">
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Two-Owner Protection
        </h3>
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springIn, delay: 0.05 }}
          className="glass rounded-2xl p-5"
        >
          <div className="flex items-center gap-2.5">
            <Shield className="h-5 w-5 text-amber-300" />
            <p className="font-display text-sm font-bold text-foreground">Protected Actions</p>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Both owner accounts have equal main access. The following sensitive actions
            require a confirmation modal with a reason:
          </p>
          <ul className="mt-3 space-y-1.5 text-xs text-foreground">
            {[
              "Blocking an account",
              "Cancelling a subscription",
              "Refunding a payment",
              "Removing Premium Consulting access",
              "Changing a subscription expiration date",
              "Changing a user role to Owner",
              "Removing an owner role",
            ].map((action) => (
              <li key={action} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                {action}
              </li>
            ))}
          </ul>
          <div className="mt-4 rounded-xl border border-amber-500/15 bg-amber-500/[0.04] p-3">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-200">
              <Lock className="h-3 w-3" /> Self-protection
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Owners cannot remove their own Owner access or the other owner's access from the
              normal UI. This requires a separate protected database process.
            </p>
          </div>
        </motion.div>
      </section>

      {/* Audit log integrity */}
      <section className="mt-8">
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Audit Log Integrity
        </h3>
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springIn, delay: 0.1 }}
          className="glass rounded-2xl p-5"
        >
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-5 w-5 text-amber-300" />
            <p className="font-display text-sm font-bold text-foreground">Append-Only Records</p>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Audit log records are append-only — they cannot be edited or permanently deleted
            from the normal Owner Admin UI. RLS blocks all UPDATE and DELETE operations on
            the <code className="rounded bg-white/[0.06] px-1 text-foreground">owner_audit_logs</code> table.
          </p>
          {recentAudit.length > 0 && (
            <div className="mt-3 space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Recent entries</p>
              {recentAudit.map((log) => (
                <div key={log.id} className="flex items-center justify-between rounded-lg bg-white/[0.02] px-2.5 py-1.5">
                  <span className="truncate text-xs text-foreground">{log.action}</span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">{log.owner_email ?? "—"}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </section>

      {/* AI provider (Green Card eligibility checker) */}
      <section className="mt-8">
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          AI Provider — Green Card Checker
        </h3>
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springIn, delay: 0.18 }}
          className="glass rounded-2xl p-5"
        >
          <div className="flex items-center gap-2.5">
            <Bot className="h-5 w-5 text-amber-300" />
            <p className="font-display text-sm font-bold text-foreground">API Key</p>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Used server-side only (in the <code className="rounded bg-white/[0.06] px-1 text-foreground">green-card-check</code> Edge
            Function) to analyze passport photo uploads against DV Lottery requirements. Never sent to the browser.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-1 rounded-xl bg-white/[0.04] p-1">
              {(["openai", "anthropic"] as AiProvider[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setAiProvider(p)}
                  className={cn(
                    "flex-1 rounded-lg px-3 py-2 text-xs font-bold transition",
                    aiProvider === p ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {p === "openai" ? "OpenAI" : "Anthropic (Claude)"}
                </button>
              ))}
            </div>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={aiKey}
                onChange={(e) => setAiKey(e.target.value)}
                placeholder={aiProvider === "openai" ? "sk-…" : "sk-ant-…"}
                className="w-full rounded-xl border border-input bg-background/50 px-3.5 py-2.5 pr-10 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
              <button
                onClick={() => setShowKey((s) => !s)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                type="button"
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            onClick={() => saveAiMutation.mutate()}
            disabled={!aiKey.trim() || saveAiMutation.isPending}
            className="mt-3 flex items-center gap-2 rounded-xl gold-gradient px-4 py-2.5 text-xs font-bold text-primary-foreground transition active:scale-95 disabled:opacity-50"
          >
            {saveAiMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Save AI Settings
          </button>

          {!aiSettingsQ.data?.api_key && (
            <p className="mt-3 text-[11px] text-amber-300">
              No API key configured yet — Green Card checks will fail with a clear error until one is set here.
            </p>
          )}
        </motion.div>
      </section>

      {/* Data separation */}
      <section className="mt-8">
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Data Separation
        </h3>
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springIn, delay: 0.15 }}
          className="glass rounded-2xl p-5"
        >
          <p className="text-xs text-muted-foreground">
            OXEN platform subscription revenue is kept fully separate from consulting company
            business revenue (POS, Cashier, package sales). One consulting company cannot
            access another company's private records. Ordinary users cannot read owner or
            consulting financial records.
          </p>
        </motion.div>
      </section>

      {/* Navigation */}
      <section className="mt-8">
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Panel Links
        </h3>
        <div className="glass divide-y divide-white/[0.04] rounded-2xl">
          {[
            { label: "Audit Log", to: "/owner-admin/audit", icon: SettingsIcon },
            { label: "Notifications", to: "/owner-admin/notifications", icon: Bell },
            { label: "Return to OXEN", to: "/", icon: ExternalLink },
          ].map((link) => (
            <button
              key={link.to}
              onClick={() => navigate(link.to)}
              className="flex w-full items-center gap-3 p-3.5 text-left transition hover:bg-white/[0.02]"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04] text-muted-foreground">
                <link.icon className="h-4 w-4" />
              </span>
              <span className="flex-1 text-sm font-semibold text-foreground">{link.label}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      </section>
    </OwnerShell>
  );
}
