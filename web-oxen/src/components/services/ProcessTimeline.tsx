import { memo } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

import type { ProcessStep } from "@/lib/services";

/**
 * ProcessTimeline — vertical timeline of process steps from the database.
 */
function ProcessTimelineBase({ steps }: { steps: ProcessStep[] }) {
  if (!steps || steps.length === 0) return null;

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-primary/60 via-primary/30 to-transparent" />

      <div className="space-y-5">
        {steps.map((step, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className="relative flex items-start gap-4"
          >
            <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-background">
              <span className="text-xs font-bold text-primary">{i + 1}</span>
            </div>
            <div className="glass flex-1 rounded-2xl p-4">
              <div className="font-display text-sm font-bold text-foreground">
                {step.step}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{step.description}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export const ProcessTimeline = memo(ProcessTimelineBase);

/**
 * ChecklistSection — dynamic checklist (benefits, requirements).
 */
function ChecklistBase({
  items,
  icon = "check",
}: {
  items: string[];
  icon?: "check" | "require";
}) {
  if (!items || items.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {items.map((item, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.04 }}
          className="glass flex items-center gap-3 rounded-xl p-3"
        >
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
              icon === "check"
                ? "bg-primary/15 text-primary"
                : "bg-amber-500/15 text-amber-400"
            }`}
          >
            {icon === "check" ? (
              <Check className="h-4 w-4" strokeWidth={3} />
            ) : (
              <span className="text-xs font-bold">!</span>
            )}
          </span>
          <span className="text-sm font-medium text-foreground">{item}</span>
        </motion.div>
      ))}
    </div>
  );
}

export const Checklist = memo(ChecklistBase);
