import { useMutation, useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  ArrowLeft, MapPin, Calendar, Clock, Users, Check, X,
  Building2, ShieldCheck, Plane, Hotel, Utensils, Bus,
  FileCheck, UserCheck, Shield, ImageIcon, Play, ArrowRight,
  MessageCircle, ExternalLink, Loader2, Phone, Send, Instagram,
} from "lucide-react";

import { useSEO } from "@/hooks/use-seo";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  fetchPublicTourPost, incrementTourPostViews,
  formatPrice, calculateDiscount, calculateDuration,
  getAvailabilityLabel, parseStringArray, parseItinerary,
  type TourPost,
} from "@/lib/tour-posts";
import { requestAgencyContact } from "@/lib/consulting-messages";
import { cn } from "@/lib/utils";

const springIn = {
  type: "spring" as const,
  stiffness: 260,
  damping: 26,
};

export default function TourPostDetail() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeImage, setActiveImage] = useState(0);

  useSEO({
    title: "Tour Package | OXEN",
    description: "Discover tour packages from travel agencies on OXEN.",
  });

  const { data: post, isLoading, error } = useQuery({
    queryKey: ["tour-post", postId],
    queryFn: () => fetchPublicTourPost(postId!),
    enabled: !!postId,
    staleTime: 60_000,
    retry: 1,
  });

  const interestMutation = useMutation({
    mutationFn: async () => {
      if (!post?.company) throw new Error("Agency not found");
      return requestAgencyContact({
        companyId: post.company.id,
        companyName: post.company.name,
        companyLogoUrl: post.company.logo_url,
        userId: user!.id,
        fullName: user!.name ?? "OXEN user",
        email: user!.email ?? null,
        serviceId: post.service_id,
        message: `Salom! Men "${post.title}" tur paketi haqida qiziqib qoldim.`,
      });
    },
    onSuccess: () => navigate("/my-agencies"),
    onError: () => toast({ title: "Failed to contact agency", variant: "destructive" }),
  });

  const handleInterested = () => {
    if (!user || user.isGuest) {
      navigate(`/auth?redirect=${encodeURIComponent(`/tour/${postId}`)}`);
      return;
    }
    interestMutation.mutate();
  };

  // Increment views once on load
  useEffect(() => {
    if (postId) incrementTourPostViews(postId);
  }, [postId]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <p className="font-display text-lg font-bold text-foreground">Package not found</p>
        <p className="text-sm text-muted-foreground">This tour package may have been removed or is no longer published.</p>
        <button onClick={() => navigate("/")} className="gold-gradient rounded-full px-6 py-3 text-sm font-bold text-primary-foreground">
          Back to Home
        </button>
      </div>
    );
  }

  const gallery = parseStringArray(post.gallery);
  const includedItems = parseStringArray(post.included_items);
  const notIncludedItems = parseStringArray(post.not_included_items);
  const itinerary = parseItinerary(post.itinerary);
  const duration = calculateDuration(post.departure_date, post.return_date);
  const discount = calculateDiscount(post.price ?? 0, post.old_price);
  const availability = getAvailabilityLabel(post.available_seats ?? null);
  const company = post.company;
  const isVerified = company?.verification_status === "verified";

  const allImages = [post.cover_image, ...gallery].filter(Boolean) as string[];

  // Contact links from agency profile (single source of truth)
  const whatsapp = post.contact_override && typeof post.contact_override === "object"
    ? (post.contact_override as Record<string, string>).whatsapp ?? company?.whatsapp
    : company?.whatsapp;
  const telegram = post.contact_override && typeof post.contact_override === "object"
    ? (post.contact_override as Record<string, string>).telegram ?? company?.telegram
    : company?.telegram;
  const phone = company?.contact_phone;
  const website = company?.website;
  // Instagram from social_links JSON — normalize @username / bare username to full URL
  const rawInstagram = company?.social_links?.instagram;
  const instagramHref = (() => {
    if (!rawInstagram?.trim()) return null;
    const v = rawInstagram.trim();
    if (/^https?:\/\//i.test(v)) return v;
    if (v.startsWith("@")) return `https://instagram.com/${v.slice(1)}`;
    return `https://instagram.com/${v}`;
  })();

  const inclusionToggles: { key: keyof TourPost; label: string; icon: typeof Plane }[] = [
    { key: "flight_included", label: "Flight", icon: Plane },
    { key: "hotel_included", label: "Hotel", icon: Hotel },
    { key: "meals_included", label: "Meals", icon: Utensils },
    { key: "airport_transfer_included", label: "Transfer", icon: Bus },
    { key: "visa_included", label: "Visa", icon: FileCheck },
    { key: "guide_included", label: "Guide", icon: UserCheck },
    { key: "travel_insurance_included", label: "Insurance", icon: Shield },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="fixed left-5 top-5 z-50 flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06] backdrop-blur-xl border border-white/10 text-foreground transition hover:bg-white/12"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>

      {/* Hero gallery */}
      <div className="relative h-[50vh] min-h-[320px] w-full overflow-hidden bg-white/[0.04]">
        {allImages.length > 0 ? (
          <img src={allImages[activeImage]} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground/20">
            <ImageIcon className="h-16 w-16" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />

        {/* Thumbnail strip */}
        {allImages.length > 1 && (
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
            {allImages.map((img, i) => (
              <button
                key={i}
                onClick={() => setActiveImage(i)}
                className={cn(
                  "h-12 w-16 overflow-hidden rounded-lg border-2 transition",
                  i === activeImage ? "border-primary" : "border-transparent opacity-60 hover:opacity-100",
                )}
              >
                <img src={img} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-5">
        {/* Title section */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springIn}
          className="-mt-16 relative z-10"
        >
          {post.destination_country && (
            <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-primary">
              <MapPin className="h-4 w-4" />
              {[post.destination_city, post.destination_country].filter(Boolean).join(", ")}
            </p>
          )}
          <h1 className="font-display text-2xl font-extrabold text-balance text-foreground sm:text-3xl">
            {post.title}
          </h1>
          {post.short_description && (
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">{post.short_description}</p>
          )}

          {/* Quick facts */}
          <div className="mt-4 flex flex-wrap gap-3">
            {duration && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-foreground">
                <Clock className="h-3.5 w-3.5 text-primary" /> {duration}
              </span>
            )}
            {post.departure_date && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-foreground">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                Departs {new Date(post.departure_date).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            )}
            {post.available_seats !== null && (
              <span className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold",
                availability === "sold_out" ? "bg-red-500/15 text-red-400" :
                availability === "limited" ? "bg-amber-500/15 text-amber-400" :
                "bg-emerald-500/15 text-emerald-400",
              )}>
                <Users className="h-3.5 w-3.5" />
                {post.available_seats === 0 ? "Sold out" : `${post.available_seats} seats left`}
              </span>
            )}
          </div>
        </motion.div>

        {/* Price + CTA card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springIn, delay: 0.1 }}
          className="glass-card mt-5 rounded-2xl p-5"
        >
          <div className="flex items-end justify-between gap-4">
            <div>
              {post.old_price && post.old_price > (post.price ?? 0) && (
                <span className="mr-2 text-sm text-muted-foreground line-through">{formatPrice(post.old_price, post.currency)}</span>
              )}
              <span className="font-display text-3xl font-extrabold text-foreground">{post.price ? formatPrice(post.price, post.currency) : "—"}</span>
              {discount && (
                <span className="ml-2 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                  Save {discount}%
                </span>
              )}
              {post.booking_deadline && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Book by {new Date(post.booking_deadline).toLocaleDateString("en", { month: "short", day: "numeric" })}
                </p>
              )}
            </div>
            <button
              onClick={handleInterested}
              disabled={interestMutation.isPending}
              className="gold-gradient flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-primary-foreground transition active:scale-95 disabled:opacity-60"
            >
              {interestMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              I'm Interested <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </motion.div>

        {/* About */}
        {post.full_description && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springIn, delay: 0.15 }}
            className="mt-6"
          >
            <h2 className="mb-3 font-display text-lg font-bold text-foreground">About This Tour</h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{post.full_description}</p>
          </motion.section>
        )}

        {/* Video */}
        {post.video_url && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springIn, delay: 0.2 }}
            className="mt-6"
          >
            <h2 className="mb-3 font-display text-lg font-bold text-foreground">Video</h2>
            <div className="glass-card flex items-center justify-center rounded-2xl p-8">
              <a href={post.video_url} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 text-primary transition hover:opacity-80">
                <Play className="h-12 w-12" />
                <span className="text-sm font-semibold">Watch tour video</span>
              </a>
            </div>
          </motion.section>
        )}

        {/* What's Included toggles */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springIn, delay: 0.25 }}
          className="mt-6"
        >
          <h2 className="mb-3 font-display text-lg font-bold text-foreground">Package Inclusions</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {inclusionToggles.map(({ key, label, icon: Icon }) => {
              const isIncluded = post[key] as boolean;
              return (
                <div
                  key={key}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold",
                    isIncluded
                      ? "border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-400"
                      : "border-white/[0.06] bg-white/[0.02] text-muted-foreground/50",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                  {isIncluded ? <Check className="ml-auto h-3.5 w-3.5" /> : <X className="ml-auto h-3.5 w-3.5" />}
                </div>
              );
            })}
          </div>
        </motion.section>

        {/* Included / Not Included lists */}
        {(includedItems.length > 0 || notIncludedItems.length > 0) && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springIn, delay: 0.3 }}
            className="mt-6 grid gap-4 sm:grid-cols-2"
          >
            {includedItems.length > 0 && (
              <div className="glass-card rounded-2xl p-5">
                <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-bold text-emerald-400">
                  <Check className="h-4 w-4" /> Included in Price
                </h3>
                <ul className="space-y-1.5">
                  {includedItems.map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-foreground">
                      <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" /> {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {notIncludedItems.length > 0 && (
              <div className="glass-card rounded-2xl p-5">
                <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-bold text-destructive">
                  <X className="h-4 w-4" /> Not Included
                </h3>
                <ul className="space-y-1.5">
                  {notIncludedItems.map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <X className="h-3.5 w-3.5 shrink-0 text-destructive" /> {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.section>
        )}

        {/* Package details */}
        {(post.hotel_name || post.room_type || post.meal_plan || post.transport || post.airline || post.departure_airport) && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springIn, delay: 0.35 }}
            className="mt-6"
          >
            <h2 className="mb-3 font-display text-lg font-bold text-foreground">Package Details</h2>
            <div className="glass-card grid gap-3 rounded-2xl p-5 sm:grid-cols-2">
              {[
                ["Hotel", post.hotel_name],
                ["Hotel Rating", post.hotel_rating ? `${post.hotel_rating} ★` : null],
                ["Room Type", post.room_type],
                ["Meal Plan", post.meal_plan],
                ["Transport", post.transport],
                ["Airline", post.airline],
                ["Departure", post.departure_airport],
              ].filter(([, v]) => v).map(([label, value]) => (
                <div key={label as string} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-semibold text-foreground">{value}</span>
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Itinerary */}
        {itinerary.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springIn, delay: 0.4 }}
            className="mt-6"
          >
            <h2 className="mb-3 font-display text-lg font-bold text-foreground">Daily Itinerary</h2>
            <div className="space-y-2">
              {itinerary.map((day, i) => (
                <div key={i} className="glass-card rounded-2xl p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-xs font-bold text-primary">
                      D{day.day}
                    </span>
                    <h3 className="font-display text-sm font-bold text-foreground">{day.title || `Day ${day.day}`}</h3>
                  </div>
                  {day.description && (
                    <p className="mt-2 pl-11 text-sm text-muted-foreground">{day.description}</p>
                  )}
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Travel Agency section */}
        {company && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springIn, delay: 0.45 }}
            className="mt-8"
          >
            <h2 className="mb-3 font-display text-lg font-bold text-foreground">Travel Agency</h2>
            <div className="glass-card rounded-2xl p-5">
              <div className="flex items-start gap-4">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-primary/15">
                  {company.logo_url ? (
                    <img src={company.logo_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-primary">
                      <Building2 className="h-6 w-6" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-display text-base font-bold text-foreground">{company.name}</h3>
                    {isVerified && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                        <ShieldCheck className="h-2.5 w-2.5" /> Verified
                      </span>
                    )}
                  </div>
                  {(company.city || company.country) && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {[company.city, company.country].filter(Boolean).join(", ")}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => navigate(`/agency/${company.id}`)}
                      className="flex items-center gap-1.5 rounded-xl bg-primary/15 px-4 py-2 text-xs font-bold text-primary transition hover:bg-primary/25"
                    >
                      View Agency <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                    {phone && (
                      <a href={`tel:${phone}`} className="flex items-center gap-1.5 rounded-xl bg-white/[0.06] px-4 py-2 text-xs font-bold text-foreground transition hover:bg-white/12">
                        <Phone className="h-3.5 w-3.5" /> Call
                      </a>
                    )}
                    {whatsapp && (
                      <a href={`https://wa.me/${whatsapp.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-xl bg-emerald-500/15 px-4 py-2 text-xs font-bold text-emerald-400 transition hover:bg-emerald-500/25">
                        <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                      </a>
                    )}
                    {telegram && (
                      <a href={telegram.startsWith("http") ? telegram : `https://t.me/${telegram.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-xl bg-sky-500/15 px-4 py-2 text-xs font-bold text-sky-400 transition hover:bg-sky-500/25">
                        <Send className="h-3.5 w-3.5" /> Telegram
                      </a>
                    )}
                    {instagramHref && (
                      <a href={instagramHref} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-xl bg-fuchsia-500/15 px-4 py-2 text-xs font-bold text-fuchsia-400 transition hover:bg-fuchsia-500/25">
                        <Instagram className="h-3.5 w-3.5" /> Instagram
                      </a>
                    )}
                    {website && (
                      <a href={website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-xl bg-white/[0.06] px-4 py-2 text-xs font-bold text-foreground transition hover:bg-white/12">
                        <ExternalLink className="h-3.5 w-3.5" /> Website
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.section>
        )}
      </div>
    </div>
  );
}
