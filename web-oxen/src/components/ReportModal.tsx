import { motion, AnimatePresence } from "framer-motion";
import { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Flag, Send, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

import { useReports, REPORT_REASONS, type ReportReason } from "@/contexts/ReportContext";
import { CURRENT_USER_ID } from "@/data/demoUsers";
import { cn } from "@/lib/utils";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportedUserId: string;
  reportedUserName: string;
  reportedPostId?: string | null;
  reportedUserAvatar?: string;
}

export default function ReportModal({
  isOpen,
  onClose,
  reportedUserId,
  reportedUserName,
  reportedPostId = null,
  reportedUserAvatar,
}: ReportModalProps) {
  const { createReport } = useReports();
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedReason(null);
      setDescription("");
      setSubmitted(false);
      setSubmitting(false);
    }
  }, [isOpen]);

  const handleSubmit = useCallback(() => {
    if (!selectedReason) return;
    setSubmitting(true);

    setTimeout(() => {
      createReport({
        reporterId: CURRENT_USER_ID,
        reportedUserId,
        reportedPostId,
        reason: selectedReason,
        description: description.trim(),
      });
      setSubmitting(false);
      setSubmitted(true);
      setTimeout(() => onClose(), 1800);
    }, 1200);
  }, [selectedReason, description, createReport, reportedUserId, reportedPostId, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 40 }}
            transition={{ type: "spring" as const, stiffness: 300, damping: 28, mass: 0.8 }}
            className="fixed left-1/2 top-1/2 z-[61] w-[calc(100vw-24px)] max-w-md -translate-x-1/2 -translate-y-1/2"
          >
            <div className="glass-strong max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 p-5 shadow-2xl sm:p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-500/15 text-red-400">
                    <Flag className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-display text-lg font-bold">Report {reportedPostId ? "Post" : "User"}</h2>
                    <p className="text-xs text-muted-foreground">
                      {reportedPostId ? "Help us keep OXEN safe" : `Reporting @${reportedUserName}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] text-muted-foreground transition hover:bg-white/[0.12] active:scale-90"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* User preview */}
              {reportedUserAvatar && !reportedPostId && (
                <div className="mb-4 flex items-center gap-3 rounded-2xl bg-white/[0.04] border border-white/[0.06] p-3">
                  <img src={reportedUserAvatar} alt={reportedUserName} className="h-10 w-10 rounded-full object-cover" />
                  <div>
                    <p className="text-sm font-semibold">{reportedUserName}</p>
                    <p className="text-xs text-muted-foreground">Reported user</p>
                  </div>
                </div>
              )}

              {submitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center py-12 text-center"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring" as const, stiffness: 260, damping: 18 }}
                    className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400"
                  >
                    <CheckCircle2 className="h-8 w-8" />
                  </motion.div>
                  <h3 className="font-display text-lg font-bold">Report Submitted</h3>
                  <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
                    Our AI moderation system has analyzed your report and forwarded it to our team. Thank you for helping keep OXEN safe.
                  </p>
                </motion.div>
              ) : (
                <>
                  {/* Reason selection */}
                  <div className="mb-4">
                    <label className="mb-2.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Reason <span className="text-red-400">*</span>
                    </label>
                    <div className="grid grid-cols-1 gap-2 max-h-[240px] overflow-y-auto no-scrollbar">
                      {REPORT_REASONS.map((reason) => (
                        <button
                          key={reason.value}
                          onClick={() => setSelectedReason(reason.value)}
                          className={cn(
                            "report-reason-card flex items-center gap-3 rounded-xl px-4 py-3 text-left",
                            selectedReason === reason.value && "selected",
                          )}
                        >
                          <span className="text-lg">{reason.icon}</span>
                          <span className="flex-1 text-sm font-medium">{reason.label}</span>
                          {selectedReason === reason.value && (
                            <CheckCircle2 className="h-4 w-4 text-red-400" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Description */}
                  <div className="mb-5">
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Additional Details <span className="text-muted-foreground/60">(optional)</span>
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      placeholder="Provide more context about the issue..."
                      className="profile-input-field w-full resize-none rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                    />
                  </div>

                  {/* Info note */}
                  <div className="mb-5 flex items-start gap-2.5 rounded-xl bg-blue-500/8 border border-blue-500/15 px-3.5 py-3">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
                    <p className="text-xs text-muted-foreground">
                      Reports are analyzed by our AI moderation system for spam detection, duplicate filtering, and risk prioritization before reaching our review team.
                    </p>
                  </div>

                  {/* Submit */}
                  <div className="flex gap-3">
                    <button
                      onClick={onClose}
                      className="flex-1 rounded-xl border border-white/[0.08] py-3 text-sm font-semibold text-muted-foreground transition hover:bg-white/[0.04] active:scale-95"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={!selectedReason || submitting}
                      className={cn(
                        "flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition active:scale-95",
                        selectedReason && !submitting
                          ? "bg-red-500 text-white hover:bg-red-600"
                          : "bg-white/[0.06] text-muted-foreground cursor-not-allowed",
                      )}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          Submit Report
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
