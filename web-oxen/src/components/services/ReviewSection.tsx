import { memo, useState } from "react";
import { motion } from "framer-motion";
import { Star } from "lucide-react";

import { addReview, recalcServiceRating, type ServiceReview } from "@/lib/services";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

/**
 * StarRating — interactive star selector.
 */
function StarSelector({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => onChange(star)}
          className="transition active:scale-90"
          aria-label={`${star} stars`}
        >
          <Star
            className={`h-6 w-6 ${
              star <= value ? "fill-primary text-primary" : "text-muted-foreground/40"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

/**
 * RatingDistribution — bar chart showing rating distribution.
 */
function RatingDistribution({ reviews }: { reviews: ServiceReview[] }) {
  const dist = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));
  const total = reviews.length || 1;

  return (
    <div className="space-y-2">
      {dist.map(({ star, count }) => (
        <div key={star} className="flex items-center gap-2">
          <span className="flex w-8 items-center gap-0.5 text-xs text-muted-foreground">
            {star} <Star className="h-3 w-3 fill-primary text-primary" />
          </span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(count / total) * 100}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="h-full bg-primary"
            />
          </div>
          <span className="w-6 text-right text-xs text-muted-foreground">{count}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * ReviewSection — full review display with distribution, list, and add form.
 */
function ReviewSectionBase({
  serviceId,
  reviews,
  total,
  averageRating,
  onReviewAdded,
}: {
  serviceId: string;
  reviews: ServiceReview[];
  total: number;
  averageRating: number;
  onReviewAdded: (review: ServiceReview) => void;
}) {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user) {
      toast({ title: "Please sign in to leave a review", variant: "destructive" });
      return;
    }
    if (!comment.trim()) {
      toast({ title: "Please write a comment", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const review = await addReview(
        serviceId,
        user.id,
        user.name,
        user.avatarUrl,
        rating,
        comment.trim(),
      );
      if (review) {
        onReviewAdded(review);
        await recalcServiceRating(serviceId);
        toast({ title: "Review posted!", variant: "default" });
        setComment("");
        setRating(5);
        setShowForm(false);
      }
    } catch {
      toast({ title: "Failed to post review", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="glass rounded-2xl p-5">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="text-center sm:w-40">
            <div className="font-display text-4xl font-extrabold text-foreground">
              {averageRating.toFixed(1)}
            </div>
            <div className="mt-1 flex justify-center gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`h-4 w-4 ${
                    s <= Math.round(averageRating)
                      ? "fill-primary text-primary"
                      : "text-muted-foreground/30"
                  }`}
                />
              ))}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{total} reviews</p>
          </div>
          <div className="flex-1">
            <RatingDistribution reviews={reviews} />
          </div>
        </div>
      </div>

      {/* Add review button */}
      {user && !user.isGuest && (
        <div>
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="glass w-full rounded-2xl p-4 text-center text-sm font-semibold text-primary transition hover:border-primary/40"
            >
              Write a Review
            </button>
          ) : (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="glass rounded-2xl p-4 space-y-3"
            >
              <StarSelector value={rating} onChange={setRating} />
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your experience..."
                rows={3}
                className="w-full resize-none rounded-xl border border-input bg-background/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="gold-gradient flex-1 rounded-xl py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
                >
                  {submitting ? "Posting..." : "Post Review"}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="glass rounded-xl px-4 py-2.5 text-sm font-semibold text-muted-foreground"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Review list */}
      <div className="space-y-3">
        {reviews.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No reviews yet. Be the first to share your experience!
          </p>
        ) : (
          reviews.map((review, i) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass rounded-2xl p-4"
            >
              <div className="flex items-center gap-3">
                {review.user_avatar ? (
                  <img
                    src={review.user_avatar}
                    alt={review.user_name}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 font-bold text-primary">
                    {review.user_name.charAt(0)}
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">
                    {review.user_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(review.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`h-3.5 w-3.5 ${
                        s <= review.rating
                          ? "fill-primary text-primary"
                          : "text-muted-foreground/30"
                      }`}
                    />
                  ))}
                </div>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {review.comment}
              </p>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

export const ReviewSection = memo(ReviewSectionBase);
