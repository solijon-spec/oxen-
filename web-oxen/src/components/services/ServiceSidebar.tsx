import { memo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Share2, MessageCircle, Star, BadgeCheck, Clock, DollarSign } from "lucide-react";

import type { ServiceWithConsulting } from "@/lib/services";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

/**
 * ServiceSidebar — sticky sidebar with price, CTAs, and company info.
 * On mobile, becomes a bottom sticky bar.
 */
function ServiceSidebarBase({
  service,
  onContactConsulting,
}: {
  service: ServiceWithConsulting;
  onContactConsulting: () => void;
}) {
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);
  const consulting = service.consulting_companies;

  const handleSave = () => {
    if (!user || user.isGuest) {
      toast({ title: "Please sign in to save services", variant: "destructive" });
      return;
    }
    setSaved((s) => !s);
    toast({ title: saved ? "Removed from saved" : "Saved!", variant: "default" });
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: service.title, url });
      } catch {
        // User cancelled
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        toast({ title: "Link copied!", variant: "default" });
      } catch {
        toast({ title: "Could not copy link", variant: "destructive" });
      }
    }
  };

  const handlePurchase = () => {
    if (!user || user.isGuest) {
      toast({ title: "Please sign in to purchase", variant: "destructive" });
      return;
    }
    toast({ title: "Purchase initiated — we'll be in touch!", variant: "default" });
  };

  // Mobile bottom sticky bar
  const MobileBar = () => (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-glass-border bg-glass-strong-bg backdrop-blur-2xl lg:hidden">
      <div className="flex items-center gap-3 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <div className="flex-1">
          <div className="font-display text-lg font-extrabold text-primary">
            ${Number(service.price).toLocaleString()}
          </div>
          <div className="text-[10px] text-muted-foreground">{service.currency}</div>
        </div>
        <button
          onClick={handleSave}
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-xl border transition active:scale-95",
            saved
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-glass-border bg-glass-bg text-muted-foreground",
          )}
          aria-label="Save"
        >
          <Heart className={cn("h-5 w-5", saved && "fill-current")} />
        </button>
        <button
          onClick={handleShare}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-glass-border bg-glass-bg text-muted-foreground transition active:scale-95"
          aria-label="Share"
        >
          <Share2 className="h-5 w-5" />
        </button>
        <button
          onClick={handlePurchase}
          className="gold-gradient flex h-11 flex-1 items-center justify-center rounded-xl px-4 text-sm font-bold text-primary-foreground transition active:scale-95"
        >
          Purchase
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sticky sidebar */}
      <div className="hidden lg:block">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 26 }}
          className="sticky top-6 space-y-4"
        >
          {/* Price + CTA card */}
          <div className="glass rounded-3xl p-5">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-3xl font-extrabold text-primary">
                ${Number(service.price).toLocaleString()}
              </span>
              <span className="text-sm text-muted-foreground">{service.currency}</span>
            </div>

            <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
              {service.duration && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> {service.duration}
                </span>
              )}
              {service.delivery_time && (
                <span className="flex items-center gap-1">
                  <DollarSign className="h-3.5 w-3.5" /> {service.delivery_time}
                </span>
              )}
            </div>

            {service.rating > 0 && (
              <div className="mt-3 flex items-center gap-2">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={cn(
                        "h-4 w-4",
                        s <= Math.round(service.rating)
                          ? "fill-primary text-primary"
                          : "text-muted-foreground/30",
                      )}
                    />
                  ))}
                </div>
                <span className="text-sm font-bold text-foreground">
                  {Number(service.rating).toFixed(1)}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({service.review_count} reviews)
                </span>
              </div>
            )}

            <div className="mt-5 space-y-2.5">
              <button
                onClick={handlePurchase}
                className="gold-gradient flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-primary-foreground transition active:scale-95"
              >
                Purchase Service
              </button>
              <button
                onClick={onContactConsulting}
                className="glass flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-foreground transition hover:border-primary/40 active:scale-95"
              >
                <MessageCircle className="h-4 w-4" /> Contact Consulting
              </button>
              <div className="flex gap-2.5">
                <button
                  onClick={handleSave}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold transition active:scale-95",
                    saved
                      ? "border border-primary/40 bg-primary/10 text-primary"
                      : "glass text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Heart className={cn("h-4 w-4", saved && "fill-current")} />
                  {saved ? "Saved" : "Save"}
                </button>
                <button
                  onClick={handleShare}
                  className="glass flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold text-muted-foreground transition hover:text-foreground active:scale-95"
                >
                  <Share2 className="h-4 w-4" /> Share
                </button>
              </div>
            </div>
          </div>

          {/* Consulting company card */}
          {consulting && (
            <div className="glass rounded-3xl p-5">
              <div className="flex items-center gap-3">
                {consulting.logo_url ? (
                  <img
                    src={consulting.logo_url}
                    alt={consulting.name}
                    className="h-12 w-12 rounded-xl object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 font-bold text-primary">
                    {consulting.name.charAt(0)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-sm font-bold text-foreground">
                      {consulting.name}
                    </p>
                    {consulting.is_verified && (
                      <BadgeCheck className="h-4 w-4 shrink-0 text-primary" />
                    )}
                  </div>
                  {consulting.website && (
                    <a
                      href={consulting.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline"
                    >
                      Visit website
                    </a>
                  )}
                </div>
              </div>
              {consulting.description && (
                <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                  {consulting.description}
                </p>
              )}
              {consulting.contact_email && (
                <p className="mt-3 text-xs text-muted-foreground">
                  {consulting.contact_email}
                </p>
              )}
            </div>
          )}
        </motion.div>
      </div>

      {/* Mobile bottom bar */}
      <MobileBar />
    </>
  );
}

export const ServiceSidebar = memo(ServiceSidebarBase);
