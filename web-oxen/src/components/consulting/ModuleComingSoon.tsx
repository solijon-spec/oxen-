import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Sparkles, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ModuleComingSoonProps {
  /** Module name, shown in the heading. */
  title: string;
  /** Icon for the hero block. */
  icon: LucideIcon;
  /** Short description of what the module will do. */
  description: string;
  /** Optional bullet list of planned capabilities. */
  features?: string[];
  /** Optional CTA back to dashboard. */
  showBackToDashboard?: boolean;
}

/**
 * Polished "This module will be available in the next phase." page.
 * Used for every unfinished consulting dashboard section so there are
 * no broken buttons or empty placeholder screens.
 */
export function ModuleComingSoon({
  title,
  icon: Icon,
  description,
  features,
  showBackToDashboard = true,
}: ModuleComingSoonProps) {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 26 }}
      className="glass flex flex-col items-center gap-5 rounded-3xl px-6 py-14 text-center"
    >
      <span className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 text-primary">
        <Icon className="h-7 w-7" strokeWidth={2} />
        <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Sparkles className="h-3 w-3" />
        </span>
      </span>

      <div className="space-y-2">
        <h3 className="font-display text-xl font-extrabold text-foreground">{title}</h3>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="rounded-full border border-amber-500/25 bg-amber-500/[0.06] px-4 py-1.5 text-xs font-semibold text-amber-200/90">
        This module will be available in the next phase.
      </div>

      {features && features.length > 0 && (
        <ul className="mt-2 grid w-full max-w-md gap-2 text-left sm:grid-cols-2">
          {features.map((f) => (
            <li
              key={f}
              className="flex items-start gap-2 rounded-xl bg-white/[0.03] px-3 py-2 text-xs text-muted-foreground"
            >
              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
      )}

      {showBackToDashboard && (
        <button
          onClick={() => navigate("/consulting/dashboard")}
          className="mt-2 inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-white/[0.1] active:scale-95"
        >
          Back to Dashboard
          <ArrowRight className="h-4 w-4" />
        </button>
      )}
    </motion.div>
  );
}
