import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { type ReactNode } from "react";

/* ------------------------------------------------------------------ */
/*  SettingsPageShell — reusable layout for dedicated settings pages.  */
/*  Provides a back button, title, subtitle, and scrollable content    */
/*  area that respects the bottom nav and safe areas.                  */
/* ------------------------------------------------------------------ */

interface SettingsPageShellProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
  /** Optional sticky footer (e.g. a Save button). */
  footer?: ReactNode;
}

export default function SettingsPageShell({
  title,
  subtitle,
  icon,
  children,
  footer,
}: SettingsPageShellProps) {
  const navigate = useNavigate();

  return (
    <div className="relative mx-auto max-w-lg px-4 pt-2 pb-32">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 pt-2 pb-5"
      >
        <button
          onClick={() => navigate("/profile")}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-card/50 backdrop-blur-xl border border-white/10 text-muted-foreground transition hover:bg-card/70 hover:text-foreground active:scale-90"
          aria-label="Back to profile"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2.5 min-w-0">
          {icon && (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              {icon}
            </span>
          )}
          <div className="min-w-0">
            <h1 className="font-display text-xl font-extrabold truncate">{title}</h1>
            {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
          </div>
        </div>
      </motion.div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="space-y-4"
      >
        {children}
      </motion.div>

      {/* Sticky footer */}
      {footer && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mt-8"
        >
          {footer}
        </motion.div>
      )}
    </div>
  );
}

/* ── Reusable UI primitives for settings pages ── */

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`glass rounded-2xl border border-white/[0.06] overflow-hidden divide-y divide-white/[0.04] ${className}`}>
      {children}
    </div>
  );
}

export function Row({
  icon: Icon,
  label,
  value,
  onClick,
  destructive,
  trailing,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: string;
  onClick?: () => void;
  destructive?: boolean;
  trailing?: ReactNode;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors ${
        onClick ? "hover:bg-white/[0.04] active:scale-[0.98]" : ""
      }`}
    >
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
        destructive ? "bg-destructive/10 text-destructive" : "bg-white/[0.06] text-muted-foreground"
      }`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium ${destructive ? "text-destructive" : "text-foreground"}`}>{label}</div>
        {value && <div className="text-xs text-muted-foreground truncate">{value}</div>}
      </div>
      {trailing}
    </Tag>
  );
}

export function ToggleRow({
  icon: Icon,
  label,
  value,
  onChange,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-muted-foreground">
        <Icon className="h-4 w-4" />
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{label}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 ${
          value ? "bg-primary" : "bg-white/[0.12]"
        }`}
      >
        <span className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          value ? "translate-x-6" : "translate-x-1"
        }`} />
      </button>
    </div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h3 className="px-1 pt-4 pb-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
      {children}
    </h3>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

export function FieldRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="profile-input-field rounded-2xl px-4 py-3.5">
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-muted-foreground">
          <Icon className="h-4 w-4" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
