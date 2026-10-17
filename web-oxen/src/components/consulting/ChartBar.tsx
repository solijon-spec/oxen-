import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface ChartBarDatum {
  label: string;
  value: number;
  /** Optional secondary value (e.g. revenue alongside clients). */
  secondary?: number;
}

interface ChartBarProps {
  title: string;
  data: ChartBarDatum[];
  /** "count" shows whole numbers; "currency" formats $. */
  format?: "count" | "currency";
  /** Show secondary series as a line overlay. */
  showSecondary?: boolean;
  className?: string;
}

export function ChartBar({
  title,
  data,
  format = "count",
  showSecondary = false,
  className,
}: ChartBarProps) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const maxSec = Math.max(1, ...data.map((d) => d.secondary ?? 0));

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      className={cn("glass rounded-2xl p-5", className)}
    >
      <h3 className="mb-4 font-display text-sm font-bold text-foreground">{title}</h3>
      {data.length === 0 ? (
        <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
          No data yet
        </div>
      ) : (
        <div className="flex h-32 items-end justify-between gap-2">
          {data.map((d, i) => {
            const h = (d.value / max) * 100;
            return (
              <div key={`${d.label}-${i}`} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="relative flex w-full flex-1 items-end justify-center">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max(2, h)}%` }}
                    transition={{ delay: i * 0.05, type: "spring", stiffness: 200, damping: 22 }}
                    className="w-full max-w-[28px] rounded-t-md bg-gradient-to-t from-primary/40 to-primary"
                    style={{ minHeight: 2 }}
                  />
                  {showSecondary && d.secondary !== undefined && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: i * 0.05 + 0.2 }}
                      className="absolute -top-1 h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px] shadow-emerald-400/60"
                      style={{ bottom: `${(d.secondary / maxSec) * 100}%` }}
                    />
                  )}
                </div>
                <span className="text-[10px] font-medium text-muted-foreground">
                  {format === "currency" && d.value > 0
                    ? `$${d.value.toLocaleString()}`
                    : d.value.toLocaleString()}
                </span>
                <span className="text-[10px] text-muted-foreground/70">{d.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

/** Donut/ring chart for distribution data. */
export function ChartRing({
  title,
  data,
  className,
}: {
  title: string;
  data: { label: string; count: number; color: string }[];
  className?: string;
}) {
  const total = Math.max(1, data.reduce((s, d) => s + d.count, 0));
  let cumulative = 0;
  const segments = data.map((d) => {
    const pct = d.count / total;
    const seg = { ...d, pct, start: cumulative };
    cumulative += pct;
    return seg;
  });

  const radius = 50;
  const circumference = 2 * Math.PI * radius;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      className={cn("glass rounded-2xl p-5", className)}
    >
      <h3 className="mb-4 font-display text-sm font-bold text-foreground">{title}</h3>
      {data.length === 0 || total === 0 ? (
        <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
          No data yet
        </div>
      ) : (
        <div className="flex items-center gap-5">
          <svg width="120" height="120" viewBox="0 0 120 120" className="shrink-0">
            <circle cx="60" cy="60" r={radius} fill="none" stroke="hsl(225 25% 16%)" strokeWidth="14" />
            {segments.map((s, i) => {
              const dash = s.pct * circumference;
              return (
                <motion.circle
                  key={i}
                  cx="60"
                  cy="60"
                  r={radius}
                  fill="none"
                  stroke={s.color}
                  strokeWidth="14"
                  strokeLinecap="round"
                  strokeDasharray={`${dash} ${circumference - dash}`}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset: 0 }}
                  transition={{ delay: i * 0.1, duration: 0.6 }}
                  transform="rotate(-90 60 60)"
                  style={{ transformOrigin: "center" }}
                />
              );
            })}
            <text x="60" y="58" textAnchor="middle" className="fill-foreground font-display text-lg font-bold">
              {total}
            </text>
            <text x="60" y="76" textAnchor="middle" className="fill-muted-foreground text-[9px]">
              total
            </text>
          </svg>
          <div className="flex-1 space-y-1.5">
            {segments.map((s, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-muted-foreground capitalize">
                  <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                  {s.label}
                </span>
                <span className="font-semibold text-foreground">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
