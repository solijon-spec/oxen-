import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";

interface SlideOverProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Optional footer (e.g. action buttons). */
  footer?: ReactNode;
  width?: string;
}

/** Right-side slide-over panel — used for client/employee profiles. */
export function SlideOver({ open, onClose, title, subtitle, children, footer, width = "max-w-md" }: SlideOverProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className={`fixed inset-y-0 right-0 z-[81] flex w-full ${width} flex-col bg-sidebar/95 backdrop-blur-xl shadow-2xl`}
          >
            <header className="flex items-start justify-between gap-3 border-b border-white/[0.06] px-5 py-4">
              <div className="min-w-0">
                <h3 className="truncate font-display text-lg font-bold text-foreground">{title}</h3>
                {subtitle && <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>}
              </div>
              <button
                onClick={onClose}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] text-muted-foreground transition hover:bg-white/[0.08] hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </header>
            <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
            {footer && (
              <footer className="border-t border-white/[0.06] px-5 py-4">{footer}</footer>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
