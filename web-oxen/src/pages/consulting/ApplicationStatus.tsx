import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileEdit,
  ArrowRight,
  Building2,
  Plus,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { useConsulting } from "@/contexts/ConsultingContext";
import { useSEO } from "@/hooks/use-seo";
import {
  fetchMyAgencyApplication,
  checkApprovedApplication,
  STATUS_LABELS,
  STATUS_STYLE,
  type AgencyApplication,
  type AgencyApplicationStatus,
} from "@/lib/agency-applications";
import { cn } from "@/lib/utils";

const springIn = {
  type: "spring" as const,
  stiffness: 260,
  damping: 26,
};

interface StatusDisplay {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  message: string;
  color: string;
  bgColor: string;
  showCTA: boolean;
}

function getStatusDisplay(
  status: AgencyApplicationStatus | null,
  hasAgencies: boolean,
): StatusDisplay {
  switch (status) {
    case "draft":
      return {
        icon: FileEdit,
        title: "Your application is a draft",
        message: "Complete your application and submit it for review.",
        color: "text-muted-foreground",
        bgColor: "bg-white/[0.04]",
        showCTA: true,
      };
    case "submitted":
      return {
        icon: Clock,
        title: "Your application has been submitted",
        message: "OXEN is reviewing your application. You'll be notified once a decision is made.",
        color: "text-sky-400",
        bgColor: "bg-sky-500/[0.06]",
        showCTA: false,
      };
    case "under_review":
      return {
        icon: Clock,
        title: "OXEN is reviewing your application",
        message: "Your application is under review. This typically takes 1-3 business days.",
        color: "text-amber-400",
        bgColor: "bg-amber-500/[0.06]",
        showCTA: false,
      };
    case "more_info_required":
      return {
        icon: AlertCircle,
        title: "OXEN needs additional information",
        message: "Please review the message from OXEN and update your application.",
        color: "text-purple-400",
        bgColor: "bg-purple-500/[0.06]",
        showCTA: true,
      };
    case "approved":
      return {
        icon: CheckCircle2,
        title: "Your agency has been approved!",
        message: hasAgencies
          ? "CRM access is now available. Open your workspace to get started."
          : "CRM access is now available. Create your agency workspace to get started.",
        color: "text-emerald-400",
        bgColor: "bg-emerald-500/[0.06]",
        showCTA: true,
      };
    case "rejected":
      return {
        icon: XCircle,
        title: "Your application was not approved",
        message: "Review the rejection reason below and edit your application to resubmit.",
        color: "text-destructive",
        bgColor: "bg-destructive/[0.06]",
        showCTA: true,
      };
    default:
      return {
        icon: Building2,
        title: "No application yet",
        message: "Apply for OXEN CRM access to manage your travel agency.",
        color: "text-primary",
        bgColor: "bg-primary/[0.06]",
        showCTA: true,
      };
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

/**
 * ApplicationStatus — shows the user their current agency application status.
 *
 * If approved: allows access to the multi-agency workspace.
 * If rejected: shows rejection reason + edit/resubmit CTA.
 * If more_info_required: shows owner message + edit CTA.
 * If no application: shows "Apply" CTA.
 */
export default function ApplicationStatus() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { agencies, loading: agenciesLoading } = useConsulting();

  const [application, setApplication] = useState<AgencyApplication | null>(null);
  const [loading, setLoading] = useState(true);

  useSEO({
    title: "Application Status | OXEN CRM",
    description: "Check your OXEN CRM application status.",
  });

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      try {
        const app = await fetchMyAgencyApplication(user.id);
        setApplication(app);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const status = application?.status ?? null;
  const display = getStatusDisplay(status, agencies.length > 0);
  const Icon = display.icon;

  if (loading || agenciesLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleCTA = () => {
    if (status === "approved") {
      navigate("/consulting/workspace", { replace: true });
    } else if (status === "more_info_required" || status === "rejected" || status === "draft") {
      navigate("/consulting/apply", { replace: true });
    } else {
      navigate("/consulting/apply", { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-white/[0.06]">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-6 py-5">
          <h1 className="font-display text-xl font-bold text-foreground">Application Status</h1>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springIn}
          className={cn("rounded-2xl border border-white/[0.06] p-8 text-center", display.bgColor)}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ ...springIn, delay: 0.1 }}
            className={cn("mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl", display.bgColor)}
          >
            <Icon className={cn("h-8 w-8", display.color)} />
          </motion.div>

          <h2 className="font-display text-xl font-bold text-foreground">
            {display.title}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            {display.message}
          </p>

          {/* Status badge */}
          {status && (
            <div className="mt-4">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider",
                  STATUS_STYLE[status],
                )}
              >
                {STATUS_LABELS[status]}
              </span>
            </div>
          )}

          {/* CTA */}
          {display.showCTA && (
            <button
              onClick={handleCTA}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition hover:bg-primary/90"
            >
              {status === "approved" ? (
                <>
                  {agencies.length > 0 ? "Open CRM" : "Get Started"}
                  <ArrowRight className="h-4 w-4" />
                </>
              ) : status === "more_info_required" || status === "rejected" ? (
                <>
                  <FileEdit className="h-4 w-4" />
                  Edit & Resubmit Application
                </>
              ) : status === "draft" ? (
                <>
                  <FileEdit className="h-4 w-4" />
                  Continue Application
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Apply for CRM Access
                </>
              )}
            </button>
          )}
        </motion.div>

        {/* Application details */}
        {application && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springIn, delay: 0.15 }}
            className="mt-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6"
          >
            <h3 className="mb-4 font-display text-sm font-bold text-foreground">
              Application Details
            </h3>

            <div className="grid gap-3 sm:grid-cols-2">
              <DetailRow label="Agency" value={application.agency_name} />
              <DetailRow label="Legal Name" value={application.legal_name} />
              <DetailRow label="Manager" value={application.manager_name} />
              <DetailRow label="Phone" value={application.phone} />
              <DetailRow label="Country" value={application.country} />
              <DetailRow label="City" value={application.city} />
              <DetailRow label="License Number" value={application.license_number} />
              <DetailRow label="Submitted" value={formatDate(application.submitted_at)} />
            </div>

            {/* More info required message */}
            {status === "more_info_required" && application.owner_request_message && (
              <div className="mt-4 rounded-xl border border-purple-500/25 bg-purple-500/[0.06] p-4">
                <p className="font-semibold text-purple-300">Message from OXEN:</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {application.owner_request_message}
                </p>
              </div>
            )}

            {/* Rejection reason */}
            {status === "rejected" && application.rejection_reason && (
              <div className="mt-4 rounded-xl border border-destructive/25 bg-destructive/[0.06] p-4">
                <p className="font-semibold text-destructive">Rejection reason:</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {application.rejection_reason}
                </p>
              </div>
            )}

            {/* Admin note */}
            {application.admin_note && (status === "approved" || status === "rejected") && (
              <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <p className="font-semibold text-foreground">Admin note:</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {application.admin_note}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="text-sm text-foreground">{value ?? "—"}</p>
    </div>
  );
}
