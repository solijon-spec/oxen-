import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ComponentType<{ className?: string }>;
  /** Percent change vs previous period. null = no comparison. */
  delta?: number | null;
  accent?: "gold" | "green" | "red" | "blue" | "default";
  delay?: number;
}

const accentMap: Record<NonNullable<StatCardProps["accent"]>, string> = {
  gold: "bg-primary/15 text-primary",
  green: "bg-emerald-500/15 text-emerald-400",
  red: "bg-destructive/15 text-destructive",
  blue: "bg-sky-500/15 text-sky-400",
  default: "bg-white/[0.06] text-muted-foreground",
};

export function StatCard({
  label,
  value,
  icon: Icon,
  delta,
  accent = "default",
  delay = 0,
}: StatCardProps) {
  const trendUp = (delta ?? 0) > 0;
  const trendDown = (delta ?? 0) < 0;
  const trendFlat = delta === null || delta === undefined || delta === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 280, damping: 26, delay }}
      className="glass rounded-2xl p-4"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
            {label}
          </p>
          <p className="mt-1.5 font-display text-2xl font-extrabold text-foreground">
            {value}
          </p>
        </div>
        {Icon && (
          <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", accentMap[accent])}>
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>
      {delta !== undefined && delta !== null && (
        <div className="mt-2 flex items-center gap-1 text-xs">
          {trendFlat ? (
            <span className="flex items-center gap-0.5 text-muted-foreground">
              <Minus className="h-3 w-3" /> —
            </span>
          ) : trendUp ? (
            <span className="flex items-center gap-0.5 text-emerald-400">
              <ArrowUpRight className="h-3 w-3" /> {Math.abs(delta).toFixed(0)}%
            </span>
          ) : (
            <span className="flex items-center gap-0.5 text-destructive">
              <ArrowDownRight className="h-3 w-3" /> {Math.abs(delta).toFixed(0)}%
            </span>
          )}
          <span className="text-muted-foreground/70">vs prev</span>
        </div>
      )}
    </motion.div>
  );
}
