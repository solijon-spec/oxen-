import { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Star,
  BadgeCheck,
  Clock,
  Truck,
  Image as ImageIcon,
  Video as VideoIcon,
  FileText,
  CheckCircle2,
  AlertCircle,
  GitBranch,
  HelpCircle,
  MessageSquare,
  LayoutGrid,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import {
  fetchServiceById,
  fetchRelatedServices,
  fetchServiceReviews,
  fetchServiceDocuments,
  parseRichBlocks,
  parseStringArray,
  parseVideos,
  parseProcessSteps,
  parseFAQItems,
  type ServiceReview,
} from "@/lib/services";
import { OptimizedImage } from "@/components/OptimizedImage";
import { RichTextRenderer } from "@/components/services/RichTextRenderer";
import { GalleryGrid } from "@/components/services/GalleryGrid";
import { VideoGrid } from "@/components/services/VideoEmbed";
import { FAQAccordion } from "@/components/services/FAQAccordion";
import { ProcessTimeline, Checklist } from "@/components/services/ProcessTimeline";
import { DocumentList } from "@/components/services/DocumentList";
import { ReviewSection } from "@/components/services/ReviewSection";
import { ServiceSidebar } from "@/components/services/ServiceSidebar";
import { ServiceCard } from "@/components/services/ServiceCard";
import { useSEO } from "@/hooks/use-seo";
import { toast } from "@/hooks/use-toast";

const springIn = {
  type: "spring" as const,
  stiffness: 300,
  damping: 28,
  mass: 0.9,
};

function SectionTitle({
  icon: Icon,
  children,
}: {
  icon: typeof Star;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15">
        <Icon className="h-5 w-5 text-primary" />
      </span>
      <h2 className="font-display text-xl font-bold text-foreground">{children}</h2>
    </div>
  );
}

function Section({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      className={`px-5 pt-7 ${className}`}
    >
      {children}
    </motion.section>
  );
}

/**
 * ServiceDetails — full details page for a single service.
 * All content loaded dynamically from the database via service ID.
 * 12 sections + sticky sidebar + SEO.
 */
export default function ServiceDetails() {
  const { serviceId = "" } = useParams();
  const navigate = useNavigate();
  const [reviewPage, setReviewPage] = useState(1);
  const [allReviews, setAllReviews] = useState<ServiceReview[]>([]);

  const {
    data: service,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["service", serviceId],
    queryFn: () => fetchServiceById(serviceId),
    enabled: !!serviceId,
  });

  const { data: relatedServices = [] } = useQuery({
    queryKey: ["related-services", serviceId],
    queryFn: () =>
      fetchRelatedServices(
        serviceId,
        service?.consulting_id ?? "",
        service?.category ?? "General",
      ),
    enabled: !!service,
  });

  const { data: reviewData } = useQuery({
    queryKey: ["service-reviews", serviceId, reviewPage],
    queryFn: () => fetchServiceReviews(serviceId, reviewPage, 5),
    enabled: !!serviceId,
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["service-documents", serviceId],
    queryFn: () => fetchServiceDocuments(serviceId),
    enabled: !!serviceId,
  });

  // SEO from database
  useSEO({
    title: service?.seo_title ?? service?.title ?? "Service | OXEN",
    description: service?.seo_description ?? service?.description ?? "",
    keywords: service?.seo_keywords ?? "",
    image: service?.cover_image ?? undefined,
  });

  const handleContactConsulting = useCallback(() => {
    const email = service?.consulting_companies?.contact_email;
    if (email) {
      window.location.href = `mailto:${email}`;
    } else {
      toast({ title: "Contact information not available", variant: "destructive" });
    }
  }, [service]);

  const handleReviewAdded = useCallback((review: ServiceReview) => {
    setAllReviews((prev) => [review, ...prev]);
  }, []);

  // Combine loaded reviews with newly added ones
  const displayReviews = allReviews.length > 0 ? allReviews : reviewData?.reviews ?? [];
  const totalReviews = reviewData?.total ?? 0;

  if (isLoading) {
    return (
      <div className="px-5 pt-6">
        <div className="glass h-[400px] animate-pulse rounded-3xl" />
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass h-32 animate-pulse rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="text-5xl">🔍</div>
        <p className="text-muted-foreground">We couldn't find that service.</p>
        <button
          onClick={() => navigate("/services")}
          className="gold-gradient rounded-full px-5 py-2.5 text-sm font-bold text-primary-foreground"
        >
          Browse services
        </button>
      </div>
    );
  }

  const longBlocks = parseRichBlocks(service.long_description);
  const galleryImages = parseStringArray(service.gallery);
  const videos = parseVideos(service.videos);
  const benefits = parseStringArray(service.benefits);
  const requirements = parseStringArray(service.requirements);
  const processSteps = parseProcessSteps(service.process);
  const faqItems = parseFAQItems(service.faq);
  const additionalBlocks = parseRichBlocks(service.additional_content);

  return (
    <div className="relative pb-32 lg:pb-10">
      {/* ── 1. Hero Section ──────────────────────────────────── */}
      <section className="relative overflow-hidden px-5 pb-6 pt-6">
        <button
          onClick={() => navigate("/services")}
          className="relative z-10 flex items-center gap-1 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Services
        </button>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 mt-4"
        >
          {/* Cover image */}
          {service.cover_image && (
            <div className="travel-card relative h-[240px] overflow-hidden rounded-3xl sm:h-[320px]">
              <OptimizedImage
                src={service.cover_image}
                alt={service.title}
                placeholderType="post"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

              {/* Company info overlay */}
              {service.consulting_companies && (
                <div className="absolute bottom-4 left-4 flex items-center gap-2.5">
                  {service.consulting_companies.logo_url && (
                    <OptimizedImage
                      src={service.consulting_companies.logo_url}
                      alt={service.consulting_companies.name}
                      placeholderType="avatar"
                      className="h-10 w-10 rounded-xl border border-white/20 object-cover shadow-lg"
                    />
                  )}
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-bold text-white">
                        {service.consulting_companies.name}
                      </p>
                      {service.consulting_companies.is_verified && (
                        <BadgeCheck className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Category badge */}
              <span className="absolute right-4 top-4 rounded-full bg-black/40 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur-md">
                {service.category}
              </span>
            </div>
          )}

          {/* Title + meta */}
          <div className="mt-5">
            <h1 className="font-display text-2xl font-extrabold sm:text-3xl">
              {service.title}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {service.description}
            </p>

            {/* Meta row */}
            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              {service.rating > 0 && (
                <span className="flex items-center gap-1.5">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={
                          s <= Math.round(service.rating)
                            ? "h-3.5 w-3.5 fill-primary text-primary"
                            : "h-3.5 w-3.5 text-muted-foreground/30"
                        }
                      />
                    ))}
                  </div>
                  <span className="font-bold text-foreground">
                    {Number(service.rating).toFixed(1)}
                  </span>
                  ({service.review_count})
                </span>
              )}
              {service.duration && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> {service.duration}
                </span>
              )}
              {service.delivery_time && (
                <span className="flex items-center gap-1">
                  <Truck className="h-3.5 w-3.5" /> {service.delivery_time}
                </span>
              )}
              <span className="font-display text-base font-extrabold text-primary">
                ${Number(service.price).toLocaleString()} {service.currency}
              </span>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Main content + sidebar layout */}
      <div className="lg:flex lg:gap-8 lg:px-5">
        <div className="lg:flex-1 lg:min-w-0">
          {/* ── 2. About This Service ────────────────────────── */}
          {longBlocks.length > 0 && (
            <Section>
              <SectionTitle icon={FileText}>About This Service</SectionTitle>
              <div className="glass rounded-2xl p-5">
                <RichTextRenderer blocks={longBlocks} />
              </div>
            </Section>
          )}

          {/* ── 3. What You Will Get ─────────────────────────── */}
          {benefits.length > 0 && (
            <Section>
              <SectionTitle icon={CheckCircle2}>What You Will Get</SectionTitle>
              <Checklist items={benefits} icon="check" />
            </Section>
          )}

          {/* ── 4. Gallery ───────────────────────────────────── */}
          {galleryImages.length > 0 && (
            <Section>
              <SectionTitle icon={ImageIcon}>Gallery</SectionTitle>
              <GalleryGrid images={galleryImages} />
            </Section>
          )}

          {/* ── 5. Videos ────────────────────────────────────── */}
          {videos.length > 0 && (
            <Section>
              <SectionTitle icon={VideoIcon}>Videos</SectionTitle>
              <VideoGrid videos={videos} />
            </Section>
          )}

          {/* ── 6. Additional Information ────────────────────── */}
          {additionalBlocks.length > 0 && (
            <Section>
              <SectionTitle icon={LayoutGrid}>Additional Information</SectionTitle>
              <div className="glass rounded-2xl p-5">
                <RichTextRenderer blocks={additionalBlocks} />
              </div>
            </Section>
          )}

          {/* ── 7. Documents ─────────────────────────────────── */}
          {documents.length > 0 && (
            <Section>
              <SectionTitle icon={FileText}>Documents</SectionTitle>
              <DocumentList documents={documents} />
            </Section>
          )}

          {/* ── 8. Requirements ──────────────────────────────── */}
          {requirements.length > 0 && (
            <Section>
              <SectionTitle icon={AlertCircle}>Requirements</SectionTitle>
              <Checklist items={requirements} icon="require" />
            </Section>
          )}

          {/* ── 9. Process Timeline ──────────────────────────── */}
          {processSteps.length > 0 && (
            <Section>
              <SectionTitle icon={GitBranch}>Process Timeline</SectionTitle>
              <ProcessTimeline steps={processSteps} />
            </Section>
          )}

          {/* ── 10. FAQ ──────────────────────────────────────── */}
          {faqItems.length > 0 && (
            <Section>
              <SectionTitle icon={HelpCircle}>FAQ</SectionTitle>
              <FAQAccordion items={faqItems} />
            </Section>
          )}

          {/* ── 11. Reviews ──────────────────────────────────── */}
          <Section>
            <SectionTitle icon={MessageSquare}>Reviews</SectionTitle>
            <ReviewSection
              serviceId={service.id}
              reviews={displayReviews}
              total={totalReviews}
              averageRating={Number(service.rating)}
              onReviewAdded={handleReviewAdded}
            />
            {reviewData && reviewData.total > reviewPage * 5 && (
              <div className="mt-4 flex justify-center">
                <button
                  onClick={() => setReviewPage((p) => p + 1)}
                  className="glass rounded-full px-5 py-2.5 text-sm font-semibold text-primary transition hover:border-primary/40"
                >
                  Load more reviews
                </button>
              </div>
            )}
          </Section>

          {/* ── 12. Related Services ──────────────────────────── */}
          {relatedServices.length > 0 && (
            <Section>
              <SectionTitle icon={LayoutGrid}>Related Services</SectionTitle>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {relatedServices.slice(0, 6).map((rel, i) => (
                  <ServiceCard key={rel.id} service={rel} index={i} />
                ))}
              </div>
            </Section>
          )}
        </div>

        {/* ── Sidebar ─────────────────────────────────────────── */}
        <aside className="hidden lg:block lg:w-[340px] lg:shrink-0 lg:pt-7">
          <ServiceSidebar service={service} onContactConsulting={handleContactConsulting} />
        </aside>
      </div>

      {/* Mobile sidebar (bottom sticky bar) */}
      <div className="lg:hidden">
        <ServiceSidebar service={service} onContactConsulting={handleContactConsulting} />
      </div>
    </div>
  );
}
