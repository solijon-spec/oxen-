import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2, MapPin, Phone, Mail, Globe, Clock, Languages, Plane,
  Award, CheckCircle2, ArrowLeft, Share2, Loader2,
  Package as PackageIcon, MessageCircle, Send, Instagram, Facebook,
  Youtube, MapPinned, Star, ImageIcon, ShieldCheck, Calendar,
  ExternalLink, ArrowRight,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import { fetchPublicConsultingCompany, type ConsultingCompany } from "@/lib/consulting";
import {
  fetchPublishedTourPostsByCompany,
  formatPrice, calculateDiscount, calculateDuration,
  type TourPost,
} from "@/lib/tour-posts";
import { fetchPublishedVacanciesByCompany, EMPLOYMENT_TYPE_LABELS, type Vacancy } from "@/lib/vacancies";
import { Briefcase } from "lucide-react";
import { useSEO } from "@/hooks/use-seo";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const springIn = {
  type: "spring" as const,
  stiffness: 260,
  damping: 26,
};

export default function PublicCompanyProfile() {
  const { companyId = "" } = useParams<{ companyId: string }>();
  const navigate = useNavigate();

  const { data: company, isLoading } = useQuery({
    queryKey: ["public-consulting-company", companyId],
    queryFn: () => fetchPublicConsultingCompany(companyId),
    enabled: !!companyId,
    retry: false,
    staleTime: 60_000,
  });

  const { data: tourPosts } = useQuery({
    queryKey: ["agency-tour-posts", companyId],
    queryFn: () => fetchPublishedTourPostsByCompany(companyId),
    enabled: !!companyId,
    staleTime: 60_000,
  });

  const { data: vacancies } = useQuery({
    queryKey: ["agency-vacancies", companyId],
    queryFn: () => fetchPublishedVacanciesByCompany(companyId),
    enabled: !!companyId,
    staleTime: 60_000,
  });

  useSEO({
    title: company ? `${company.name} | OXEN Agency` : "Agency | OXEN",
    description: company?.short_description ?? company?.description ?? "Tour agency profile on OXEN.",
    image: company?.logo_url ?? undefined,
  });

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      void navigator.share({ title: company?.name ?? "OXEN Agency", url }).catch(() => void 0);
    } else {
      void navigator.clipboard.writeText(url);
      toast({ title: "Link copied", description: "Agency link copied to clipboard." });
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-5 text-center">
        <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.06] text-muted-foreground">
          <Building2 className="h-7 w-7" />
        </span>
        <h1 className="font-display text-xl font-extrabold">Agency not available</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This agency profile doesn't exist or has been deactivated.
        </p>
        <button
          onClick={() => navigate("/")}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-white/[0.1]"
        >
          <ArrowLeft className="h-4 w-4" /> Back to OXEN
        </button>
      </div>
    );
  }

  const socialLinks = company.social_links ?? {};
  const photos = company.agency_photos ?? [];
  const branches = company.branches ?? [];
  const posts = tourPosts ?? [];
  const openVacancies = vacancies ?? [];
  const isVerified = company.verification_status === "verified";

  // Normalize Instagram: handles full URL, @username, or bare username
  const normalizeInstagram = (value: string | null | undefined): string | null => {
    if (!value?.trim()) return null;
    const v = value.trim();
    if (/^https?:\/\//i.test(v)) return v;
    if (v.startsWith("@")) return `https://instagram.com/${v.slice(1)}`;
    return `https://instagram.com/${v}`;
  };

  // Contact buttons — only show if data exists
  const contactButtons: { icon: typeof Phone; label: string; href: string; color: string }[] = [];
  if (company.contact_phone) contactButtons.push({ icon: Phone, label: "Call", href: `tel:${company.contact_phone}`, color: "bg-emerald-500/15 text-emerald-400" });
  if (company.additional_phone) contactButtons.push({ icon: Phone, label: "Alt Phone", href: `tel:${company.additional_phone}`, color: "bg-emerald-500/15 text-emerald-400" });
  if (company.whatsapp) contactButtons.push({ icon: MessageCircle, label: "WhatsApp", href: `https://wa.me/${company.whatsapp.replace(/\D/g, "")}`, color: "bg-green-500/15 text-green-400" });
  if (company.telegram) contactButtons.push({ icon: Send, label: "Telegram", href: company.telegram.startsWith("@") ? `https://t.me/${company.telegram.slice(1)}` : company.telegram, color: "bg-sky-500/15 text-sky-400" });
  const igHref = normalizeInstagram(socialLinks.instagram);
  if (igHref) contactButtons.push({ icon: Instagram, label: "Instagram", href: igHref, color: "bg-fuchsia-500/15 text-fuchsia-400" });
  if (socialLinks.facebook) contactButtons.push({ icon: Facebook, label: "Facebook", href: socialLinks.facebook, color: "bg-blue-500/15 text-blue-400" });
  if (socialLinks.youtube) contactButtons.push({ icon: Youtube, label: "YouTube", href: socialLinks.youtube, color: "bg-red-500/15 text-red-400" });
  if (company.website) contactButtons.push({ icon: Globe, label: "Website", href: company.website, color: "bg-indigo-500/15 text-indigo-400" });
  if (company.map_link) contactButtons.push({ icon: MapPin, label: "Map", href: company.map_link, color: "bg-amber-500/15 text-amber-400" });

  return (
    <div className="mx-auto max-w-4xl px-4 pb-20 pt-4 sm:px-6">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* Agency Header */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springIn}
        className="glass overflow-hidden rounded-3xl"
      >
        {/* Cover */}
        <div className="relative h-40 w-full bg-gradient-to-br from-primary/25 via-primary/5 to-transparent sm:h-56">
          {company.cover_image_url ? (
            <img src={company.cover_image_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground/30">
              <Building2 className="h-12 w-12" />
            </div>
          )}
        </div>

        {/* Logo + name + badges */}
        <div className="relative px-5 pb-5">
          <div className="-mt-10 flex flex-wrap items-end justify-between gap-3">
            <div className="flex items-end gap-4">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-4 border-card bg-card">
                {company.logo_url ? (
                  <img src={company.logo_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-primary/15 text-primary">
                    <Building2 className="h-8 w-8" />
                  </div>
                )}
              </div>
              <div className="mb-1">
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-xl font-extrabold text-foreground sm:text-2xl">{company.name}</h1>
                  {isVerified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
                      <ShieldCheck className="h-3 w-3" /> Verified
                    </span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {(company.city || company.country) && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {[company.city, company.country].filter(Boolean).join(", ")}
                    </span>
                  )}
                  {company.founded_year && (
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" /> Est. {company.founded_year}
                    </span>
                  )}
                  {posts.length > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                      <PackageIcon className="h-3 w-3" /> {posts.length} {posts.length === 1 ? "package" : "packages"}
                    </span>
                  )}
                </div>
                {company.short_description && (
                  <p className="mt-1.5 text-sm text-muted-foreground">{company.short_description}</p>
                )}
              </div>
            </div>
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-4 py-2 text-xs font-semibold text-foreground transition hover:bg-white/[0.1]"
            >
              <Share2 className="h-3.5 w-3.5" /> Share
            </button>
          </div>

          {/* Contact action buttons */}
          {contactButtons.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {contactButtons.map((btn) => {
                const Icon = btn.icon;
                return (
                  <a
                    key={btn.label}
                    href={btn.href}
                    target="_blank"
                    rel="noreferrer"
                    className={cn("inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition active:scale-95", btn.color)}
                  >
                    <Icon className="h-3.5 w-3.5" /> {btn.label}
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>

      {/* About Agency */}
      {(company.description || company.specialties?.length || company.working_hours || company.supported_languages?.length || company.destination_countries?.length) && (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springIn, delay: 0.05 }}
          className="glass mt-5 rounded-3xl p-5 sm:p-6"
        >
          <h2 className="mb-4 font-display text-base font-bold text-foreground">About Agency</h2>
          {company.description && <p className="mb-4 text-sm leading-relaxed text-muted-foreground">{company.description}</p>}
          <dl className="grid gap-3 sm:grid-cols-2">
            {company.founded_year && (
              <InfoRow icon={Calendar} label="Founded" value={String(company.founded_year)} />
            )}
            {company.working_hours && (
              <InfoRow icon={Clock} label="Working hours" value={company.working_hours} />
            )}
            {company.supported_languages?.length ? (
              <InfoRow icon={Languages} label="Languages" value={company.supported_languages.join(", ")} />
            ) : null}
            {company.destination_countries?.length ? (
              <InfoRow icon={Plane} label="Destinations" value={company.destination_countries.join(", ")} />
            ) : null}
          </dl>
          {company.specialties?.length ? (
            <div className="mt-4">
              <span className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Specialties</span>
              <div className="flex flex-wrap gap-2">
                {company.specialties.map((s) => (
                  <span key={s} className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">{s}</span>
                ))}
              </div>
            </div>
          ) : null}
        </motion.section>
      )}

      {/* Agency Photos */}
      {photos.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springIn, delay: 0.1 }}
          className="mt-5"
        >
          <h2 className="mb-3 font-display text-base font-bold text-foreground">Agency Photos</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {photos.map((url, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04, ...springIn }}
                className="aspect-square overflow-hidden rounded-2xl bg-white/[0.03]"
              >
                <img src={url} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
              </motion.div>
            ))}
          </div>
        </motion.section>
      )}

      {/* Branches */}
      {branches.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springIn, delay: 0.15 }}
          className="mt-5"
        >
          <h2 className="mb-3 font-display text-base font-bold text-foreground">Branches</h2>
          <div className="space-y-3">
            {branches.map((branch, i) => (
              <div key={i} className="glass rounded-2xl p-4">
                <h3 className="font-display text-sm font-bold text-foreground">{branch.name || `Branch ${i + 1}`}</h3>
                {branch.address && (
                  <p className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {branch.address}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-3">
                  {branch.phone && (
                    <a href={`tel:${branch.phone}`} className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                      <Phone className="h-3.5 w-3.5" /> {branch.phone}
                    </a>
                  )}
                  {branch.working_hours && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" /> {branch.working_hours}
                    </span>
                  )}
                  {branch.map_link && (
                    <a href={branch.map_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                      <MapPin className="h-3.5 w-3.5" /> View on map
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.section>
      )}

      {/* Tour Packages */}
      {posts.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springIn, delay: 0.2 }}
          className="mt-5"
        >
          <h2 className="mb-3 font-display text-base font-bold text-foreground">Tour Packages</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {posts.map((post, i) => (
              <TourPackageCard key={post.id} post={post} index={i} />
            ))}
          </div>
        </motion.section>
      )}

      {/* Open Positions */}
      {openVacancies.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springIn, delay: 0.22 }}
          className="mt-5"
        >
          <h2 className="mb-3 font-display text-base font-bold text-foreground">Open Positions</h2>
          <div className="space-y-2.5">
            {openVacancies.map((v) => (
              <button
                key={v.id}
                onClick={() => navigate(`/vacancy/${v.id}`)}
                className="glass flex w-full items-center justify-between gap-3 rounded-2xl p-4 text-left transition hover:border-white/[0.12]"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-foreground">{v.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {EMPLOYMENT_TYPE_LABELS[v.employment_type]}
                    {(v.location_city || v.location_country) && ` · ${[v.location_city, v.location_country].filter(Boolean).join(", ")}`}
                  </p>
                </div>
                <Briefcase className="h-4 w-4 shrink-0 text-primary" />
              </button>
            ))}
          </div>
        </motion.section>
      )}

      {/* Contact Information */}
      {(company.contact_phone || company.additional_phone || company.whatsapp || company.telegram || company.contact_email || company.website || company.address) && (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springIn, delay: 0.25 }}
          className="glass mt-5 rounded-3xl p-5 sm:p-6"
        >
          <h2 className="mb-4 font-display text-base font-bold text-foreground">Contact Information</h2>
          <dl className="grid gap-3 sm:grid-cols-2">
            {company.contact_phone && (
              <ContactRow icon={Phone} label="Main phone" value={company.contact_phone} href={`tel:${company.contact_phone}`} />
            )}
            {company.additional_phone && (
              <ContactRow icon={Phone} label="Additional phone" value={company.additional_phone} href={`tel:${company.additional_phone}`} />
            )}
            {company.whatsapp && (
              <ContactRow icon={MessageCircle} label="WhatsApp" value={company.whatsapp} href={`https://wa.me/${company.whatsapp.replace(/\D/g, "")}`} />
            )}
            {company.telegram && (
              <ContactRow icon={Send} label="Telegram" value={company.telegram} href={company.telegram.startsWith("@") ? `https://t.me/${company.telegram.slice(1)}` : company.telegram} />
            )}
            {company.contact_email && (
              <ContactRow icon={Mail} label="Email" value={company.contact_email} href={`mailto:${company.contact_email}`} />
            )}
            {company.website && (
              <ContactRow icon={Globe} label="Website" value={company.website} href={company.website} />
            )}
            {socialLinks.instagram && (
              <ContactRow icon={Instagram} label="Instagram" value={socialLinks.instagram} href={normalizeInstagram(socialLinks.instagram) ?? undefined} />
            )}
            {socialLinks.facebook && (
              <ContactRow icon={Facebook} label="Facebook" value={socialLinks.facebook} href={socialLinks.facebook} />
            )}
            {socialLinks.youtube && (
              <ContactRow icon={Youtube} label="YouTube" value={socialLinks.youtube} href={socialLinks.youtube} />
            )}
            {(company.address || company.city || company.country) && (
              <ContactRow icon={MapPin} label="Address" value={[company.address, company.city, company.country].filter(Boolean).join(", ")} />
            )}
          </dl>
        </motion.section>
      )}
    </div>
  );
}

/* ── Tour Package Card ─────────────────────────────────────── */
function TourPackageCard({ post, index }: { post: TourPost; index: number }) {
  const navigate = useNavigate();
  const discount = post.price && post.old_price ? calculateDiscount(post.price, post.old_price) : null;
  const duration = calculateDuration(post.departure_date, post.return_date);

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, ...springIn }}
      whileTap={{ scale: 0.98 }}
      onClick={() => navigate(`/tour/${post.id}`)}
      className="glass group cursor-pointer overflow-hidden rounded-2xl"
    >
      <div className="relative h-36 w-full overflow-hidden bg-white/[0.03]">
        {post.cover_image ? (
          <img src={post.cover_image} alt={post.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground/30">
            <ImageIcon className="h-8 w-8" />
          </div>
        )}
        {discount && (
          <span className="absolute right-2 top-2 rounded-full bg-emerald-500/90 px-2 py-0.5 text-[10px] font-bold text-white">
            -{discount}%
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-display text-sm font-bold text-foreground line-clamp-1">{post.title}</h3>
        {(post.destination_country || post.destination_city) && (
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {[post.destination_city, post.destination_country].filter(Boolean).join(", ")}
          </p>
        )}
        {post.short_description && (
          <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">{post.short_description}</p>
        )}
        <div className="mt-3 flex items-center justify-between">
          <div>
            {post.price ? (
              <div className="flex items-center gap-1.5">
                {post.old_price && (
                  <span className="text-xs text-muted-foreground line-through">{formatPrice(post.old_price, post.currency)}</span>
                )}
                <span className="font-display text-sm font-extrabold text-foreground">{formatPrice(post.price, post.currency)}</span>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">Contact for price</span>
            )}
            {duration && (
              <span className="block text-[11px] text-muted-foreground">{duration}</span>
            )}
          </div>
          <span className="flex items-center gap-1 text-xs font-bold text-primary">
            View <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </motion.article>
  );
}

/* ── Small helper components ───────────────────────────────── */
function InfoRow({ icon: Icon, label, value }: { icon: typeof Globe; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/[0.03] p-3">
      <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </dt>
      <dd className="mt-1 break-words text-sm text-foreground">{value}</dd>
    </div>
  );
}

function ContactRow({ icon: Icon, label, value, href }: { icon: typeof Globe; label: string; value: string; href?: string }) {
  return (
    <div className="rounded-2xl bg-white/[0.03] p-3">
      <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </dt>
      <dd className="mt-1 break-words text-sm text-foreground">
        {href ? (
          <a href={href} target="_blank" rel="noreferrer" className="text-primary underline">{value}</a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}
