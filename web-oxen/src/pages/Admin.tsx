import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, AlertTriangle, CheckCircle2, Clock, Eye, X,
  TrendingUp, Users, Flag, Bot, ChevronRight, Ban,
  MessageSquareWarning, UserX, Sparkles,
} from "lucide-react";
import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import { useReports, type Report, type ReportStatus, type RiskLevel } from "@/contexts/ReportContext";
import { getUserById, DEMO_USERS } from "@/data/demoUsers";
import { OptimizedImage } from "@/components/OptimizedImage";
import { cn } from "@/lib/utils";

/* ── Status badge ── */

function StatusBadge({ status }: { status: ReportStatus }) {
  const labels: Record<ReportStatus, string> = {
    pending: "Pending",
    reviewing: "Reviewing",
    resolved: "Resolved",
  };
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
      `status-badge-${status}`,
    )}>
      {status === "pending" && <Clock className="h-3 w-3" />}
      {status === "reviewing" && <Eye className="h-3 w-3" />}
      {status === "resolved" && <CheckCircle2 className="h-3 w-3" />}
      {labels[status]}
    </span>
  );
}

function RiskBadge({ level }: { level: RiskLevel }) {
  const labels: Record<RiskLevel, string> = {
    low: "Low",
    medium: "Medium",
    high: "High",
    critical: "Critical",
  };
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
      `risk-badge-${level}`,
    )}>
      <AlertTriangle className="h-3 w-3" />
      {labels[level]}
    </span>
  );
}

/* ── Admin dashboard ── */

export default function Admin() {
  const navigate = useNavigate();
  const { reports, updateReportStatus, dismissReport } = useReports();
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [filterStatus, setFilterStatus] = useState<ReportStatus | "all">("all");

  const filteredReports = useMemo(
    () => filterStatus === "all" ? reports : reports.filter((r) => r.status === filterStatus),
    [reports, filterStatus],
  );

  const stats = useMemo(() => {
    const pending = reports.filter((r) => r.status === "pending").length;
    const reviewing = reports.filter((r) => r.status === "reviewing").length;
    const resolved = reports.filter((r) => r.status === "resolved").length;
    const critical = reports.filter((r) => r.aiRiskLevel === "critical").length;
    const spamDetected = reports.filter((r) => r.aiIsSpam).length;
    const duplicates = reports.filter((r) => r.aiIsDuplicate).length;
    return { total: reports.length, pending, reviewing, resolved, critical, spamDetected, duplicates };
  }, [reports]);

  const handleAction = useCallback((report: Report, action: "approve" | "reject" | "suspend" | "ban" | "warn" | "dismiss") => {
    switch (action) {
      case "approve":
        updateReportStatus(report.id, "reviewing");
        break;
      case "reject":
      case "dismiss":
        dismissReport(report.id);
        break;
      case "suspend":
      case "ban":
      case "warn":
        updateReportStatus(report.id, "resolved");
        break;
    }
    setSelectedReport(null);
  }, [updateReportStatus, dismissReport]);

  return (
    <div className="relative mx-auto max-w-4xl px-4 pt-2 pb-32">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 pt-2 pb-5"
      >
        <button
          onClick={() => navigate("/profile")}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-card/50 backdrop-blur-xl border border-white/10 text-muted-foreground transition hover:bg-card/70 hover:text-foreground active:scale-90"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/15 text-red-400">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-xl font-extrabold">Admin Dashboard</h1>
            <p className="text-xs text-muted-foreground">Reports & moderation</p>
          </div>
        </div>
      </motion.div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard icon={Flag} label="Total Reports" value={stats.total} color="text-blue-400" bg="bg-blue-500/10" delay={0.05} />
        <StatCard icon={Clock} label="Pending" value={stats.pending} color="text-amber-400" bg="bg-amber-500/10" delay={0.1} />
        <StatCard icon={AlertTriangle} label="Critical" value={stats.critical} color="text-red-400" bg="bg-red-500/10" delay={0.15} />
        <StatCard icon={Bot} label="AI Spam Caught" value={stats.spamDetected} color="text-purple-400" bg="bg-purple-500/10" delay={0.2} />
      </div>

      {/* AI Moderation summary */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="glass rounded-2xl border border-white/[0.06] p-4 mb-6"
      >
        <div className="flex items-center gap-2.5 mb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/15 text-purple-400">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold">AI Moderation Summary</h3>
            <p className="text-[10px] text-muted-foreground">Automatic analysis of all reports</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-xl bg-white/[0.04] py-3">
            <p className="font-display text-2xl font-extrabold text-purple-400">{stats.duplicates}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Duplicates Detected</p>
          </div>
          <div className="rounded-xl bg-white/[0.04] py-3">
            <p className="font-display text-2xl font-extrabold text-red-400">{stats.critical}</p>
            <p className="text-[10px] text-muted-foreground mt-1">High-Risk Flagged</p>
          </div>
          <div className="rounded-xl bg-white/[0.04] py-3">
            <p className="font-display text-2xl font-extrabold text-emerald-400">{stats.resolved}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Auto-Resolved</p>
          </div>
        </div>
      </motion.div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto no-scrollbar">
        {(["all", "pending", "reviewing", "resolved"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilterStatus(f)}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider transition",
              filterStatus === f
                ? "bg-primary text-primary-foreground"
                : "bg-white/[0.04] text-muted-foreground hover:bg-white/[0.08]",
            )}
          >
            {f === "all" ? "All" : f}
            {f !== "all" && (
              <span className="ml-1.5 opacity-70">
                {f === "pending" ? stats.pending : f === "reviewing" ? stats.reviewing : stats.resolved}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Reports list */}
      <div className="space-y-3">
        {filteredReports.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <CheckCircle2 className="mb-3 h-12 w-12 text-emerald-400/40" />
            <p className="text-sm font-semibold text-muted-foreground">No reports to display</p>
            <p className="mt-1 text-xs text-muted-foreground/60">The community is behaving well</p>
          </div>
        )}
        {filteredReports.map((report, i) => {
          const reporter = getUserById(report.reporterId);
          const reported = getUserById(report.reportedUserId);
          const reporterName = reporter?.name ?? report.reporterId;
          const reportedName = reported?.name ?? report.reportedUserId;

          return (
            <motion.button
              key={report.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, type: "spring" as const, stiffness: 280, damping: 26 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedReport(report)}
              className="glass flex w-full items-center gap-3 rounded-2xl p-4 text-left transition-all hover:border-white/[0.12]"
            >
              {/* Avatars */}
              <div className="relative shrink-0">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-500/15 text-red-400">
                  <Flag className="h-5 w-5" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-bold truncate">{reportedName}</p>
                  <RiskBadge level={report.aiRiskLevel} />
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  by {reporterName} · {report.aiCategory}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <StatusBadge status={report.status} />
                  {report.aiIsSpam && (
                    <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-[9px] font-bold uppercase text-purple-400">AI: Spam</span>
                  )}
                  {report.aiIsDuplicate && (
                    <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[9px] font-bold uppercase text-blue-400">AI: Duplicate</span>
                  )}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
            </motion.button>
          );
        })}
      </div>

      {/* Report detail modal */}
      <AnimatePresence>
        {selectedReport && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedReport(null)}
              className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              transition={{ type: "spring" as const, stiffness: 300, damping: 28, mass: 0.8 }}
              className="fixed left-1/2 top-1/2 z-[61] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 max-h-[85vh] overflow-y-auto no-scrollbar"
            >
              <div className="glass-strong rounded-3xl border border-white/10 p-6 shadow-2xl">
                <ReportDetail
                  report={selectedReport}
                  onClose={() => setSelectedReport(null)}
                  onAction={(action) => handleAction(selectedReport, action)}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Stat card ── */

function StatCard({
  icon: Icon, label, value, color, bg, delay,
}: {
  icon: typeof Flag; label: string; value: number; color: string; bg: string; delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: "spring" as const, stiffness: 300, damping: 24 }}
      className="admin-stat-card rounded-2xl p-4"
    >
      <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl mb-2.5", bg, color)}>
        <Icon className="h-4.5 w-4.5" />
      </div>
      <p className="font-display text-2xl font-extrabold tabular-nums">{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mt-0.5">{label}</p>
    </motion.div>
  );
}

/* ── Report detail ── */

function ReportDetail({
  report, onClose, onAction,
}: {
  report: Report;
  onClose: () => void;
  onAction: (action: "approve" | "reject" | "suspend" | "ban" | "warn" | "dismiss") => void;
}) {
  const reporter = getUserById(report.reporterId);
  const reported = getUserById(report.reportedUserId);
  const reporterName = reporter?.name ?? "Unknown";
  const reportedName = reported?.name ?? "Unknown";

  const reasonLabels: Record<string, string> = {
    spam: "Spam",
    "fake-account": "Fake Account",
    harassment: "Harassment",
    "inappropriate-content": "Inappropriate Content",
    "copyright-violation": "Copyright Violation",
    violence: "Violence",
    "hate-speech": "Hate Speech",
    scam: "Scam",
    other: "Other",
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-500/15 text-red-400">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold">Report Details</h2>
            <p className="text-xs text-muted-foreground">{new Date(report.createdAt).toLocaleString()}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] text-muted-foreground transition hover:bg-white/[0.12] active:scale-90"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* People involved */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Reported By</p>
          <div className="flex items-center gap-2">
            {reporter?.avatarUrl ? (
              <OptimizedImage src={reporter.avatarUrl} alt={reporterName} placeholderType="avatar" className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/15 text-xs font-bold text-blue-400">
                {reporterName.charAt(0)}
              </div>
            )}
            <span className="text-sm font-semibold truncate">{reporterName}</span>
          </div>
        </div>
        <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Reported User</p>
          <div className="flex items-center gap-2">
            {reported?.avatarUrl ? (
              <OptimizedImage src={reported.avatarUrl} alt={reportedName} placeholderType="avatar" className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/15 text-xs font-bold text-red-400">
                {reportedName.charAt(0)}
              </div>
            )}
            <span className="text-sm font-semibold truncate">{reportedName}</span>
          </div>
        </div>
      </div>

      {/* Report info */}
      <div className="space-y-3 mb-5">
        <InfoRow label="Reason" value={reasonLabels[report.reason] ?? report.reason} />
        <InfoRow label="Post ID" value={report.reportedPostId ?? "N/A (User report)"} />
        <InfoRow label="Status" value={<StatusBadge status={report.status} />} />
        {report.description && (
          <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Description</p>
            <p className="text-sm text-foreground/90">{report.description}</p>
          </div>
        )}
        <InfoRow label="Device" value={report.deviceInfo} />
      </div>

      {/* AI Moderation section */}
      <div className="rounded-2xl bg-purple-500/8 border border-purple-500/15 p-4 mb-5">
        <div className="flex items-center gap-2.5 mb-3">
          <Bot className="h-4 w-4 text-purple-400" />
          <h3 className="text-sm font-bold">AI Moderation Analysis</h3>
        </div>
        <div className="space-y-2.5">
          <AIRow label="Category" value={report.aiCategory} />
          <AIRow label="Risk Level" value={<RiskBadge level={report.aiRiskLevel} />} />
          <AIRow label="Duplicate" value={report.aiIsDuplicate ? "Yes — auto-detected" : "No"} />
          <AIRow label="Spam" value={report.aiIsSpam ? "Yes — auto-detected" : "No"} />
          <div className="rounded-xl bg-purple-500/10 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-purple-400 mb-1">Recommended Action</p>
            <p className="text-sm text-foreground/90">{report.aiRecommendedAction}</p>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-2.5">
        <ActionButton icon={Eye} label="Approve" color="bg-blue-500/15 text-blue-400 hover:bg-blue-500/25" onClick={() => onAction("approve")} />
        <ActionButton icon={X} label="Reject" color="bg-white/[0.06] text-muted-foreground hover:bg-white/[0.12]" onClick={() => onAction("reject")} />
        <ActionButton icon={MessageSquareWarning} label="Warn" color="bg-amber-500/15 text-amber-400 hover:bg-amber-500/25" onClick={() => onAction("warn")} />
        <ActionButton icon={UserX} label="Suspend" color="bg-orange-500/15 text-orange-400 hover:bg-orange-500/25" onClick={() => onAction("suspend")} />
        <ActionButton icon={Ban} label="Ban User" color="bg-red-500/15 text-red-400 hover:bg-red-500/25" onClick={() => onAction("ban")} />
        <ActionButton icon={CheckCircle2} label="Dismiss" color="bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25" onClick={() => onAction("dismiss")} />
      </div>
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.04] border border-white/[0.06] px-3.5 py-2.5">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right truncate max-w-[60%]">{value}</span>
    </div>
  );
}

function AIRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function ActionButton({
  icon: Icon, label, color, onClick,
}: {
  icon: typeof Eye; label: string; color: string; onClick: () => void;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(
        "flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all",
        color,
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </motion.button>
  );
}
