import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  Plus,
  LogIn,
  ArrowRight,
  Sparkles,
  Users,
  Package,
  BarChart3,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { useConsulting } from "@/contexts/ConsultingContext";
import { useSEO } from "@/hooks/use-seo";
import { cn } from "@/lib/utils";
import type { AgencyMembership } from "@/lib/consulting";
import {
  fetchMyAgencyApplication,
  STATUS_LABELS,
  STATUS_STYLE,
  type AgencyApplication,
  type AgencyApplicationStatus,
} from "@/lib/agency-applications";

const springIn = {
  type: "spring" as const,
  stiffness: 260,
  damping: 26,
};

/**
 * WorkspaceOnboarding — the multi-agency entry point.
 *
 * Shows when a user has zero agencies OR as a hub to create/join/switch.
 * Also checks agency application status — if the user has not been
 * approved yet, shows the application CTA instead of Create/Join.
 *
 * Flow:
 *   1. No application → "Apply for CRM Access"
 *   2. Application submitted/under_review → "Application under review"
 *   3. Application more_info_required → "Update your application"
 *   4. Application rejected → "Edit & resubmit"
 *   5. Application approved + zero agencies → "Create/Join Agency"
 *   6. Application approved + has agencies → My Agencies list + Create/Join
 */
export default function WorkspaceOnboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { agencies, activeAgencyId, switchAgency, loading } = useConsulting();

  const [application, setApplication] = useState<AgencyApplication | null>(null);
  const [appLoading, setAppLoading] = useState(true);

  useSEO({
    title: "OXEN CRM Workspace",
    description: "Create or join a travel agency workspace.",
  });

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setAppLoading(true);
      try {
        const app = await fetchMyAgencyApplication(user.id);
        if (!cancelled) setApplication(app);
      } finally {
        if (!cancelled) setAppLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleOpenAgency = (agencyId: string) => {
    switchAgency(agencyId);
    navigate("/consulting/dashboard");
  };

  const appStatus = application?.status ?? null;
  const isApproved = appStatus === "approved";
  const hasNoApplication = !application;
  const isBlocked = !isApproved && !hasNoApplication; // submitted, under_review, more_info_required, rejected

  // Determine what to show for the application gate
  const showApplicationGate = !isApproved && !hasNoApplication;
  const showApplyCTA = hasNoApplication || appStatus === "draft";

  const isLoading = loading || appLoading;

  // Auto-redirect to dashboard when user has agencies and is approved.
  // Don't redirect if not approved (would cause loop with RequireConsultingMember).
  useEffect(() => {
    if (isLoading) return;
    if (agencies.length > 0 && activeAgencyId && isApproved) {
      navigate("/consulting/dashboard", { replace: true });
    }
  }, [isLoading, agencies.length, activeAgencyId, isApproved, navigate]);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero header */}
      <div className="relative overflow-hidden border-b border-white/[0.06]">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.08] via-transparent to-transparent" />
        <div className="absolute -top-20 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-primary/10 blur-[100px]" />
        <div className="relative mx-auto max-w-4xl px-6 py-16 text-center lg:py-24">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={springIn}
            className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15"
          >
            <Sparkles className="h-8 w-8 text-primary" />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springIn, delay: 0.05 }}
            className="font-display text-3xl font-extrabold text-foreground lg:text-4xl"
          >
            Welcome to OXEN CRM
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springIn, delay: 0.1 }}
            className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground lg:text-base"
          >
            Manage your travel agency — clients, applications, tour packages, team, and analytics.
            {isApproved
              ? " Create a new agency or join an existing one to get started."
              : " Apply for CRM access to get started."}
          </motion.p>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-6 py-10">
        {/* Loading state — shown while auth, agency data, or application status loads.
            Never show "no agencies" during loading. */}
        {isLoading && (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Application status banner (when not approved and has an application) */}
        {showApplicationGate && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={springIn}
            className="mb-8"
          >
            <ApplicationBanner
              status={appStatus as AgencyApplicationStatus}
              application={application}
              onEdit={() => navigate("/consulting/apply")}
              onViewStatus={() => navigate("/consulting/application-status")}
            />
          </motion.div>
        )}

        {/* Apply for CRM Access card (no application or draft) */}
        {showApplyCTA && !isLoading && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={springIn}
            className="mb-8"
          >
            <button
              onClick={() => navigate("/consulting/apply")}
              className="group relative w-full overflow-hidden rounded-2xl border border-primary/20 bg-primary/[0.04] p-6 text-left transition-all hover:border-primary/40 hover:bg-primary/[0.08]"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary transition-transform group-hover:scale-110">
                  <FileText className="h-7 w-7" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-lg font-bold text-foreground">
                    {hasNoApplication ? "Apply for OXEN CRM Access" : "Continue Your Application"}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {hasNoApplication
                      ? "Submit your tour agency information and documents for review. OXEN will verify and approve your account."
                      : "Your application is saved as a draft. Complete and submit it for review."}
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 shrink-0 text-primary transition-transform group-hover:translate-x-1" />
              </div>
            </button>
          </motion.section>
        )}

        {/* My Agencies list — show whenever user has agencies, regardless of approval status */}
        {agencies.length > 0 && !isLoading && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springIn, delay: 0.15 }}
            className="mb-10"
          >
            <h2 className="mb-4 font-display text-lg font-bold text-foreground">
              My Agencies <span className="text-muted-foreground">({agencies.length})</span>
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {agencies.map((am: AgencyMembership) => (
                <AgencyCard
                  key={am.company.id}
                  membership={am}
                  isActive={am.company.id === activeAgencyId}
                  onOpen={() => handleOpenAgency(am.company.id)}
                />
              ))}
            </div>
          </motion.section>
        )}

        {/* Create / Join cards (only if approved) */}
        {isApproved && !isLoading && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springIn, delay: 0.2 }}
          >
            {agencies.length === 0 && (
              <p className="mb-6 text-center text-sm text-muted-foreground">
                You don&apos;t belong to any agency yet. Choose an option below.
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Create Agency */}
              <button
                onClick={() => navigate("/consulting/create-agency")}
                className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-left transition-all hover:border-primary/30 hover:bg-primary/[0.04]"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary transition-transform group-hover:scale-110">
                  <Plus className="h-6 w-6" />
                </div>
                <h3 className="font-display text-lg font-bold text-foreground">Create Agency</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Start a new travel agency workspace. You become the owner and can invite team members.
                </p>
                <div className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-primary">
                  Get started <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </button>

              {/* Join Agency */}
              <button
                onClick={() => navigate("/consulting/join-agency")}
                className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-left transition-all hover:border-primary/30 hover:bg-primary/[0.04]"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary transition-transform group-hover:scale-110">
                  <LogIn className="h-6 w-6" />
                </div>
                <h3 className="font-display text-lg font-bold text-foreground">Join Existing Agency</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Have an Agency Code? Find your agency and request access. The owner will approve your request.
                </p>
                <div className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-primary">
                  Enter code <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </button>
            </div>
          </motion.section>
        )}

        {/* Feature highlights */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springIn, delay: 0.25 }}
          className="mt-12 grid gap-3 sm:grid-cols-3"
        >
          {[
            { icon: Users, label: "Client Management" },
            { icon: Package, label: "Tour Packages" },
            { icon: BarChart3, label: "Analytics & Reports" },
          ].map((f) => (
            <div
              key={f.label}
              className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3"
            >
              <f.icon className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-foreground">{f.label}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

/** Application status banner shown when the user has a non-approved application. */
function ApplicationBanner({
  status,
  application,
  onEdit,
  onViewStatus,
}: {
  status: AgencyApplicationStatus;
  application: AgencyApplication | null;
  onEdit: () => void;
  onViewStatus: () => void;
}) {
  const config: Record<
    AgencyApplicationStatus,
    {
      icon: React.ComponentType<{ className?: string }>;
      title: string;
      message: string;
      color: string;
      bgColor: string;
      borderColor: string;
      cta: { label: string; action: () => void } | null;
    }
  > = {
    draft: {
      icon: FileText,
      title: "Your application is a draft",
      message: "Complete and submit your application for OXEN review.",
      color: "text-muted-foreground",
      bgColor: "bg-white/[0.04]",
      borderColor: "border-white/[0.06]",
      cta: { label: "Continue Application", action: onEdit },
    },
    submitted: {
      icon: Clock,
      title: "Your application has been submitted",
      message: "OXEN is reviewing your application. You'll be notified once approved.",
      color: "text-sky-400",
      bgColor: "bg-sky-500/[0.06]",
      borderColor: "border-sky-500/20",
      cta: { label: "View Status", action: onViewStatus },
    },
    under_review: {
      icon: Clock,
      title: "OXEN is reviewing your application",
      message: "Your application is under review. This typically takes 1-3 business days.",
      color: "text-amber-400",
      bgColor: "bg-amber-500/[0.06]",
      borderColor: "border-amber-500/20",
      cta: { label: "View Status", action: onViewStatus },
    },
    more_info_required: {
      icon: AlertCircle,
      title: "OXEN needs additional information",
      message: application?.owner_request_message ?? "Please update your application with the requested information.",
      color: "text-purple-400",
      bgColor: "bg-purple-500/[0.06]",
      borderColor: "border-purple-500/20",
      cta: { label: "Update Application", action: onEdit },
    },
    approved: {
      icon: CheckCircle2,
      title: "Approved",
      message: "Your agency has been approved.",
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/[0.06]",
      borderColor: "border-emerald-500/20",
      cta: null,
    },
    rejected: {
      icon: XCircle,
      title: "Your application was not approved",
      message: application?.rejection_reason ?? "You can edit and resubmit your application.",
      color: "text-destructive",
      bgColor: "bg-destructive/[0.06]",
      borderColor: "border-destructive/20",
      cta: { label: "Edit & Resubmit", action: onEdit },
    },
  };

  const cfg = config[status];
  const Icon = cfg.icon;

  return (
    <div className={cn("rounded-2xl border p-5", cfg.borderColor, cfg.bgColor)}>
      <div className="flex items-start gap-4">
        <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", cfg.bgColor)}>
          <Icon className={cn("h-5 w-5", cfg.color)} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-sm font-bold text-foreground">{cfg.title}</h3>
            <span
              className={cn(
                "inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                STATUS_STYLE[status],
              )}
            >
              {STATUS_LABELS[status]}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{cfg.message}</p>
          {cfg.cta && (
            <button
              onClick={cfg.cta.action}
              className={cn(
                "mt-3 inline-flex items-center gap-1.5 text-xs font-bold transition hover:opacity-80",
                cfg.color,
              )}
            >
              {cfg.cta.label}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Compact agency card for the My Agencies list. */
function AgencyCard({
  membership,
  isActive,
  onOpen,
}: {
  membership: AgencyMembership;
  isActive: boolean;
  onOpen: () => void;
}) {
  const { company, member } = membership;
  const logoUrl = company.logo_url ?? null;

  return (
    <button
      onClick={onOpen}
      className={cn(
        "group flex items-center gap-3 rounded-xl border p-4 text-left transition-all",
        isActive
          ? "border-primary/40 bg-primary/[0.06]"
          : "border-white/[0.06] bg-white/[0.02] hover:border-primary/20 hover:bg-white/[0.04]",
      )}
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/15">
        {logoUrl ? (
          <img src={logoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <Building2 className="h-5 w-5 text-primary" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-sm font-bold text-foreground">{company.name}</p>
        <p className="truncate text-xs capitalize text-muted-foreground">
          {member.role} {company.city ? `· ${company.city}` : ""}
        </p>
      </div>
      {isActive && (
        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
          Active
        </span>
      )}
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
    </button>
  );
}
