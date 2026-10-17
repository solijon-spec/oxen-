import { cn } from "@/lib/utils";

// Merge all status style mappings — later entries win on key collision
// (e.g. "pending" appears in both client + payment + final result sets).
const STATUS_STYLES: Record<string, string> = {
  // Client application statuses
  new_lead: "bg-sky-500/15 text-sky-400 border-sky-500/20",
  contacted: "bg-indigo-500/15 text-indigo-400 border-indigo-500/20",
  consultation_scheduled: "bg-violet-500/15 text-violet-400 border-violet-500/20",
  documents_requested: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  documents_received: "bg-teal-500/15 text-teal-400 border-teal-500/20",
  under_review: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  waiting_for_result: "bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/20",
  travel_completed: "bg-primary/15 text-primary border-primary/20",

  // Shared across statuses (final overrides below)
  new: "bg-sky-500/15 text-sky-400 border-sky-500/20",
  documents: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  processing: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  submitted: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  approved: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  rejected: "bg-destructive/15 text-destructive border-destructive/20",
  completed: "bg-primary/15 text-primary border-primary/20",

  // Payment-specific
  paid: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  pending: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  failed: "bg-destructive/15 text-destructive border-destructive/20",
  refunded: "bg-rose-500/15 text-rose-400 border-rose-500/20",
  requires_verification: "bg-violet-500/15 text-violet-400 border-violet-500/20",
  cancelled: "bg-muted text-muted-foreground border-border",
  partial: "bg-amber-500/15 text-amber-400 border-amber-500/20",

  // Final result
  success: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  unsuccessful: "bg-destructive/15 text-destructive border-destructive/20",

  // Subscription statuses
  trial: "bg-sky-500/15 text-sky-400 border-sky-500/20",
  active: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  past_due: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  expired: "bg-muted text-muted-foreground border-border",
  suspended: "bg-destructive/15 text-destructive border-destructive/20",
  none: "bg-muted text-muted-foreground border-border",

  // Member statuses
  invited: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  removed: "bg-muted text-muted-foreground border-border",
};

export function StatusBadge({
  status,
  label,
  className,
}: {
  status: string;
  label?: string;
  className?: string;
}) {
  const cls = STATUS_STYLES[status] ?? "bg-muted text-muted-foreground border-border";
  const text = label ?? status.replace(/_/g, " ");
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize whitespace-nowrap",
        cls,
        className,
      )}
    >
      {text}
    </span>
  );
}
