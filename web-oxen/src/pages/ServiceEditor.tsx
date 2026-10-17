import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Loader2,
  GripVertical,
  X,
  Image as ImageIcon,
  Video as VideoIcon,
  FileText,
  CheckCircle2,
  AlertCircle,
  GitBranch,
  HelpCircle,
  LayoutGrid,
  Search,
  Eye,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import {
  fetchConsultingCompany,
  fetchServiceById,
  createService,
  updateService,
  type Service,
  type RichBlock,
  type RichList,
  type ServiceVideo,
  type ProcessStep,
  type FAQItem,
} from "@/lib/services";
import { useAuth } from "@/contexts/AuthContext";
import { useSEO } from "@/hooks/use-seo";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const springIn = {
  type: "spring" as const,
  stiffness: 300,
  damping: 28,
  mass: 0.9,
};

/* ── Editor section wrapper ─────────────────────────────────── */

function EditorSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof FileText;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      className="glass rounded-2xl p-5"
    >
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15">
          <Icon className="h-5 w-5 text-primary" />
        </span>
        <h3 className="font-display text-lg font-bold">{title}</h3>
      </div>
      {children}
    </motion.div>
  );
}

/* ── String list editor (benefits, requirements) ────────────── */

function StringListEditor({
  items,
  onChange,
  placeholder,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
}) {
  const handleAdd = () => onChange([...items, ""]);
  const handleRemove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const handleChange = (i: number, val: string) => {
    const next = [...items];
    next[i] = val;
    onChange(next);
  };

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            type="text"
            value={item}
            onChange={(e) => handleChange(i, e.target.value)}
            placeholder={placeholder}
            className="flex-1 rounded-xl border border-input bg-background/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
          />
          <button
            onClick={() => handleRemove(i)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive transition hover:bg-destructive/20"
            aria-label="Remove"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button
        onClick={handleAdd}
        className="flex items-center gap-1.5 text-sm font-semibold text-primary transition hover:text-primary/80"
      >
        <Plus className="h-4 w-4" /> Add item
      </button>
    </div>
  );
}

/* ── Rich content editor ────────────────────────────────────── */

function RichContentEditor({
  blocks,
  onChange,
}: {
  blocks: RichBlock[];
  onChange: (blocks: RichBlock[]) => void;
}) {
  const addBlock = (type: RichBlock["type"]) => {
    if (type === "list") {
      onChange([...blocks, { type: "list", items: [""] }]);
    } else if (type === "quote") {
      onChange([...blocks, { type: "quote", text: "" }]);
    } else if (type === "link") {
      onChange([...blocks, { type: "link", text: "", url: "" }]);
    } else {
      onChange([...blocks, { type, text: "" }]);
    }
  };

  const updateBlock = (i: number, updates: Partial<RichBlock>) => {
    const next = [...blocks];
    next[i] = { ...next[i], ...updates } as RichBlock;
    onChange(next);
  };

  const removeBlock = (i: number) => onChange(blocks.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-3">
      {blocks.map((block, i) => (
        <div key={i} className="rounded-xl border border-input bg-background/30 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
              {block.type}
            </span>
            <button
              onClick={() => removeBlock(i)}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
              aria-label="Remove block"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {(block.type === "heading" || block.type === "paragraph" || block.type === "quote") && (
            <textarea
              value={block.text}
              onChange={(e) => updateBlock(i, { text: e.target.value })}
              placeholder={block.type === "heading" ? "Heading text..." : "Paragraph text..."}
              rows={block.type === "heading" ? 1 : 3}
              className="w-full resize-none rounded-lg border border-input bg-background/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
            />
          )}

          {block.type === "list" && (
            <div className="space-y-1.5">
              {block.items.map((item, j) => (
                <div key={j} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => {
                      const items = [...block.items];
                      items[j] = e.target.value;
                      updateBlock(i, { items } as Partial<RichList>);
                    }}
                    placeholder="List item..."
                    className="flex-1 rounded-lg border border-input bg-background/50 px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
                  />
                  <button
                    onClick={() =>
                      updateBlock(i, { items: block.items.filter((_, idx) => idx !== j) } as Partial<RichList>)
                    }
                    className="flex h-7 w-7 items-center justify-center rounded text-destructive transition hover:bg-destructive/10"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => updateBlock(i, { items: [...block.items, ""] } as Partial<RichList>)}
                className="text-xs font-semibold text-primary"
              >
                + Add item
              </button>
            </div>
          )}

          {block.type === "link" && (
            <div className="space-y-1.5">
              <input
                type="text"
                value={block.text}
                onChange={(e) => updateBlock(i, { text: e.target.value })}
                placeholder="Link text..."
                className="w-full rounded-lg border border-input bg-background/50 px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
              />
              <input
                type="url"
                value={block.url}
                onChange={(e) => updateBlock(i, { url: e.target.value })}
                placeholder="https://..."
                className="w-full rounded-lg border border-input bg-background/50 px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
              />
            </div>
          )}
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        {(["heading", "paragraph", "list", "quote", "link"] as const).map((type) => (
          <button
            key={type}
            onClick={() => addBlock(type)}
            className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/20"
          >
            + {type}
          </button>
        ))}
      </div>
    </div>
  );
}



/* ── Process steps editor ───────────────────────────────────── */

function ProcessEditor({
  steps,
  onChange,
}: {
  steps: ProcessStep[];
  onChange: (steps: ProcessStep[]) => void;
}) {
  const handleAdd = () => onChange([...steps, { step: "", description: "" }]);
  const handleRemove = (i: number) => onChange(steps.filter((_, idx) => idx !== i));
  const handleChange = (i: number, field: keyof ProcessStep, val: string) => {
    const next = [...steps];
    next[i] = { ...next[i], [field]: val };
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {steps.map((step, i) => (
        <div key={i} className="rounded-xl border border-input bg-background/30 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
              {i + 1}
            </span>
            <button
              onClick={() => handleRemove(i)}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-destructive transition hover:bg-destructive/10"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <input
            type="text"
            value={step.step}
            onChange={(e) => handleChange(i, "step", e.target.value)}
            placeholder="Step name (e.g. Purchase)"
            className="w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
          <textarea
            value={step.description}
            onChange={(e) => handleChange(i, "description", e.target.value)}
            placeholder="Description..."
            rows={2}
            className="w-full resize-none rounded-lg border border-input bg-background/50 px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </div>
      ))}
      <button
        onClick={handleAdd}
        className="flex items-center gap-1.5 text-sm font-semibold text-primary transition hover:text-primary/80"
      >
        <Plus className="h-4 w-4" /> Add step
      </button>
    </div>
  );
}

/* ── FAQ editor ─────────────────────────────────────────────── */

function FAQEditor({
  items,
  onChange,
}: {
  items: FAQItem[];
  onChange: (items: FAQItem[]) => void;
}) {
  const handleAdd = () => onChange([...items, { question: "", answer: "" }]);
  const handleRemove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const handleChange = (i: number, field: keyof FAQItem, val: string) => {
    const next = [...items];
    next[i] = { ...next[i], [field]: val };
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="rounded-xl border border-input bg-background/30 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">Q{i + 1}</span>
            <button
              onClick={() => handleRemove(i)}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-destructive transition hover:bg-destructive/10"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <input
            type="text"
            value={item.question}
            onChange={(e) => handleChange(i, "question", e.target.value)}
            placeholder="Question..."
            className="w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
          <textarea
            value={item.answer}
            onChange={(e) => handleChange(i, "answer", e.target.value)}
            placeholder="Answer..."
            rows={2}
            className="w-full resize-none rounded-lg border border-input bg-background/50 px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </div>
      ))}
      <button
        onClick={handleAdd}
        className="flex items-center gap-1.5 text-sm font-semibold text-primary transition hover:text-primary/80"
      >
        <Plus className="h-4 w-4" /> Add FAQ
      </button>
    </div>
  );
}

/* ── Video editor ───────────────────────────────────────────── */

function VideoEditor({
  videos,
  onChange,
}: {
  videos: ServiceVideo[];
  onChange: (videos: ServiceVideo[]) => void;
}) {
  const handleAdd = () => onChange([...videos, { type: "youtube", url: "", title: "" }]);
  const handleRemove = (i: number) => onChange(videos.filter((_, idx) => idx !== i));
  const handleChange = (i: number, field: keyof ServiceVideo, val: string) => {
    const next = [...videos];
    next[i] = { ...next[i], [field]: val } as ServiceVideo;
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {videos.map((video, i) => (
        <div key={i} className="rounded-xl border border-input bg-background/30 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <select
              value={video.type}
              onChange={(e) => handleChange(i, "type", e.target.value)}
              className="rounded-lg border border-input bg-background/50 px-2 py-1.5 text-xs focus:border-primary focus:outline-none"
            >
              <option value="youtube">YouTube</option>
              <option value="uploaded">Uploaded Video</option>
            </select>
            <button
              onClick={() => handleRemove(i)}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-destructive transition hover:bg-destructive/10"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <input
            type="url"
            value={video.url}
            onChange={(e) => handleChange(i, "url", e.target.value)}
            placeholder={video.type === "youtube" ? "https://youtube.com/watch?v=..." : "https://.../video.mp4"}
            className="w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
          <input
            type="text"
            value={video.title ?? ""}
            onChange={(e) => handleChange(i, "title", e.target.value)}
            placeholder="Video title (optional)"
            className="w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </div>
      ))}
      <button
        onClick={handleAdd}
        className="flex items-center gap-1.5 text-sm font-semibold text-primary transition hover:text-primary/80"
      >
        <Plus className="h-4 w-4" /> Add video
      </button>
    </div>
  );
}

/* ── Main ServiceEditor page ────────────────────────────────── */

export default function ServiceEditor() {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isEditing = !!serviceId;

  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<Service>>({
    title: "",
    description: "",
    long_description: [],
    cover_image: "",
    gallery: [],
    videos: [],
    category: "General",
    price: 0,
    currency: "USD",
    duration: "",
    delivery_time: "",
    benefits: [],
    requirements: [],
    process: [],
    faq: [],
    additional_content: [],
    seo_title: "",
    seo_description: "",
    seo_keywords: "",
    is_active: true,
  });

  useSEO({
    title: isEditing ? "Edit Service | OXEN" : "Create Service | OXEN",
    description: "Create or edit a travel consulting service.",
  });

  // Get consulting company
  const { data: company } = useQuery({
    queryKey: ["consulting-company", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const existing = await fetchConsultingCompany(user.id);
      return existing;
    },
    enabled: !!user,
  });

  // If editing, load existing service
  const { data: existingService, isLoading } = useQuery({
    queryKey: ["service", serviceId],
    queryFn: () => fetchServiceById(serviceId!),
    enabled: isEditing,
  });

  // Populate form when editing
  useEffect(() => {
    if (existingService) {
      setFormData({
        title: existingService.title,
        description: existingService.description,
        long_description: existingService.long_description,
        cover_image: existingService.cover_image,
        gallery: existingService.gallery,
        videos: existingService.videos,
        category: existingService.category,
        price: Number(existingService.price),
        currency: existingService.currency,
        duration: existingService.duration,
        delivery_time: existingService.delivery_time,
        benefits: existingService.benefits,
        requirements: existingService.requirements,
        process: existingService.process,
        faq: existingService.faq,
        additional_content: existingService.additional_content,
        seo_title: existingService.seo_title,
        seo_description: existingService.seo_description,
        seo_keywords: existingService.seo_keywords,
        is_active: existingService.is_active,
      });
    }
  }, [existingService]);

  const update = useCallback((field: keyof Service, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Parse jsonb arrays for editors
  const galleryUrls = useMemo(() => {
    const g = formData.gallery;
    if (!Array.isArray(g)) return [] as string[];
    return g as unknown as string[];
  }, [formData.gallery]);

  const benefitsList = useMemo(() => {
    const b = formData.benefits;
    if (!Array.isArray(b)) return [] as string[];
    return b as unknown as string[];
  }, [formData.benefits]);

  const requirementsList = useMemo(() => {
    const r = formData.requirements;
    if (!Array.isArray(r)) return [] as string[];
    return r as unknown as string[];
  }, [formData.requirements]);

  const processSteps = useMemo(() => {
    const p = formData.process;
    if (!Array.isArray(p)) return [] as ProcessStep[];
    return p as unknown as ProcessStep[];
  }, [formData.process]);

  const faqItems = useMemo(() => {
    const f = formData.faq;
    if (!Array.isArray(f)) return [] as FAQItem[];
    return f as unknown as FAQItem[];
  }, [formData.faq]);

  const videoList = useMemo(() => {
    const v = formData.videos;
    if (!Array.isArray(v)) return [] as ServiceVideo[];
    return v as unknown as ServiceVideo[];
  }, [formData.videos]);

  const longBlocks = useMemo(() => {
    const ld = formData.long_description;
    if (!Array.isArray(ld)) return [] as RichBlock[];
    return ld as unknown as RichBlock[];
  }, [formData.long_description]);

  const additionalBlocks = useMemo(() => {
    const ac = formData.additional_content;
    if (!Array.isArray(ac)) return [] as RichBlock[];
    return ac as unknown as RichBlock[];
  }, [formData.additional_content]);

  const handleSave = async () => {
    if (!company) {
      toast({ title: "No consulting company found", variant: "destructive" });
      return;
    }
    if (!formData.title?.trim()) {
      toast({ title: "Service title is required", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      if (isEditing && serviceId) {
        await updateService(serviceId, formData);
        toast({ title: "Service updated!", variant: "default" });
      } else {
        await createService(company.id, formData);
        toast({ title: "Service created!", variant: "default" });
      }
      queryClient.invalidateQueries({ queryKey: ["my-services"] });
      queryClient.invalidateQueries({ queryKey: ["services"] });
      navigate("/dashboard/consulting");
    } catch {
      toast({ title: "Failed to save service", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (isEditing && isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative px-5 pt-6 pb-32">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={springIn}>
        <button
          onClick={() => navigate("/dashboard/consulting")}
          className="flex items-center gap-1 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Consulting Dashboard
        </button>
        <h1 className="mt-4 font-display text-2xl font-extrabold">
          {isEditing ? "Edit Service" : "Create Service"}
        </h1>
      </motion.div>

      <div className="mt-6 space-y-4">
        {/* Basic info */}
        <EditorSection title="Service Details" icon={FileText}>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Title</label>
              <input
                type="text"
                value={formData.title ?? ""}
                onChange={(e) => update("title", e.target.value)}
                placeholder="e.g. Japan Luxury Travel Planning"
                className="w-full rounded-xl border border-input bg-background/50 px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Short Description</label>
              <textarea
                value={formData.description ?? ""}
                onChange={(e) => update("description", e.target.value)}
                placeholder="Brief summary of the service..."
                rows={2}
                className="w-full resize-none rounded-xl border border-input bg-background/50 px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Price</label>
                <input
                  type="number"
                  value={formData.price ?? 0}
                  onChange={(e) => update("price", parseFloat(e.target.value) || 0)}
                  className="w-full rounded-xl border border-input bg-background/50 px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Currency</label>
                <select
                  value={formData.currency ?? "USD"}
                  onChange={(e) => update("currency", e.target.value)}
                  className="w-full rounded-xl border border-input bg-background/50 px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
                >
                  {["USD", "EUR", "GBP", "JPY", "UZS", "RUB", "AED"].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Duration</label>
                <input
                  type="text"
                  value={formData.duration ?? ""}
                  onChange={(e) => update("duration", e.target.value)}
                  placeholder="e.g. 14 days"
                  className="w-full rounded-xl border border-input bg-background/50 px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Delivery Time</label>
                <input
                  type="text"
                  value={formData.delivery_time ?? ""}
                  onChange={(e) => update("delivery_time", e.target.value)}
                  placeholder="e.g. 5-7 business days"
                  className="w-full rounded-xl border border-input bg-background/50 px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Category</label>
              <input
                type="text"
                value={formData.category ?? "General"}
                onChange={(e) => update("category", e.target.value)}
                placeholder="e.g. Travel Planning"
                className="w-full rounded-xl border border-input bg-background/50 px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Cover Image URL</label>
              <input
                type="url"
                value={formData.cover_image ?? ""}
                onChange={(e) => update("cover_image", e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full rounded-xl border border-input bg-background/50 px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
              />
              {formData.cover_image && (
                <img
                  src={formData.cover_image}
                  alt="Cover preview"
                  className="mt-2 h-32 w-full rounded-xl object-cover"
                />
              )}
            </div>
          </div>
        </EditorSection>

        {/* Long description */}
        <EditorSection title="About This Service" icon={FileText}>
          <RichContentEditor
            blocks={longBlocks}
            onChange={(blocks) => update("long_description", blocks)}
          />
        </EditorSection>

        {/* Benefits */}
        <EditorSection title="What You Will Get" icon={CheckCircle2}>
          <StringListEditor
            items={benefitsList}
            onChange={(items) => update("benefits", items)}
            placeholder="e.g. Custom day-by-day itinerary"
          />
        </EditorSection>

        {/* Gallery */}
        <EditorSection title="Gallery" icon={ImageIcon}>
          <StringListEditor
            items={galleryUrls}
            onChange={(items) => update("gallery", items)}
            placeholder="https://images.unsplash.com/..."
          />
          {galleryUrls.length > 0 && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {galleryUrls.filter(Boolean).map((url, i) => (
                <img key={i} src={url} alt="" className="aspect-square rounded-lg object-cover" />
              ))}
            </div>
          )}
        </EditorSection>

        {/* Videos */}
        <EditorSection title="Videos" icon={VideoIcon}>
          <VideoEditor videos={videoList} onChange={(v) => update("videos", v)} />
        </EditorSection>

        {/* Additional information */}
        <EditorSection title="Additional Information" icon={LayoutGrid}>
          <RichContentEditor
            blocks={additionalBlocks}
            onChange={(blocks) => update("additional_content", blocks)}
          />
        </EditorSection>

        {/* Requirements */}
        <EditorSection title="Requirements" icon={AlertCircle}>
          <StringListEditor
            items={requirementsList}
            onChange={(items) => update("requirements", items)}
            placeholder="e.g. Valid passport (6+ months)"
          />
        </EditorSection>

        {/* Process timeline */}
        <EditorSection title="Process Timeline" icon={GitBranch}>
          <ProcessEditor steps={processSteps} onChange={(s) => update("process", s)} />
        </EditorSection>

        {/* FAQ */}
        <EditorSection title="FAQ" icon={HelpCircle}>
          <FAQEditor items={faqItems} onChange={(f) => update("faq", f)} />
        </EditorSection>

        {/* SEO */}
        <EditorSection title="SEO Settings" icon={Search}>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">SEO Title</label>
              <input
                type="text"
                value={formData.seo_title ?? ""}
                onChange={(e) => update("seo_title", e.target.value)}
                placeholder="SEO title..."
                className="w-full rounded-xl border border-input bg-background/50 px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">SEO Description</label>
              <textarea
                value={formData.seo_description ?? ""}
                onChange={(e) => update("seo_description", e.target.value)}
                placeholder="SEO description..."
                rows={2}
                className="w-full resize-none rounded-xl border border-input bg-background/50 px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">SEO Keywords</label>
              <input
                type="text"
                value={formData.seo_keywords ?? ""}
                onChange={(e) => update("seo_keywords", e.target.value)}
                placeholder="keyword1, keyword2, keyword3"
                className="w-full rounded-xl border border-input bg-background/50 px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
              />
            </div>
          </div>
        </EditorSection>

        {/* Active toggle */}
        <div className="glass flex items-center justify-between rounded-2xl p-4">
          <div>
            <p className="text-sm font-semibold">Service Active</p>
            <p className="text-xs text-muted-foreground">When active, this service is visible to users.</p>
          </div>
          <button
            onClick={() => update("is_active", !formData.is_active)}
            className={cn(
              "relative h-7 w-12 rounded-full transition",
              formData.is_active ? "bg-primary" : "bg-muted",
            )}
          >
            <motion.span
              animate={{ x: formData.is_active ? 22 : 2 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="absolute top-1 h-5 w-5 rounded-full bg-white shadow"
            />
          </button>
        </div>

        {/* Save bar */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="gold-gradient flex flex-1 items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-primary-foreground transition active:scale-95 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isEditing ? "Save Changes" : "Create Service"}
          </button>
          <button
            onClick={() => navigate("/dashboard/consulting")}
            className="glass rounded-2xl px-5 py-3.5 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
