import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  Search,
  FileStack,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Eye,
  X,
  FileText,
  Download,
  ExternalLink,
  MessageSquare,
  Loader2,
  ChevronDown,
} from "lucide-react";

import { OwnerShell } from "@/components/consulting/OwnerShell";
import { EmptyState } from "@/components/consulting/EmptyState";
import { StatCard } from "@/components/consulting/StatCard";
import { useSEO } from "@/hooks/use-seo";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchAllAgencyApplications,
  fetchAgencyApplicationStats,
  approveAgencyApplication,
  rejectAgencyApplication,
  requestMoreInfo,
  setUnderReview,
  getSignedDocumentUrl,
  STATUS_LABELS,
  STATUS_STYLE,
  type AgencyApplication,
  type AgencyApplicationStatus,
  type AgencyApplicationSummary,
} from "@/lib/agency-applications";
import { cn } from "@/lib/utils";

const springIn = { type: "spring" as const, stiffness: 260, damping: 26 };

const FILTER_OPTIONS: Array<{ value: AgencyApplicationStatus | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "submitted", label: "New" },
  { value: "under_review", label: "Under Review" },
  { value: "more_info_required", label: "More Info" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "draft", label: "Draft" },
];

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

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

/**
 * OwnerAgencyApplications — the Tour Agency CRM Application review page.
 *
 * Shows all agency applications with summary stats, filters, and search.
 * Owner can review full application details in a slide-over modal and
 * approve, reject, or request more information.
 */
export default function OwnerAgencyApplications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<AgencyApplicationStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [reviewApp, setReviewApp] = useState<AgencyApplication | null>(null);

  useSEO({
    title: "Tour Agency Applications | OXEN Owner",
    description: "Review and approve tour agency CRM access applications.",
  });

  const statsQ = useQuery({
    queryKey: ["agency-applications-stats"],
    queryFn: () => fetchAgencyApplicationStats(),
    staleTime: 15_000,
  });

  const appsQ = useQuery({
    queryKey: ["agency-applications", statusFilter],
    queryFn: () => fetchAllAgencyApplications(statusFilter),
    staleTime: 15_000,
  });

  const stats = statsQ.data;
  const allApps = appsQ.data ?? [];

  const filtered = search.trim()
    ? allApps.filter((a) => {
        const q = search.trim().toLowerCase();
        return (
          a.agency_name.toLowerCase().includes(q) ||
          (a.manager_name ?? "").toLowerCase().includes(q) ||
          (a.email ?? "").toLowerCase().includes(q) ||
          (a.phone ?? "").toLowerCase().includes(q) ||
          (a.license_number ?? "").toLowerCase().includes(q)
        );
      })
    : allApps;

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["agency-applications"] });
    queryClient.invalidateQueries({ queryKey: ["agency-applications-stats"] });
  }, [queryClient]);

  return (
    <OwnerShell
      title="Tour Agency Applications"
      subtitle="Review and approve CRM access requests from tour agencies"
    >
      {/* Summary stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          label="New"
          value={stats?.new ?? 0}
          icon={FileStack}
          accent="gold"
          delay={0}
        />
        <StatCard
          label="Under Review"
          value={stats?.under_review ?? 0}
          icon={Clock}
          accent="blue"
          delay={0.05}
        />
        <StatCard
          label="Approved"
          value={stats?.approved ?? 0}
          icon={CheckCircle2}
          accent="green"
          delay={0.1}
        />
        <StatCard
          label="Rejected"
          value={stats?.rejected ?? 0}
          icon={XCircle}
          accent="red"
          delay={0.15}
        />
        <StatCard
          label="Total"
          value={stats?.total ?? 0}
          icon={Building2}
          delay={0.2}
        />
      </div>

      {/* Search */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by agency name, applicant, email, phone, or license number…"
            className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] py-2.5 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-amber-500/40 focus:outline-none"
          />
        </div>
      </div>

      {/* Filter chips */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setStatusFilter(opt.value)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-semibold transition",
              statusFilter === opt.value
                ? "bg-amber-500/20 text-amber-300"
                : "bg-white/[0.04] text-muted-foreground hover:bg-white/[0.08] hover:text-foreground",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Results */}
      {appsQ.isLoading ? (
        <div className="glass rounded-2xl p-8 text-center text-sm text-muted-foreground">
          Loading applications…
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FileStack}
          title="No agency applications"
          description={search ? "Try a different search term." : "No tour agency applications match this filter."}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((app, i) => (
            <motion.button
              key={app.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springIn, delay: i * 0.03 }}
              onClick={() => setReviewApp(app)}
              className="glass w-full rounded-2xl p-4 text-left transition hover:bg-white/[0.06]"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {/* Agency info */}
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-amber-500/10">
                    {app.logo_url ? (
                      <PrivateImage path={app.logo_url} alt="" className="h-full w-full object-cover" fallback={<Building2 className="h-6 w-6 text-amber-300" />} />
                    ) : (
                      <Building2 className="h-6 w-6 text-amber-300" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-display text-sm font-bold text-foreground">
                      {app.agency_name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {app.manager_name ?? "—"} · {app.email ?? "—"}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {app.country ?? "—"}, {app.city ?? "—"} · License: {app.license_number ?? "—"}
                    </p>
                  </div>
                </div>

                {/* Status + date */}
                <div className="flex items-center gap-3">
                  <div className="hidden text-right sm:block">
                    <p className="text-[11px] text-muted-foreground">Submitted</p>
                    <p className="text-xs text-foreground">{formatDate(app.submitted_at)}</p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider",
                      STATUS_STYLE[app.status],
                    )}
                  >
                    {STATUS_LABELS[app.status]}
                  </span>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-300">
                    <Eye className="h-4 w-4" />
                  </span>
                </div>
              </div>

              {/* Mobile-only date */}
              <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground sm:hidden">
                <span>Submitted: {formatDate(app.submitted_at)}</span>
              </div>
            </motion.button>
          ))}
          <p className="text-center text-[11px] text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "application" : "applications"}
          </p>
        </div>
      )}

      {/* Review modal */}
      <AnimatePresence>
        {reviewApp && (
          <ReviewModal
            application={reviewApp}
            reviewerId={user?.id ?? ""}
            onClose={() => setReviewApp(null)}
            onAction={(action: string) => {
              invalidateAll();
              setReviewApp(null);
              toast({ title: action });
            }}
          />
        )}
      </AnimatePresence>
    </OwnerShell>
  );
}

// ── Review Modal (slide-over) ──────────────────────────────

type ReviewAction = "approve" | "reject" | "request_info" | "start_review";

function ReviewModal({
  application,
  reviewerId,
  onClose,
  onAction,
}: {
  application: AgencyApplication;
  reviewerId: string;
  onClose: () => void;
  onAction: (message: string) => void;
}) {
  const { toast } = useToast();
  const [action, setAction] = useState<ReviewAction | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [requestMessage, setRequestMessage] = useState("");
  const [processing, setProcessing] = useState(false);
  const [showDocs, setShowDocs] = useState(false);

  const isFinal = application.status === "approved" || application.status === "rejected";
  const canStartReview = application.status === "submitted";

  const handleStartReview = async () => {
    setProcessing(true);
    try {
      const result = await setUnderReview(application.id, reviewerId);
      if (result.ok) {
        onAction("Review started — status set to Under Review");
      } else {
        toast({ title: "Failed to start review", description: result.error ?? undefined, variant: "destructive" });
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleApprove = async () => {
    setProcessing(true);
    try {
      // Set under review first if not already
      if (application.status === "submitted") {
        await setUnderReview(application.id, reviewerId);
      }
      const result = await approveAgencyApplication(application.id, reviewerId, adminNote.trim() || undefined);
      if (result.ok) {
        onAction("Agency approved — CRM access granted");
      } else {
        toast({ title: "Approval failed", description: result.error ?? undefined, variant: "destructive" });
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast({ title: "Rejection reason is required", variant: "destructive" });
      return;
    }
    setProcessing(true);
    try {
      const result = await rejectAgencyApplication(
        application.id,
        reviewerId,
        rejectionReason.trim(),
        adminNote.trim() || undefined,
      );
      if (result.ok) {
        onAction("Application rejected");
      } else {
        toast({ title: "Rejection failed", description: result.error ?? undefined, variant: "destructive" });
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleRequestInfo = async () => {
    if (!requestMessage.trim()) {
      toast({ title: "Message is required", variant: "destructive" });
      return;
    }
    setProcessing(true);
    try {
      const result = await requestMoreInfo(application.id, reviewerId, requestMessage.trim());
      if (result.ok) {
        onAction("More information requested");
      } else {
        toast({ title: "Request failed", description: result.error ?? undefined, variant: "destructive" });
      }
    } finally {
      setProcessing(false);
    }
  };

  const social = application.social_links ?? {};

  return (
    <>
      <div className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 32 }}
        className="fixed inset-y-0 right-0 z-[91] flex w-full max-w-xl flex-col bg-sidebar/95 backdrop-blur-xl shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <div className="min-w-0">
            <h3 className="truncate font-display text-base font-bold text-foreground">
              {application.agency_name}
            </h3>
            <div className="mt-1 flex items-center gap-2">
              <span
                className={cn(
                  "inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                  STATUS_STYLE[application.status],
                )}
              >
                {STATUS_LABELS[application.status]}
              </span>
              <span className="text-[10px] text-muted-foreground">
                Submitted {formatDate(application.submitted_at)}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-white/[0.06] hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* A. Agency Information */}
          <Section title="Agency Information">
            <DetailGrid>
              <DetailItem label="Agency Name" value={application.agency_name} />
              <DetailItem label="Legal Name" value={application.legal_name} />
              <DetailItem label="Manager" value={application.manager_name} />
              <DetailItem label="Phone" value={application.phone} />
              <DetailItem label="Email" value={application.email} />
              <DetailItem label="Website" value={application.website} />
              <DetailItem label="Country" value={application.country} />
              <DetailItem label="City" value={application.city} />
              <DetailItem label="Address" value={application.address} />
              <DetailItem label="Instagram" value={social.instagram} />
              <DetailItem label="Telegram" value={social.telegram} />
              <DetailItem label="WhatsApp" value={social.whatsapp} />
            </DetailGrid>
          </Section>

          {/* B. License Information */}
          <Section title="License Information">
            <DetailGrid>
              <DetailItem label="License Number" value={application.license_number} />
              <DetailItem label="Issuing Organization" value={application.license_issuing_org} />
              <DetailItem label="Issue Date" value={formatDate(application.license_issue_date)} />
              <DetailItem label="Expiry Date" value={formatDate(application.license_expiry_date)} />
            </DetailGrid>
          </Section>

          {/* C. Documents */}
          <Section title="Documents">
            <p className="mb-3 text-xs text-muted-foreground">
              These documents are private. Only authorized OXEN administrators can access them.
            </p>
            <div className="space-y-2">
              <DocumentRow
                label="Tourism License Document"
                path={application.license_document_url}
              />
              <DocumentRow
                label="Company Registration Document"
                path={application.registration_document_url}
              />
              {application.additional_documents && application.additional_documents.length > 0 && (
                <>
                  {application.additional_documents.map((doc, idx) => (
                    <DocumentRow
                      key={idx}
                      label={doc.name ?? `Additional Document ${idx + 1}`}
                      path={doc.url}
                    />
                  ))}
                </>
              )}
              {application.agency_photos && application.agency_photos.length > 0 && (
                <div className="mt-3">
                  <button
                    onClick={() => setShowDocs((s) => !s)}
                    className="flex items-center gap-1 text-xs font-semibold text-amber-300 transition hover:text-amber-200"
                  >
                    <ChevronDown className={cn("h-3 w-3 transition-transform", showDocs && "rotate-180")} />
                    Agency Photos ({application.agency_photos.length})
                  </button>
                  {showDocs && (
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {application.agency_photos.map((photo, idx) => (
                        <SignedPhotoLink key={idx} path={photo.url} name={photo.name ?? ""} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </Section>

          {/* Review info (if already reviewed) */}
          {(application.reviewed_at || application.admin_note || application.rejection_reason || application.owner_request_message) && (
            <Section title="Review History">
              <DetailGrid>
                <DetailItem label="Reviewed At" value={formatDateTime(application.reviewed_at)} />
                <DetailItem label="Reviewed By" value={application.reviewed_by} />
              </DetailGrid>
              {application.admin_note && (
                <div className="mt-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Admin Note</p>
                  <p className="mt-1 text-sm text-foreground">{application.admin_note}</p>
                </div>
              )}
              {application.rejection_reason && (
                <div className="mt-2 rounded-xl border border-destructive/20 bg-destructive/[0.04] p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-destructive">Rejection Reason</p>
                  <p className="mt-1 text-sm text-foreground">{application.rejection_reason}</p>
                </div>
              )}
              {application.owner_request_message && (
                <div className="mt-2 rounded-xl border border-purple-500/20 bg-purple-500/[0.04] p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-purple-300">Request to Applicant</p>
                  <p className="mt-1 text-sm text-foreground">{application.owner_request_message}</p>
                </div>
              )}
            </Section>
          )}

          {/* Owner Actions */}
          {!isFinal && (
            <Section title="Owner Actions">
              {/* Start Review button — only when status is submitted */}
              {canStartReview && !action && (
                <button
                  onClick={handleStartReview}
                  disabled={processing}
                  className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500/15 py-2.5 text-sm font-bold text-amber-300 transition hover:bg-amber-500/25 disabled:opacity-50"
                >
                  {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                  Start Review
                </button>
              )}

              {/* Action selector */}
              {!action && (
                <div className="grid gap-2 sm:grid-cols-3">
                  <ActionButton
                    icon={CheckCircle2}
                    label="Approve Agency"
                    color="emerald"
                    onClick={() => setAction("approve")}
                  />
                  <ActionButton
                    icon={XCircle}
                    label="Reject Application"
                    color="destructive"
                    onClick={() => setAction("reject")}
                  />
                  <ActionButton
                    icon={MessageSquare}
                    label="Request More Info"
                    color="purple"
                    onClick={() => setAction("request_info")}
                  />
                </div>
              )}

              {/* Approve flow */}
              {action === "approve" && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4">
                  <p className="font-semibold text-emerald-300">
                    Approve {application.agency_name} for OXEN CRM access?
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    This will grant CRM access to the applicant&apos;s authenticated OXEN account.
                    They will be able to create or join an agency workspace.
                  </p>
                  <textarea
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="Optional admin note (visible to applicant)…"
                    rows={2}
                    className="mt-3 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-emerald-500/40 focus:outline-none"
                  />
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={handleApprove}
                      disabled={processing}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500/20 py-2.5 text-sm font-bold text-emerald-300 transition hover:bg-emerald-500/30 disabled:opacity-50"
                    >
                      {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Confirm Approval
                    </button>
                    <button
                      onClick={() => setAction(null)}
                      disabled={processing}
                      className="rounded-xl border border-white/[0.06] px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Reject flow */}
              {action === "reject" && (
                <div className="rounded-xl border border-destructive/20 bg-destructive/[0.04] p-4">
                  <p className="font-semibold text-destructive">
                    Reject {application.agency_name}?
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    The applicant will see the rejection reason and can edit & resubmit.
                  </p>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Rejection reason (required) — e.g. Invalid license, missing documents, unable to verify…"
                    rows={3}
                    className="mt-3 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-destructive/40 focus:outline-none"
                  />
                  <textarea
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="Optional internal admin note…"
                    rows={2}
                    className="mt-2 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
                  />
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={handleReject}
                      disabled={processing || !rejectionReason.trim()}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-destructive/20 py-2.5 text-sm font-bold text-destructive transition hover:bg-destructive/30 disabled:opacity-50"
                    >
                      {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                      Confirm Rejection
                    </button>
                    <button
                      onClick={() => setAction(null)}
                      disabled={processing}
                      className="rounded-xl border border-white/[0.06] px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Request info flow */}
              {action === "request_info" && (
                <div className="rounded-xl border border-purple-500/20 bg-purple-500/[0.04] p-4">
                  <p className="font-semibold text-purple-300">
                    Request more information from {application.agency_name}?
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    The applicant will see your message and be allowed to update and resubmit.
                  </p>
                  <textarea
                    value={requestMessage}
                    onChange={(e) => setRequestMessage(e.target.value)}
                    placeholder="Message to applicant (required) — e.g. Please upload a clearer license image…"
                    rows={3}
                    className="mt-3 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-purple-500/40 focus:outline-none"
                  />
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={handleRequestInfo}
                      disabled={processing || !requestMessage.trim()}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-purple-500/20 py-2.5 text-sm font-bold text-purple-300 transition hover:bg-purple-500/30 disabled:opacity-50"
                    >
                      {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                      Send Request
                    </button>
                    <button
                      onClick={() => setAction(null)}
                      disabled={processing}
                      className="rounded-xl border border-white/[0.06] px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </Section>
          )}

          {/* Application ID */}
          <div className="mt-6 border-t border-white/[0.06] pt-4">
            <p className="text-[10px] text-muted-foreground">
              Application ID: <span className="font-mono">{application.id}</span>
            </p>
            <p className="text-[10px] text-muted-foreground">
              Created: {formatDateTime(application.created_at)}
            </p>
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ── Sub-components ─────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-amber-300">
        {title}
      </h4>
      {children}
    </div>
  );
}

function DetailGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2">{children}</div>;
}

function DetailItem({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="text-sm text-foreground">{value ?? "—"}</p>
    </div>
  );
}

function DocumentRow({ label, path }: { label: string; path: string | null }) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const url = await getSignedDocumentUrl(path);
      if (!cancelled) {
        setSignedUrl(url);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [path]);

  if (!path) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="flex-1 text-xs text-muted-foreground">{label}</span>
        <span className="text-[10px] text-muted-foreground/60">Not provided</span>
      </div>
    );
  }

  if (loading || !signedUrl) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-amber-500/15 bg-amber-500/[0.04] p-3">
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-amber-300" />
        <span className="flex-1 text-xs font-semibold text-foreground">{label}</span>
        <span className="text-[10px] text-muted-foreground/60">Generating link…</span>
      </div>
    );
  }

  const isImage = path.match(/\.(jpg|jpeg|png|gif|webp)$/i);
  return (
    <a
      href={signedUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-xl border border-amber-500/15 bg-amber-500/[0.04] p-3 transition hover:bg-amber-500/[0.08]"
    >
      {isImage ? (
        <img src={signedUrl} alt={label} className="h-10 w-10 shrink-0 rounded-lg object-cover" />
      ) : (
        <FileText className="h-4 w-4 shrink-0 text-amber-300" />
      )}
      <span className="flex-1 text-xs font-semibold text-foreground">{label}</span>
      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-amber-300" />
    </a>
  );
}

/** Renders an <img> from a private storage path via signed URL. */
function PrivateImage({
  path,
  alt,
  className,
  fallback,
}: {
  path: string;
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
}) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const signed = await getSignedDocumentUrl(path);
      if (!cancelled) setUrl(signed);
    })();
    return () => { cancelled = true; };
  }, [path]);
  if (!url) return <>{fallback ?? null}</>;
  return <img src={url} alt={alt} className={className} />;
}

/** Renders a signed-URL photo link from a private storage path. */
function SignedPhotoLink({ path, name }: { path: string; name: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const signed = await getSignedDocumentUrl(path);
      if (!cancelled) setUrl(signed);
    })();
    return () => { cancelled = true; };
  }, [path]);
  if (!url) {
    return (
      <div className="flex h-20 w-full items-center justify-center overflow-hidden rounded-lg border border-white/[0.06] bg-white/[0.02]">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="overflow-hidden rounded-lg border border-white/[0.06]"
    >
      <img src={url} alt={name} className="h-20 w-full object-cover" />
    </a>
  );
}

function ActionButton({
  icon: Icon,
  label,
  color,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  color: "emerald" | "destructive" | "purple";
  onClick: () => void;
}) {
  const colors: Record<string, string> = {
    emerald: "border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-300 hover:bg-emerald-500/[0.12]",
    destructive: "border-destructive/20 bg-destructive/[0.06] text-destructive hover:bg-destructive/[0.12]",
    purple: "border-purple-500/20 bg-purple-500/[0.06] text-purple-300 hover:bg-purple-500/[0.12]",
  };
  return (
    <button
      onClick={onClick}
      className={cn("flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition", colors[color])}
    >
      <Icon className="h-5 w-5" />
      <span className="text-xs font-bold">{label}</span>
    </button>
  );
}
