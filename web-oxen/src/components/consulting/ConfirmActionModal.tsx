import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X, Shield } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SensitiveActionConfig {
  action: string;
  actionLabel: string;
  affectedAccount: string;
  currentStatus: string;
  newStatus: string;
  consequences: string;
  icon?: LucideIcon;
  confirmLabel?: string;
  destructive?: boolean;
}

interface ConfirmActionModalProps {
  open: boolean;
  config: SensitiveActionConfig | null;
  onConfirm: (reason: string) => void;
  onClose: () => void;
  loading?: boolean;
}

/**
 * ConfirmActionModal — two-owner protection confirmation dialog.
 * Shows action name, affected account, current/new status, consequences,
 * and requires a reason before the final confirm button is enabled.
 */
export function ConfirmActionModal({
  open,
  config,
  onConfirm,
  onClose,
  loading = false,
}: ConfirmActionModalProps) {
  const [reason, setReason] = useState("");

  if (!config) return null;
  const Icon = config.icon ?? Shield;
  const isDestructive = config.destructive ?? false;

  const handleConfirm = () => {
    if (!reason.trim()) return;
    onConfirm(reason.trim());
    setReason("");
  };

  const handleClose = () => {
    setReason("");
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="fixed left-1/2 top-1/2 z-[101] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-white/[0.08] bg-sidebar/95 p-6 shadow-2xl backdrop-blur-xl"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
                    isDestructive
                      ? "bg-destructive/15 text-destructive"
                      : "bg-amber-500/15 text-amber-300",
                  )}
                >
                  <Icon className="h-6 w-6" />
                </span>
                <div className="min-w-0">
                  <h3 className="font-display text-base font-bold text-foreground">
                    {config.actionLabel}
                  </h3>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-300/80">
                    Protected Owner Action
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-white/[0.06] hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Warning banner */}
            <div
              className={cn(
                "mt-4 flex items-start gap-2.5 rounded-xl border p-3",
                isDestructive
                  ? "border-destructive/20 bg-destructive/[0.06]"
                  : "border-amber-500/20 bg-amber-500/[0.04]",
              )}
            >
              <AlertTriangle
                className={cn(
                  "mt-0.5 h-4 w-4 shrink-0",
                  isDestructive ? "text-destructive" : "text-amber-300",
                )}
              />
              <p className="text-xs text-muted-foreground">
                This is a sensitive action performed by an Owner. It will be permanently
                recorded in the audit log with your identity, reason, and timestamp.
              </p>
            </div>

            {/* Details grid */}
            <div className="mt-4 space-y-2.5">
              <DetailField label="Action" value={config.action} />
              <DetailField label="Affected Account" value={config.affectedAccount} />
              <div className="grid grid-cols-2 gap-2.5">
                <DetailField label="Current Status" value={config.currentStatus} />
                <DetailField label="New Status" value={config.newStatus} />
              </div>
              <DetailField label="Consequences" value={config.consequences} />
            </div>

            {/* Reason input */}
            <div className="mt-4">
              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Reason <span className="text-destructive">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why this action is being taken. This will be recorded in the audit log."
                rows={3}
                className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-amber-500/40 focus:outline-none"
              />
            </div>

            {/* Actions */}
            <div className="mt-5 flex gap-2.5">
              <button
                onClick={handleClose}
                disabled={loading}
                className="flex-1 rounded-xl bg-white/[0.04] py-3 text-sm font-bold text-foreground transition hover:bg-white/[0.08] disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={!reason.trim() || loading}
                className={cn(
                  "flex-1 rounded-xl py-3 text-sm font-bold transition disabled:opacity-40",
                  isDestructive
                    ? "bg-destructive/15 text-destructive hover:bg-destructive/25"
                    : "bg-amber-500/20 text-amber-300 hover:bg-amber-500/30",
                )}
              >
                {loading ? "Processing…" : config.confirmLabel ?? "Confirm Action"}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/[0.02] p-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 truncate text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
