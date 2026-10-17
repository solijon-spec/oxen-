import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Megaphone, Plus, Search, Copy, Trash2, Eye, EyeOff, Edit3,
  X, Loader2, Upload, ImageIcon, Calendar, MapPin, Clock,
  Archive, Check, ExternalLink, GripVertical, Trash, Save,
} from "lucide-react";

import { DashboardShell } from "@/components/consulting/DashboardShell";
import { EmptyState } from "@/components/consulting/EmptyState";
import { ConfirmDialog } from "@/components/consulting/ConfirmDialog";
import { Field, SelectField } from "@/components/consulting/Field";
import { StatusBadge } from "@/components/consulting/StatusBadge";
import { useConsulting } from "@/contexts/ConsultingContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSEO } from "@/hooks/use-seo";
import { toast } from "@/hooks/use-toast";
import { uploadConsultingAssetDetailed } from "@/lib/consulting";
import {
  fetchAgencyPosts, upsertTourPost, deleteTourPost,
  setPostStatus, duplicateTourPost,
  formatPrice, calculateDiscount, calculateDuration,
  parseStringArray, parseItinerary,
  type TourPost, type TourPostInput, type PostStatus, type TourItineraryDay,
} from "@/lib/tour-posts";
import { COUNTRIES } from "@/data/countries";
import { cn } from "@/lib/utils";

const SORTED_COUNTRIES = [...COUNTRIES].sort((a, b) => a.name.localeCompare(b.name));
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const CURRENCIES = ["USD", "EUR", "GBP", "AED", "RUB", "UZS", "JPY"] as const;
type Tab = "all" | "published" | "draft" | "archived";

const TAB_FILTERS: Record<Tab, PostStatus | null> = {
  all: null, published: "published", draft: "draft", archived: "archived",
};

/* ──────────────────────────────────────────────────────────────
   Posts page — CRM tour package management
   ────────────────────────────────────────────────────────────── */
export default function Posts() {
  const { company } = useConsulting();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [editingPost, setEditingPost] = useState<TourPost | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TourPost | null>(null);
  const [deleting, setDeleting] = useState(false);

  useSEO({ title: "Tour Posts | OXEN CRM", description: "Manage tour packages." });

  // Use effectiveCompany.id — this correctly resolves to the selected agency
  // in both normal mode (activeAgency.company) and owner mode (ownerAgency).
  // NEVER use activeAgencyId directly — in owner mode it points to the owner's
  // personal agency, not the agency they're managing.
  const companyId = company?.id ?? "";

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["consulting-posts", companyId],
    queryFn: () => fetchAgencyPosts(companyId),
    enabled: !!companyId,
    staleTime: 30_000,
  });

  const filtered = useMemo(() => {
    let list = posts;
    const statusFilter = TAB_FILTERS[tab];
    if (statusFilter) list = list.filter((p) => p.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.destination_country ?? "").toLowerCase().includes(q) ||
          (p.destination_city ?? "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [posts, tab, search]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["consulting-posts"] });

  const publishMutation = useMutation({
    mutationFn: (post: TourPost) => setPostStatus(post.id, "published", companyId),
    onSuccess: () => { toast({ title: "Package published" }); invalidate(); },
    onError: () => toast({ title: "Failed to publish", variant: "destructive" }),
  });

  const unpublishMutation = useMutation({
    mutationFn: (post: TourPost) => setPostStatus(post.id, "draft", companyId),
    onSuccess: () => { toast({ title: "Moved to draft" }); invalidate(); },
    onError: () => toast({ title: "Failed to unpublish", variant: "destructive" }),
  });

  const archiveMutation = useMutation({
    mutationFn: (post: TourPost) => setPostStatus(post.id, "archived", companyId),
    onSuccess: () => { toast({ title: "Package archived" }); invalidate(); },
    onError: () => toast({ title: "Failed to archive", variant: "destructive" }),
  });

  const duplicateMutation = useMutation({
    mutationFn: (post: TourPost) => duplicateTourPost(post, companyId, user?.id ?? ""),
    onSuccess: () => { toast({ title: "Package duplicated" }); invalidate(); },
    onError: () => toast({ title: "Failed to duplicate", variant: "destructive" }),
  });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const ok = await deleteTourPost(deleteTarget.id, companyId);
      if (ok) {
        toast({ title: "Package deleted" });
        invalidate();
      } else {
        toast({ title: "Failed to delete", variant: "destructive" });
      }
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "all", label: "All", count: posts.length },
    { key: "published", label: "Published", count: posts.filter((p) => p.status === "published").length },
    { key: "draft", label: "Draft", count: posts.filter((p) => p.status === "draft").length },
    { key: "archived", label: "Archived", count: posts.filter((p) => p.status === "archived").length },
  ];

  return (
    <DashboardShell
      title="Tour Posts"
      subtitle="Create and manage tour packages published to OXEN"
      actions={
        <button
          onClick={() => { setEditingPost(null); setShowEditor(true); }}
          className="gold-gradient flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-primary-foreground transition active:scale-95"
        >
          <Plus className="h-4 w-4" />
          Create Tour Package
        </button>
      }
    >
      {/* Search + Tabs */}
      <div className="mb-5 space-y-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tour packages..."
            className="w-full rounded-xl border border-input bg-background/50 py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition",
                tab === t.key
                  ? "bg-primary/15 text-primary"
                  : "bg-white/[0.04] text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
              <span className={cn("rounded-full px-1.5 py-0.5 text-[9px]", tab === t.key ? "bg-primary/20" : "bg-white/[0.06]")}>
                {t.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl bg-white/[0.04]" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filtered.length === 0 && (
        <EmptyState
          icon={Megaphone}
          title={posts.length === 0 ? "No tour packages yet" : "No packages match your filters"}
          description={posts.length === 0 ? "Create your first tour package to publish it on the OXEN marketplace." : "Try a different tab or search term."}
          action={posts.length === 0 ? { label: "Create Tour Package", onClick: () => { setEditingPost(null); setShowEditor(true); } } : undefined}
        />
      )}

      {/* Posts grid */}
      {!isLoading && filtered.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((post, i) => (
            <PostCard
              key={post.id}
              post={post}
              index={i}
              onPreview={() => navigate(`/tour/${post.id}`)}
              onEdit={() => { setEditingPost(post); setShowEditor(true); }}
              onDuplicate={() => duplicateMutation.mutate(post)}
              onArchive={() => archiveMutation.mutate(post)}
              onDelete={() => setDeleteTarget(post)}
              onPublish={() => publishMutation.mutate(post)}
              onUnpublish={() => unpublishMutation.mutate(post)}
            />
          ))}
        </div>
      )}

      {/* Editor modal */}
      <AnimatePresence>
        {showEditor && (
          <TourPostEditor
            initial={editingPost}
            companyId={companyId}
            createdBy={user?.id ?? ""}
            onClose={() => { setShowEditor(false); setEditingPost(null); }}
            onSaved={() => { setShowEditor(false); setEditingPost(null); invalidate(); }}
          />
        )}
      </AnimatePresence>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete tour package?"
        message={`"${deleteTarget?.title}" will be permanently deleted. This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </DashboardShell>
  );
}

/* ── Post Card ─────────────────────────────────────────────── */
function PostCard({
  post, index, onPreview, onEdit, onDuplicate, onArchive, onDelete, onPublish, onUnpublish,
}: {
  post: TourPost;
  index: number;
  onPreview: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const duration = calculateDuration(post.departure_date, post.return_date);
  const discount = calculateDiscount(post.price ?? 0, post.old_price);
  const isPublished = post.status === "published";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, type: "spring", stiffness: 260, damping: 24 }}
      className="glass-card group relative overflow-hidden rounded-2xl"
    >
      {/* Cover image */}
      <div className="relative h-40 overflow-hidden bg-white/[0.04]">
        {post.cover_image ? (
          <img src={post.cover_image} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground/20">
            <ImageIcon className="h-8 w-8" />
          </div>
        )}
        <div className="absolute left-2 top-2">
          <StatusBadge status={post.status} />
        </div>
        {discount && (
          <div className="absolute right-2 top-2 rounded-full bg-emerald-500/90 px-2 py-0.5 text-[10px] font-bold text-white">
            -{discount}%
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {post.destination_country && (
          <p className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-primary">
            <MapPin className="h-3 w-3" />
            {[post.destination_city, post.destination_country].filter(Boolean).join(", ")}
          </p>
        )}
        <h3 className="truncate font-display text-sm font-bold text-foreground">{post.title}</h3>

        <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
          {duration && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{duration}</span>}
          {post.departure_date && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(post.departure_date).toLocaleDateString("en", { month: "short", day: "numeric" })}</span>}
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div>
            {post.old_price && post.old_price > (post.price ?? 0) && (
              <span className="mr-1.5 text-[11px] text-muted-foreground line-through">{formatPrice(post.old_price, post.currency)}</span>
            )}
            <span className="font-display text-base font-bold text-foreground">{post.price ? formatPrice(post.price, post.currency) : "—"}</span>
          </div>
          {post.available_seats !== null && (
            <span className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold",
              post.available_seats === 0 ? "bg-red-500/15 text-red-400" :
              post.available_seats <= 5 ? "bg-amber-500/15 text-amber-400" :
              "bg-emerald-500/15 text-emerald-400",
            )}>
              {post.available_seats} seats
            </span>
          )}
        </div>

        {post.views > 0 && (
          <p className="mt-2 text-[10px] text-muted-foreground">{post.views} views</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex border-t border-white/[0.04]">
        <button onClick={onPreview} className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground">
          <ExternalLink className="h-3.5 w-3.5" /> Preview
        </button>
        <button onClick={onEdit} className="flex flex-1 items-center justify-center gap-1.5 border-l border-white/[0.04] py-2.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground">
          <Edit3 className="h-3.5 w-3.5" /> Edit
        </button>
        {/* More actions menu */}
        <div className="relative border-l border-white/[0.04]">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-full w-10 items-center justify-center text-muted-foreground transition hover:text-foreground"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><circle cx="3" cy="8" r="1.5"/><circle cx="8" cy="8" r="1.5"/><circle cx="13" cy="8" r="1.5"/></svg>
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-12 right-0 z-50 w-40 glass-strong rounded-xl border border-white/[0.06] py-1 shadow-2xl"
              >
                <button onClick={() => { setMenuOpen(false); onDuplicate(); }} className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:bg-white/[0.04] hover:text-foreground">
                  <Copy className="h-3.5 w-3.5" /> Duplicate
                </button>
                <button onClick={() => { setMenuOpen(false); onArchive(); }} className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:bg-white/[0.04] hover:text-foreground">
                  <Archive className="h-3.5 w-3.5" /> Archive
                </button>
                {isPublished ? (
                  <button onClick={() => { setMenuOpen(false); onUnpublish(); }} className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:bg-white/[0.04] hover:text-foreground">
                    <EyeOff className="h-3.5 w-3.5" /> Unpublish
                  </button>
                ) : (
                  <button onClick={() => { setMenuOpen(false); onPublish(); }} className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-emerald-400 transition hover:bg-emerald-500/10">
                    <Eye className="h-3.5 w-3.5" /> Publish
                  </button>
                )}
                <button onClick={() => { setMenuOpen(false); onDelete(); }} className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-destructive transition hover:bg-destructive/10">
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </motion.div>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ── Tour Post Editor (slide-over) ─────────────────────────── */
interface EditorFormState {
  title: string;
  destination_country: string;
  destination_city: string;
  cover_image: string;
  gallery: string[];
  video_url: string;
  short_description: string;
  full_description: string;
  price: string;
  old_price: string;
  currency: string;
  departure_date: string;
  return_date: string;
  booking_deadline: string;
  available_seats: string;
  hotel_name: string;
  hotel_rating: string;
  room_type: string;
  meal_plan: string;
  transport: string;
  airline: string;
  departure_airport: string;
  flight_included: boolean;
  hotel_included: boolean;
  visa_included: boolean;
  airport_transfer_included: boolean;
  guide_included: boolean;
  travel_insurance_included: boolean;
  meals_included: boolean;
  included_items: string[];
  not_included_items: string[];
  itinerary: TourItineraryDay[];
  price_type: "per_person" | "total";
  status: PostStatus;
}

function formFromPost(post: TourPost): EditorFormState {
  return {
    title: post.title ?? "",
    destination_country: post.destination_country ?? "",
    destination_city: post.destination_city ?? "",
    cover_image: post.cover_image ?? "",
    gallery: parseStringArray(post.gallery),
    video_url: post.video_url ?? "",
    short_description: post.short_description ?? "",
    full_description: post.full_description ?? "",
    price: post.price?.toString() ?? "",
    old_price: post.old_price?.toString() ?? "",
    currency: post.currency ?? "USD",
    departure_date: post.departure_date ?? "",
    return_date: post.return_date ?? "",
    booking_deadline: post.booking_deadline ?? "",
    available_seats: post.available_seats?.toString() ?? "",
    hotel_name: post.hotel_name ?? "",
    hotel_rating: post.hotel_rating?.toString() ?? "",
    room_type: post.room_type ?? "",
    meal_plan: post.meal_plan ?? "",
    transport: post.transport ?? "",
    airline: post.airline ?? "",
    departure_airport: post.departure_airport ?? "",
    flight_included: post.flight_included ?? false,
    hotel_included: post.hotel_included ?? false,
    visa_included: post.visa_included ?? false,
    airport_transfer_included: post.airport_transfer_included ?? false,
    guide_included: post.guide_included ?? false,
    travel_insurance_included: post.travel_insurance_included ?? false,
    meals_included: post.meals_included ?? false,
    included_items: parseStringArray(post.included_items),
    not_included_items: parseStringArray(post.not_included_items),
    itinerary: parseItinerary(post.itinerary),
    price_type: post.price_type ?? "per_person",
    status: post.status ?? "draft",
  };
}

const EMPTY_FORM: EditorFormState = {
  title: "", destination_country: "", destination_city: "",
  cover_image: "", gallery: [], video_url: "",
  short_description: "", full_description: "",
  price: "", old_price: "", currency: "USD",
  departure_date: "", return_date: "", booking_deadline: "",
  available_seats: "", hotel_name: "", hotel_rating: "",
  room_type: "", meal_plan: "", transport: "",
  airline: "", departure_airport: "",
  flight_included: false, hotel_included: false, visa_included: false,
  airport_transfer_included: false, guide_included: false,
  travel_insurance_included: false, meals_included: false,
  included_items: [], not_included_items: [], itinerary: [],
  price_type: "per_person",
  status: "draft",
};

function TourPostEditor({
  initial, companyId, createdBy, onClose, onSaved,
}: {
  initial: TourPost | null;
  companyId: string;
  createdBy: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const navigate = useNavigate();
  const [form, setForm] = useState<EditorFormState>(initial ? formFromPost(initial) : EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [savingMode, setSavingMode] = useState<PostStatus | null>(null);
  const [showDiscard, setShowDiscard] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const coverRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof EditorFormState>(key: K, value: EditorFormState[K]) => {
    setForm((p) => ({ ...p, [key]: value }));
  };

  const handleCoverUpload = async (file: File) => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast({ title: "Unsupported file format", description: "Please upload JPG, PNG, or WEBP images.", variant: "destructive" });
      return;
    }
    if (!companyId) {
      toast({ title: "Cannot upload image", description: "No agency selected. Please reload the page.", variant: "destructive" });
      return;
    }
    setUploadingCover(true);
    try {
      const extension =
        file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const safeFileName = `${Date.now()}-${crypto.randomUUID()}.${extension}`;
      const storagePath = `tour-packages/${companyId}/${safeFileName}`;
      const { url, error } = await uploadConsultingAssetDetailed(file, storagePath);
      if (url) {
        set("cover_image", url);
      } else {
        toast({
          title: "Image upload failed",
          description: error ?? "Please try again.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Cover upload exception:", err);
      toast({
        title: "Image upload failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploadingCover(false);
    }
  };

  const handleGalleryUpload = async (files: FileList) => {
    const validFiles = Array.from(files).filter((f) => ALLOWED_IMAGE_TYPES.includes(f.type));
    if (validFiles.length === 0) {
      toast({ title: "Unsupported file format", description: "Please upload JPG, PNG, or WEBP images.", variant: "destructive" });
      return;
    }
    if (!companyId) {
      toast({ title: "Cannot upload image", description: "No agency selected. Please reload the page.", variant: "destructive" });
      return;
    }
    setUploadingGallery(true);
    try {
      const urls: string[] = [];
      const errors: string[] = [];
      for (const file of validFiles) {
        const extension =
          file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
        const safeFileName = `${Date.now()}-${crypto.randomUUID()}.${extension}`;
        const storagePath = `tour-packages/${companyId}/${safeFileName}`;
        const { url, error } = await uploadConsultingAssetDetailed(file, storagePath);
        if (url) {
          urls.push(url);
        } else {
          errors.push(error ?? "Unknown error");
        }
      }
      if (urls.length > 0) {
        setForm((prev) => ({ ...prev, gallery: [...prev.gallery, ...urls] }));
        if (errors.length > 0) {
          toast({
            title: `${urls.length} image(s) uploaded, ${errors.length} failed`,
            description: errors[0],
            variant: "default",
          });
        }
      } else {
        toast({
          title: "Image upload failed",
          description: errors[0] ?? "Please try again.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Gallery upload exception:", err);
      toast({
        title: "Image upload failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploadingGallery(false);
    }
  };

  const hasFormData = (): boolean => {
    return !!(form.title || form.destination_country || form.destination_city ||
      form.cover_image || form.short_description || form.price ||
      form.departure_date || form.return_date || form.gallery.length > 0);
  };

  const validate = (forPublish: boolean): string | null => {
    if (!form.title.trim()) return "Tour title is required";
    if (forPublish) {
      if (!form.destination_country) return "Destination country is required";
      if (!form.cover_image) return "Cover image is required";
      if (!form.short_description.trim()) return "Short description is required";
      if (!form.price || parseFloat(form.price) <= 0) return "Valid price is required";
      if (!form.departure_date) return "Departure date is required";
      if (!form.return_date) return "Return date is required";
    }
    return null;
  };

  const buildInput = (status: PostStatus): TourPostInput => ({
    title: form.title.trim(),
    destination_country: form.destination_country,
    destination_city: form.destination_city || null,
    cover_image: form.cover_image,
    gallery: form.gallery,
    video_url: form.video_url || null,
    short_description: form.short_description.trim(),
    full_description: form.full_description || null,
    price: parseFloat(form.price) || 0,
    old_price: form.old_price ? parseFloat(form.old_price) : null,
    currency: form.currency,
    departure_date: form.departure_date,
    return_date: form.return_date,
    booking_deadline: form.booking_deadline || null,
    available_seats: form.available_seats ? parseInt(form.available_seats, 10) : null,
    hotel_name: form.hotel_name || null,
    hotel_rating: form.hotel_rating ? parseInt(form.hotel_rating, 10) : null,
    room_type: form.room_type || null,
    meal_plan: form.meal_plan || null,
    transport: form.transport || null,
    airline: form.airline || null,
    departure_airport: form.departure_airport || null,
    flight_included: form.flight_included,
    hotel_included: form.hotel_included,
    visa_included: form.visa_included,
    airport_transfer_included: form.airport_transfer_included,
    guide_included: form.guide_included,
    travel_insurance_included: form.travel_insurance_included,
    meals_included: form.meals_included,
    included_items: form.included_items,
    not_included_items: form.not_included_items,
    itinerary: form.itinerary,
    price_type: form.price_type,
    status,
  });

  const handleSave = async (status: PostStatus) => {
    const forPublish = status === "published";
    const err = validate(forPublish);
    if (err) { toast({ title: err, variant: "destructive" }); return; }
    if (saving) return;
    setSaving(true);
    setSavingMode(status);
    try {
      const { post, error } = await upsertTourPost(
        companyId, createdBy, buildInput(status), initial?.id,
      );
      if (error || !post) {
        console.error("upsertTourPost error:", error);
        toast({ title: "Failed to save", description: error ?? "Unknown error", variant: "destructive" });
      } else {
        toast({ title: status === "published" ? "Tour package published successfully." : "Draft saved successfully." });
        onSaved();
      }
    } catch (err) {
      console.error("handleSave error:", err);
      toast({ title: "Failed to save", description: "Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
      setSavingMode(null);
    }
  };

  const duration = calculateDuration(form.departure_date, form.return_date);
  const discount = form.price && form.old_price ? calculateDiscount(parseFloat(form.price), parseFloat(form.old_price)) : null;

  return createPortal(
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed right-0 top-0 z-[1010] flex h-screen w-full max-w-2xl flex-col bg-background"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] px-6 py-4">
          <h2 className="font-display text-lg font-bold">{initial ? "Edit Tour Package" : "Create Tour Package"}</h2>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] text-muted-foreground transition hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable form body */}
        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5 pb-32">
          {/* Cover image */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
              Cover Image <span className="text-primary">*</span>
            </label>
            <button
              onClick={() => coverRef.current?.click()}
              disabled={uploadingCover}
              className="group relative flex h-40 w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-white/10 transition hover:border-primary/30"
            >
              {form.cover_image ? (
                <img src={form.cover_image} alt="" className="h-full w-full object-cover" />
              ) : uploadingCover ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Upload className="h-6 w-6" />
                  <span className="text-xs">Upload cover image</span>
                </div>
              )}
            </button>
            <input ref={coverRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCoverUpload(f); e.target.value = ""; }} />
          </div>

          {/* Gallery */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Additional Images</label>
            <div className="flex flex-wrap gap-2">
              {form.gallery.map((url, i) => (
                <div key={i} className="relative h-20 w-20 overflow-hidden rounded-xl">
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <button onClick={() => set("gallery", form.gallery.filter((_, idx) => idx !== i))} className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <button onClick={() => galleryRef.current?.click()} disabled={uploadingGallery} className="flex h-20 w-20 items-center justify-center rounded-xl border-2 border-dashed border-white/10 text-muted-foreground transition hover:border-primary/30">
                {uploadingGallery ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
              </button>
            </div>
            <input ref={galleryRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(e) => { if (e.target.files && e.target.files.length > 0) handleGalleryUpload(e.target.files); e.target.value = ""; }} />
          </div>

          {/* Title + Video */}
          <Field label="Tour Title" required value={form.title} onChange={(v) => set("title", v)} placeholder="e.g. Dubai Summer Tour — 6 Days" />
          <Field label="Video URL" value={form.video_url} onChange={(v) => set("video_url", v)} type="url" placeholder="https://youtube.com/..." />

          {/* Destination */}
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField<string>
              label="Destination Country" required
              value={form.destination_country}
              onChange={(v) => set("destination_country", v)}
              options={[{ value: "", label: "Select country…" }, ...SORTED_COUNTRIES.map((c) => ({ value: c.name, label: c.name }))]}
            />
            <Field label="Destination City" value={form.destination_city} onChange={(v) => set("destination_city", v)} placeholder="e.g. Dubai" />
          </div>

          {/* Price */}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Price" required type="number" value={form.price} onChange={(v) => set("price", v)} placeholder="699" />
            <SelectField<string>
              label="Currency"
              value={form.currency}
              onChange={(v) => set("currency", v)}
              options={CURRENCIES.map((c) => ({ value: c, label: c }))}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField<string>
              label="Price Type"
              value={form.price_type}
              onChange={(v) => set("price_type", v as "per_person" | "total")}
              options={[{ value: "per_person", label: "Per Person" }, { value: "total", label: "Total Package" }]}
            />
            <Field label="Old Price (optional)" type="number" value={form.old_price} onChange={(v) => set("old_price", v)} placeholder="799" />
          </div>
          {discount && (
            <p className="-mt-2 text-xs text-emerald-400">Save {discount}% — shown as discount on public card</p>
          )}

          {/* Dates */}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Departure Date" required type="date" value={form.departure_date} onChange={(v) => set("departure_date", v)} />
            <Field label="Return Date" required type="date" value={form.return_date} onChange={(v) => set("return_date", v)} />
          </div>
          {duration && <p className="-mt-2 text-xs text-muted-foreground">Duration: {duration}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Booking Deadline (optional)" type="date" value={form.booking_deadline} onChange={(v) => set("booking_deadline", v)} />
            <Field label="Available Seats" type="number" value={form.available_seats} onChange={(v) => set("available_seats", v)} placeholder="18" />
          </div>

          {/* Descriptions */}
          <Field label="Short Description" required value={form.short_description} onChange={(v) => set("short_description", v)} type="textarea" placeholder="A 6-day luxury tour of Dubai with desert safari, Burj Khalifa, and more…" />
          <Field label="Full Description" value={form.full_description} onChange={(v) => set("full_description", v)} type="textarea" placeholder="Detailed day-by-day overview, highlights, what to expect…" />

          {/* Package Details */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <h4 className="mb-3 text-sm font-bold text-foreground">Package Details</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Hotel" value={form.hotel_name} onChange={(v) => set("hotel_name", v)} placeholder="e.g. Burj Al Arab" />
              <SelectField<string>
                label="Hotel Rating"
                value={form.hotel_rating}
                onChange={(v) => set("hotel_rating", v)}
                options={[{ value: "", label: "—" }, { value: "3", label: "3 ★" }, { value: "4", label: "4 ★" }, { value: "5", label: "5 ★" }]}
              />
              <Field label="Room Type" value={form.room_type} onChange={(v) => set("room_type", v)} placeholder="e.g. Deluxe Double" />
              <Field label="Meal Plan" value={form.meal_plan} onChange={(v) => set("meal_plan", v)} placeholder="e.g. Half Board" />
              <Field label="Transport" value={form.transport} onChange={(v) => set("transport", v)} placeholder="e.g. Private Coach" />
              <Field label="Airline" value={form.airline} onChange={(v) => set("airline", v)} placeholder="e.g. Emirates" />
              <Field label="Departure Airport/City" value={form.departure_airport} onChange={(v) => set("departure_airport", v)} placeholder="e.g. JFK, New York" />
            </div>
            {/* Toggles */}
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {([
                ["flight_included", "Flight included"],
                ["hotel_included", "Hotel included"],
                ["visa_included", "Visa included"],
                ["airport_transfer_included", "Airport transfer included"],
                ["guide_included", "Guide included"],
                ["travel_insurance_included", "Travel insurance included"],
                ["meals_included", "Meals included"],
              ] as const).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={form[key]}
                    onChange={(e) => set(key, e.target.checked)}
                    className="h-4 w-4 rounded accent-primary"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {/* Included / Not Included */}
          <ListEditor label="Included in Price" items={form.included_items} onChange={(items) => set("included_items", items)} placeholder="e.g. Flight, Hotel, Breakfast…" />
          <ListEditor label="Not Included" items={form.not_included_items} onChange={(items) => set("not_included_items", items)} placeholder="e.g. Personal expenses, Extra baggage…" />

          {/* Itinerary */}
          <ItineraryEditor items={form.itinerary} onChange={(items) => set("itinerary", items)} />
        </div>

        {/* Sticky footer */}
        <div className="flex shrink-0 gap-3 border-t border-white/[0.06] bg-background/80 px-6 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur-md">
          <button
            onClick={() => { if (hasFormData()) setShowDiscard(true); else onClose(); }}
            disabled={saving}
            className="glass flex-1 rounded-2xl py-3 text-sm font-semibold text-muted-foreground transition hover:text-foreground disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => handleSave("draft")}
            disabled={saving}
            className="glass flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold text-foreground transition active:scale-95 disabled:opacity-50"
          >
            {savingMode === "draft" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {savingMode === "draft" ? "Saving..." : "Save Draft"}
          </button>
          <button
            onClick={() => handleSave("published")}
            disabled={saving}
            className="gold-gradient flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-primary-foreground transition active:scale-95 disabled:opacity-50"
          >
            {savingMode === "published" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {savingMode === "published" ? "Publishing..." : "Publish"}
          </button>
        </div>
      </motion.div>

      {/* Discard confirmation */}
      <ConfirmDialog
        open={showDiscard}
        title="Discard unsaved changes?"
        message="You have unsaved data in the form. Discarding will close the editor without saving."
        confirmLabel="Discard"
        destructive
        onConfirm={() => { setShowDiscard(false); onClose(); }}
        onCancel={() => setShowDiscard(false)}
      />
    </>,
    document.body,
  );
}

/* ── Inline list editor ────────────────────────────────────── */
function ListEditor({ label, items, onChange, placeholder }: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState("");
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">{label}</label>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2 rounded-xl bg-white/[0.03] px-3 py-2">
            <span className="flex-1 text-sm text-foreground">{item}</span>
            <button onClick={() => onChange(items.filter((_, idx) => idx !== i))} className="text-muted-foreground transition hover:text-destructive">
              <Trash className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && input.trim()) {
                e.preventDefault();
                onChange([...items, input.trim()]);
                setInput("");
              }
            }}
            placeholder={placeholder}
            className="flex-1 rounded-xl border border-input bg-background/50 px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
          />
          <button
            onClick={() => { if (input.trim()) { onChange([...items, input.trim()]); setInput(""); } }}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary transition hover:bg-primary/25"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Itinerary editor ──────────────────────────────────────── */
function ItineraryEditor({ items, onChange }: {
  items: TourItineraryDay[];
  onChange: (items: TourItineraryDay[]) => void;
}) {
  const addDay = () => {
    onChange([...items, { day: items.length + 1, title: "", description: "" }]);
  };
  const updateDay = (index: number, patch: Partial<TourItineraryDay>) => {
    onChange(items.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  };
  const removeDay = (index: number) => {
    onChange(items.filter((_, i) => i !== index).map((d, i) => ({ ...d, day: i + 1 })));
  };
  const moveDay = (index: number, dir: -1 | 1) => {
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= items.length) return;
    const copy = [...items];
    [copy[index], copy[newIndex]] = [copy[newIndex], copy[index]];
    onChange(copy.map((d, i) => ({ ...d, day: i + 1 })));
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="text-xs font-semibold text-muted-foreground">Tour Itinerary (optional)</label>
        <button onClick={addDay} className="flex items-center gap-1 text-xs font-semibold text-primary transition hover:opacity-80">
          <Plus className="h-3.5 w-3.5" /> Add Day
        </button>
      </div>
      <div className="space-y-2">
        {items.map((day, i) => (
          <div key={i} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/15 text-[10px] font-bold text-primary">D{day.day}</span>
              <input
                value={day.title}
                onChange={(e) => updateDay(i, { title: e.target.value })}
                placeholder="Day title (e.g. Arrival & City Tour)"
                className="flex-1 rounded-lg border border-input bg-background/50 px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
              />
              <button onClick={() => moveDay(i, -1)} disabled={i === 0} className="text-muted-foreground transition hover:text-foreground disabled:opacity-30">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M10 12L6 8l4-4"/></svg>
              </button>
              <button onClick={() => moveDay(i, 1)} disabled={i === items.length - 1} className="text-muted-foreground transition hover:text-foreground disabled:opacity-30">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M6 12l4-4-4-4"/></svg>
              </button>
              <button onClick={() => removeDay(i)} className="text-muted-foreground transition hover:text-destructive">
                <Trash className="h-3.5 w-3.5" />
              </button>
            </div>
            <textarea
              value={day.description}
              onChange={(e) => updateDay(i, { description: e.target.value })}
              placeholder="Description of the day's activities…"
              rows={2}
              className="w-full resize-none rounded-lg border border-input bg-background/50 px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
