import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Star, Reply, Flag, Loader2, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

import { DashboardShell } from "@/components/consulting/DashboardShell";
import { EmptyState } from "@/components/consulting/EmptyState";
import { useConsulting } from "@/contexts/ConsultingContext";
import { useSEO } from "@/hooks/use-seo";
import {
  fetchAgencyReviews,
  replyToReview,
  reportReview,
  computeReviewStats,
  type ConsultingReview,
} from "@/lib/crm-extras";
import { cn } from "@/lib/utils";

function StarRow({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) {
  const s = size === "sm" ? "h-3 w-3" : "h-4 w-4";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(s, n <= rating ? "fill-amber-400 text-amber-400" : "text-white/20")}
        />
      ))}
    </div>
  );
}

function ReviewCard({ review, onReply, onReport }: {
  review: ConsultingReview;
  onReply: (id: string, reply: string) => void;
  onReport: (id: string) => void;
}) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState(review.reply ?? "");
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return iso;
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl p-4"
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15">
          {review.user?.avatar_url ? (
            <img src={review.user.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs font-bold text-primary">
              {(review.user?.name ?? "?").charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-bold text-foreground">{review.user?.name ?? "Anonymous"}</p>
            {review.is_verified && (
              <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-emerald-400">
                Verified
              </span>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            <StarRow rating={review.rating} />
            <span className="text-[11px] text-muted-foreground">{formatDate(review.created_at)}</span>
          </div>
        </div>
      </div>

      {/* Related tour/package */}
      {(review.post || review.service) && (
        <div className="mt-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2">
          <p className="text-[11px] font-semibold text-muted-foreground">
            {review.post ? "Tour Package" : "Service"}
          </p>
          <p className="truncate text-xs font-semibold text-foreground">
            {review.post?.title ?? review.service?.title ?? "—"}
          </p>
          {review.post?.destination_country && (
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              {[review.post.destination_city, review.post.destination_country].filter(Boolean).join(", ")}
            </p>
          )}
        </div>
      )}

      {/* Review text */}
      {review.comment && (
        <p className="mt-3 text-sm text-foreground/90">{review.comment}</p>
      )}

      {/* Existing reply */}
      {review.reply && (
        <div className="mt-3 rounded-xl border border-primary/15 bg-primary/5 px-3 py-2.5">
          <p className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary">
            <Reply className="h-3 w-3" /> Agency Reply
          </p>
          <p className="text-xs text-foreground/80">{review.reply}</p>
          {review.reply_at && (
            <p className="mt-1 text-[10px] text-muted-foreground">{formatDate(review.reply_at)}</p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={() => setReplyOpen((s) => !s)}
          className="flex items-center gap-1.5 rounded-lg bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-white/[0.08]"
        >
          <Reply className="h-3.5 w-3.5" />
          {review.reply ? "Edit Reply" : "Reply"}
        </button>
        {!review.is_reported && (
          <button
            onClick={() => setReportOpen((s) => !s)}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:bg-white/[0.04] hover:text-destructive"
          >
            <Flag className="h-3.5 w-3.5" />
            Report
          </button>
        )}
        {review.is_reported && (
          <span className="flex items-center gap-1 rounded-lg bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive/80">
            <Flag className="h-3.5 w-3.5" /> Reported
          </span>
        )}
      </div>

      {/* Reply form */}
      <AnimatePresence>
        {replyOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write your reply…"
                rows={3}
                className="w-full resize-none rounded-xl border border-input bg-background/50 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
              <div className="mt-2 flex justify-end gap-2">
                <button
                  onClick={() => setReplyOpen(false)}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!replyText.trim()) return;
                    onReply(review.id, replyText.trim());
                    setReplyOpen(false);
                  }}
                  className="gold-gradient rounded-lg px-4 py-1.5 text-xs font-bold text-primary-foreground transition active:scale-95"
                >
                  Save Reply
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Report form */}
      <AnimatePresence>
        {reportOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3">
              <textarea
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="Reason for reporting…"
                rows={2}
                className="w-full resize-none rounded-xl border border-input bg-background/50 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
              <div className="mt-2 flex justify-end gap-2">
                <button
                  onClick={() => setReportOpen(false)}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onReport(review.id);
                    setReportOpen(false);
                  }}
                  className="rounded-lg bg-destructive/15 px-4 py-1.5 text-xs font-bold text-destructive transition hover:bg-destructive/25 active:scale-95"
                >
                  Report Review
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function Reviews() {
  useSEO({ title: "Reviews | OXEN CRM", description: "View and respond to client reviews of your agency." });
  const { company } = useConsulting();
  const queryClient = useQueryClient();
  const companyId = company?.id ?? "";

  const { data: reviews, isLoading } = useQuery({
    queryKey: ["consulting-reviews", companyId],
    queryFn: () => fetchAgencyReviews(companyId),
    enabled: !!companyId,
    staleTime: 30_000,
    retry: false,
  });

  const stats = useMemo(() => computeReviewStats(reviews ?? []), [reviews]);

  const replyMutation = useMutation({
    mutationFn: ({ id, reply }: { id: string; reply: string }) => replyToReview(id, reply),
    onSuccess: () => {
      toast.success("Reply saved successfully.");
      queryClient.invalidateQueries({ queryKey: ["consulting-reviews"] });
    },
    onError: () => toast.error("Failed to save reply."),
  });

  const reportMutation = useMutation({
    mutationFn: (id: string) => reportReview(id, "Inappropriate content"),
    onSuccess: () => {
      toast.success("Review reported to OXEN.");
      queryClient.invalidateQueries({ queryKey: ["consulting-reviews"] });
    },
    onError: () => toast.error("Failed to report review."),
  });

  const maxDist = Math.max(...stats.distribution.map((d) => d.count), 1);

  return (
    <DashboardShell title="Reviews" subtitle="Client feedback for your agency">
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : stats.total === 0 ? (
        <EmptyState
          icon={Star}
          title="No reviews yet"
          description="Reviews left by OXEN users for your agency will appear here."
        />
      ) : (
        <div className="space-y-6">
          {/* Stats overview */}
          <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
            {/* Average rating card */}
            <div className="glass rounded-2xl p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Overall Rating</p>
              <div className="mt-2 flex items-end gap-3">
                <span className="font-display text-4xl font-extrabold text-foreground">{stats.average.toFixed(1)}</span>
                <div className="mb-1.5">
                  <StarRow rating={Math.round(stats.average)} size="md" />
                </div>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Based on {stats.total} review{stats.total !== 1 ? "s" : ""}
              </p>
            </div>

            {/* Distribution chart */}
            <div className="glass rounded-2xl p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Rating Distribution
              </p>
              <div className="space-y-2">
                {stats.distribution.map((d) => (
                  <div key={d.rating} className="flex items-center gap-3">
                    <span className="flex w-12 items-center gap-1 text-xs font-semibold text-muted-foreground">
                      {d.rating} <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                    </span>
                    <div className="h-5 flex-1 overflow-hidden rounded-lg bg-white/[0.04]">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(d.count / maxDist) * 100}%` }}
                        transition={{ type: "spring", stiffness: 200, damping: 24 }}
                        className="h-full rounded-lg bg-gradient-to-r from-amber-500/60 to-amber-400/80"
                      />
                    </div>
                    <span className="w-8 text-right text-xs font-bold text-foreground">{d.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Reviews list */}
          <div className="space-y-3">
            {reviews?.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                onReply={(id, reply) => replyMutation.mutate({ id, reply })}
                onReport={(id) => reportMutation.mutate(id)}
              />
            ))}
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
