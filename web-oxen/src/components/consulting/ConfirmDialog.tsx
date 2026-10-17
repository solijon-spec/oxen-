import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";
import { Loader2, AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, loading, onCancel]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !loading && onCancel()}
            className="fixed inset-0 z-[1050] bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className="fixed left-1/2 top-1/2 z-[1051] w-[calc(100%-2.5rem)] max-w-sm -translate-x-1/2 -translate-y-1/2"
          >
            <div className="glass-strong rounded-3xl p-6 shadow-2xl">
              <div className="flex items-start gap-3">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    destructive ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary"
                  }`}
                >
                  <AlertTriangle className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h3 className="font-display text-base font-bold text-foreground">{title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{message}</p>
                </div>
              </div>
              <div className="mt-5 flex gap-3">
                <button
                  onClick={onCancel}
                  disabled={loading}
                  className="glass flex-1 rounded-2xl py-3 text-sm font-semibold text-muted-foreground transition hover:text-foreground disabled:opacity-50"
                >
                  {cancelLabel}
                </button>
                <button
                  onClick={onConfirm}
                  disabled={loading}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold transition active:scale-95 disabled:opacity-50 ${
                    destructive
                      ? "bg-destructive text-destructive-foreground"
                      : "gold-gradient text-primary-foreground"
                  }`}
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {confirmLabel}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
