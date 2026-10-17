import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Building2, Upload, Save, X, Edit3, Eye, Loader2, CheckCircle2,
  Globe, Phone, Mail, MapPin, Clock, Languages, Plane, Award, FileText,
  MessageCircle, Send, Instagram, Facebook, Youtube, Plus, Trash2,
  Image as ImageIcon, ShieldCheck, AlertCircle, Calendar,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { DashboardShell } from "@/components/consulting/DashboardShell";
import { Field, SelectField } from "@/components/consulting/Field";
import { useConsulting } from "@/contexts/ConsultingContext";
import { useSEO } from "@/hooks/use-seo";
import { toast } from "@/hooks/use-toast";
import {
  updateCompanyProfile,
  uploadConsultingAsset,
  type ConsultingCompany,
  type VerificationStatus,
} from "@/lib/consulting";
import { COUNTRIES } from "@/data/countries";
import { cn } from "@/lib/utils";

const springIn = {
  type: "spring" as const,
  stiffness: 260,
  damping: 26,
};

const LANGUAGES = [
  "English", "Russian", "Uzbek", "Kazakh", "Turkish", "Arabic", "Chinese",
  "Korean", "Japanese", "German", "French", "Spanish", "Italian", "Portuguese",
  "Hindi", "Persian", "Tajik", "Kyrgyz", "Turkmen", "Azerbaijani",
];

const SPECIALTIES = [
  "Visa Consulting", "Tour Packages", "Education Abroad", "Work Permits",
  "Immigration", "Business Travel", "Medical Tourism", "Hajj & Umrah",
  "Flight Booking", "Hotel Booking", "Travel Insurance", "Airport Transfers",
];

interface ProfileForm {
  name: string;
  legal_name: string;
  short_description: string;
  description: string;
  country: string;
  city: string;
  address: string;
  map_link: string;
  contact_phone: string;
  additional_phone: string;
  contact_email: string;
  website: string;
  whatsapp: string;
  telegram: string;
  working_hours: string;
  founded_year: string;
  years_experience: string;
  supported_languages: string[];
  destination_countries: string[];
  specialties: string[];
  logo_url: string;
  cover_image_url: string;
  is_published: boolean;
  // Social links
  social_instagram: string;
  social_facebook: string;
  social_tiktok: string;
  social_youtube: string;
  social_telegram: string;
  // License
  license_info: string;
  license_number: string;
  license_issue_date: string;
  license_expiry_date: string;
  license_issuing_org: string;
  license_document_url: string;
  registration_document_url: string;
  // Photos
  agency_photos: string[];
  // Branches
  branches: Array<{ name: string; address: string; phone: string; working_hours: string; map_link: string }>;
  // Verification
  verification_status: VerificationStatus;
}

function formFromCompany(c: ConsultingCompany | null): ProfileForm {
  const sl = c?.social_links ?? {};
  return {
    name: c?.name ?? "",
    legal_name: c?.legal_name ?? "",
    short_description: c?.short_description ?? "",
    description: c?.description ?? "",
    country: c?.country ?? "",
    city: c?.city ?? "",
    address: c?.address ?? "",
    map_link: c?.map_link ?? "",
    contact_phone: c?.contact_phone ?? "",
    additional_phone: c?.additional_phone ?? "",
    contact_email: c?.contact_email ?? "",
    website: c?.website ?? "",
    whatsapp: c?.whatsapp ?? "",
    telegram: c?.telegram ?? "",
    working_hours: c?.working_hours ?? "",
    founded_year: c?.founded_year ? String(c.founded_year) : "",
    years_experience: c ? String(c.years_experience ?? 0) : "0",
    supported_languages: c?.supported_languages ?? [],
    destination_countries: c?.destination_countries ?? [],
    specialties: c?.specialties ?? [],
    logo_url: c?.logo_url ?? "",
    cover_image_url: c?.cover_image_url ?? "",
    is_published: c?.is_published ?? false,
    social_instagram: sl.instagram ?? "",
    social_facebook: sl.facebook ?? "",
    social_tiktok: sl.tiktok ?? "",
    social_youtube: sl.youtube ?? "",
    social_telegram: sl.telegram ?? "",
    license_info: c?.license_info ?? "",
    license_number: c?.license_number ?? "",
    license_issue_date: c?.license_issue_date ?? "",
    license_expiry_date: c?.license_expiry_date ?? "",
    license_issuing_org: c?.license_issuing_org ?? "",
    license_document_url: c?.license_document_url ?? "",
    registration_document_url: c?.registration_document_url ?? "",
    agency_photos: c?.agency_photos ?? [],
    branches: c?.branches ?? [],
    verification_status: c?.verification_status ?? "not_submitted",
  };
}

/** Compute profile completion percentage based on key fields. */
function computeCompletion(f: ProfileForm): number {
  const checks: boolean[] = [
    !!f.logo_url,
    !!f.name.trim(),
    !!f.description.trim(),
    !!f.contact_phone.trim(),
    !!f.country.trim() && !!f.city.trim(),
    f.agency_photos.length > 0,
    f.verification_status !== "not_submitted",
    !!f.short_description.trim(),
    !!f.specialties.length,
    !!f.working_hours.trim(),
  ];
  const done = checks.filter(Boolean).length;
  return Math.round((done / checks.length) * 100);
}

export default function CompanyProfile() {
  const { company, isTestMode } = useConsulting();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<ProfileForm>(formFromCompany(company));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingLicenseDoc, setUploadingLicenseDoc] = useState(false);
  const [uploadingRegDoc, setUploadingRegDoc] = useState(false);

  useSEO({ title: "Agency Profile | OXEN CRM", description: "Manage your tour agency profile." });

  useEffect(() => {
    if (!editing) setForm(formFromCompany(company));
  }, [company, editing]);

  const completion = useMemo(() => computeCompletion(form), [form]);

  /** Minimum fields required to publish. */
  const canPublish = useMemo(() => {
    return !!(
      form.name.trim() &&
      form.logo_url &&
      form.description.trim() &&
      (form.contact_phone.trim() || form.whatsapp.trim() || form.telegram.trim() || form.contact_email.trim()) &&
      form.country.trim() &&
      form.city.trim()
    );
  }, [form]);

  const set = <K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key as string]) {
      setErrors((e) => {
        const next = { ...e };
        delete next[key as string];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Agency name is required.";
    if (form.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contact_email))
      e.contact_email = "Enter a valid email.";
    if (form.contact_phone && form.contact_phone.replace(/\D/g, "").length < 7)
      e.contact_phone = "Enter a valid phone number.";
    if (form.website && !/^https?:\/\//i.test(form.website))
      e.website = "Website must start with http:// or https://";
    if (form.founded_year && (Number(form.founded_year) < 1800 || Number(form.founded_year) > new Date().getFullYear()))
      e.founded_year = "Enter a valid year.";
    // Social link URL validation
    const socialFields: { key: string; value: string; label: string }[] = [
      { key: "social_instagram", value: form.social_instagram, label: "Instagram URL" },
      { key: "social_facebook", value: form.social_facebook, label: "Facebook URL" },
      { key: "social_tiktok", value: form.social_tiktok, label: "TikTok URL" },
      { key: "social_youtube", value: form.social_youtube, label: "YouTube URL" },
      { key: "social_telegram", value: form.social_telegram, label: "Telegram channel URL" },
    ];
    for (const sf of socialFields) {
      if (sf.value && !/^https?:\/\//i.test(sf.value)) {
        e[sf.key] = `${sf.label} must start with http:// or https://`;
      }
    }
    if (form.map_link && !/^https?:\/\//i.test(form.map_link))
      e.map_link = "Map link must start with http:// or https://";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!company) throw new Error("No company");
      const socialLinks: Record<string, string> = {};
      if (form.social_instagram) socialLinks.instagram = form.social_instagram;
      if (form.social_facebook) socialLinks.facebook = form.social_facebook;
      if (form.social_tiktok) socialLinks.tiktok = form.social_tiktok;
      if (form.social_youtube) socialLinks.youtube = form.social_youtube;
      if (form.social_telegram) socialLinks.telegram = form.social_telegram;

      // If license info was added and status is not_submitted, move to pending
      const hasLicense = !!(form.license_number || form.license_info || form.license_issuing_org || form.license_document_url || form.registration_document_url);
      const verificationStatus = form.verification_status === "not_submitted" && hasLicense
        ? "pending" as VerificationStatus
        : form.verification_status;

      const patch = {
        name: form.name,
        legal_name: form.legal_name || null,
        short_description: form.short_description || null,
        description: form.description || null,
        country: form.country || null,
        city: form.city || null,
        address: form.address || null,
        map_link: form.map_link || null,
        contact_phone: form.contact_phone || null,
        additional_phone: form.additional_phone || null,
        contact_email: form.contact_email || null,
        website: form.website || null,
        whatsapp: form.whatsapp || null,
        telegram: form.telegram || null,
        working_hours: form.working_hours || null,
        founded_year: form.founded_year ? Number(form.founded_year) : null,
        years_experience: Number(form.years_experience) || 0,
        supported_languages: form.supported_languages,
        destination_countries: form.destination_countries,
        specialties: form.specialties,
        logo_url: form.logo_url || null,
        cover_image_url: form.cover_image_url || null,
        is_published: form.is_published,
        social_links: Object.keys(socialLinks).length > 0 ? socialLinks : null,
        agency_photos: form.agency_photos,
        branches: form.branches,
        license_info: form.license_info || null,
        license_number: form.license_number || null,
        license_issue_date: form.license_issue_date || null,
        license_expiry_date: form.license_expiry_date || null,
        license_issuing_org: form.license_issuing_org || null,
        license_document_url: form.license_document_url || null,
        registration_document_url: form.registration_document_url || null,
        verification_status: verificationStatus,
      };

      if (isTestMode) {
        try {
          const raw = localStorage.getItem("oxen.consulting.onboarding");
          if (raw) {
            const snap = JSON.parse(raw);
            snap.company = { ...snap.company, name: form.name, country: form.country, city: form.city, address: form.address, phone: form.contact_phone, email: form.contact_email, website: form.website || null, description: form.description, logoDataUrl: form.logo_url };
            localStorage.setItem("oxen.consulting.onboarding", JSON.stringify(snap));
          }
        } catch { /* ignore */ }
        queryClient.setQueryData(["consulting-company", "test-company-" + company.owner_id, company.owner_id], {
          ...company, ...patch, updated_at: new Date().toISOString(),
        });
        return;
      }
      const { error } = await updateCompanyProfile(company.id, patch);
      if (error) throw new Error(error);
    },
    onSuccess: () => {
      toast({ title: "Profile saved", description: "Your agency profile was updated." });
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ["consulting-company"] });
    },
    onError: (err: unknown) => {
      toast({ title: "Failed to save", description: err instanceof Error ? err.message : "Please try again.", variant: "destructive" });
    },
  });

  // ── Publish / Unpublish (separate from full save) ──────────────
  const publishMutation = useMutation({
    mutationFn: async (publish: boolean) => {
      if (!company) throw new Error("No company");
      if (isTestMode) {
        try {
          const raw = localStorage.getItem("oxen.consulting.onboarding");
          if (raw) {
            const snap = JSON.parse(raw);
            snap.company = { ...snap.company };
            localStorage.setItem("oxen.consulting.onboarding", JSON.stringify(snap));
          }
        } catch { /* ignore */ }
        queryClient.setQueryData(["consulting-company", "test-company-" + company.owner_id, company.owner_id], {
          ...company, is_published: publish, updated_at: new Date().toISOString(),
        });
        return;
      }
      const { error } = await updateCompanyProfile(company.id, { is_published: publish });
      if (error) throw new Error(error);
    },
    onSuccess: (_, publish) => {
      set("is_published", publish);
      toast({
        title: publish ? "Agency published" : "Agency unpublished",
        description: publish ? "Your agency is now visible on the OXEN Home page." : "Your agency is no longer visible publicly.",
      });
      queryClient.invalidateQueries({ queryKey: ["consulting-company"] });
      queryClient.invalidateQueries({ queryKey: ["published-agencies"] });
    },
    onError: (err: unknown) => {
      toast({ title: "Failed", description: err instanceof Error ? err.message : "Please try again.", variant: "destructive" });
    },
  });

  const handlePublish = () => {
    if (!canPublish) {
      toast({ title: "Cannot publish yet", description: "Complete minimum fields: name, logo, description, phone, country, city.", variant: "destructive" });
      return;
    }
    publishMutation.mutate(true);
  };

  const handleUnpublish = () => {
    publishMutation.mutate(false);
  };

  const handleSave = () => { if (!validate()) return; saveMutation.mutate(); };
  const handleCancel = () => { setForm(formFromCompany(company)); setErrors({}); setEditing(false); };

  const handleImage = async (file: File, kind: "logo" | "cover") => {
    if (!company) return;
    if (file.size > 2 * 1024 * 1024) { toast({ title: "Image too large", description: "Max 2 MB.", variant: "destructive" }); return; }
    if (isTestMode) {
      const reader = new FileReader();
      reader.onload = () => { set(kind === "logo" ? "logo_url" : "cover_image_url", reader.result as string); };
      reader.readAsDataURL(file); return;
    }
    const setter = kind === "logo" ? setUploadingLogo : setUploadingCover;
    setter(true);
    try {
      const url = await uploadConsultingAsset(file, `companies/${company.id}/${kind}-${Date.now()}`);
      if (url) { set(kind === "logo" ? "logo_url" : "cover_image_url", url); toast({ title: `${kind === "logo" ? "Logo" : "Cover"} uploaded` }); }
      else { toast({ title: "Upload failed", variant: "destructive" }); }
    } finally { setter(false); }
  };

  const handlePhotoUpload = async (file: File) => {
    if (!company) return;
    if (file.size > 3 * 1024 * 1024) { toast({ title: "Image too large", description: "Max 3 MB.", variant: "destructive" }); return; }
    if (isTestMode) {
      const reader = new FileReader();
      reader.onload = () => { set("agency_photos", [...form.agency_photos, reader.result as string]); };
      reader.readAsDataURL(file); return;
    }
    setUploadingPhoto(true);
    try {
      const url = await uploadConsultingAsset(file, `companies/${company.id}/photos/${Date.now()}-${file.name}`);
      if (url) { set("agency_photos", [...form.agency_photos, url]); toast({ title: "Photo uploaded" }); }
      else { toast({ title: "Upload failed", variant: "destructive" }); }
    } finally { setUploadingPhoto(false); }
  };

  const handleLicenseDocUpload = async (file: File) => {
    if (!company) return;
    if (file.size > 5 * 1024 * 1024) { toast({ title: "File too large", description: "Max 5 MB.", variant: "destructive" }); return; }
    if (isTestMode) {
      const reader = new FileReader();
      reader.onload = () => { set("license_document_url", reader.result as string); };
      reader.readAsDataURL(file); return;
    }
    setUploadingLicenseDoc(true);
    try {
      const url = await uploadConsultingAsset(file, `companies/${company.id}/license-${Date.now()}`);
      if (url) { set("license_document_url", url); toast({ title: "License document uploaded" }); }
      else { toast({ title: "Upload failed", variant: "destructive" }); }
    } finally { setUploadingLicenseDoc(false); }
  };

  const handleRegDocUpload = async (file: File) => {
    if (!company) return;
    if (file.size > 5 * 1024 * 1024) { toast({ title: "File too large", description: "Max 5 MB.", variant: "destructive" }); return; }
    if (isTestMode) {
      const reader = new FileReader();
      reader.onload = () => { set("registration_document_url", reader.result as string); };
      reader.readAsDataURL(file); return;
    }
    setUploadingRegDoc(true);
    try {
      const url = await uploadConsultingAsset(file, `companies/${company.id}/registration-${Date.now()}`);
      if (url) { set("registration_document_url", url); toast({ title: "Registration document uploaded" }); }
      else { toast({ title: "Upload failed", variant: "destructive" }); }
    } finally { setUploadingRegDoc(false); }
  };

  const removePhoto = (idx: number) => {
    set("agency_photos", form.agency_photos.filter((_, i) => i !== idx));
  };

  const addBranch = () => {
    set("branches", [...form.branches, { name: "", address: "", phone: "", working_hours: "", map_link: "" }]);
  };
  const updateBranch = (idx: number, field: string, value: string) => {
    set("branches", form.branches.map((b, i) => i === idx ? { ...b, [field]: value } : b));
  };
  const removeBranch = (idx: number) => {
    set("branches", form.branches.filter((_, i) => i !== idx));
  };

  const toggleArrayItem = (key: "supported_languages" | "destination_countries" | "specialties", item: string) => {
    set(key, (form[key] as string[]).includes(item) ? (form[key] as string[]).filter((x) => x !== item) : [...(form[key] as string[]), item]);
  };

  const countryOptions = useMemo(
    () => [{ value: "", label: "Select country" }, ...COUNTRIES.map((c) => ({ value: c.name, label: c.name }))],
    [],
  );

  const verificationBadge = () => {
    switch (form.verification_status) {
      case "verified": return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-400"><ShieldCheck className="h-3 w-3" /> Verified</span>;
      case "pending": return <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] font-semibold text-amber-400"><Clock className="h-3 w-3" /> Pending Review</span>;
      case "rejected": return <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2.5 py-1 text-[11px] font-semibold text-red-400"><AlertCircle className="h-3 w-3" /> Rejected</span>;
      default: return <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">Not Submitted</span>;
    }
  };

  return (
    <DashboardShell
      title="Agency Profile"
      subtitle="Public-facing business information"
      actions={
        editing ? (
          <div className="flex items-center gap-2">
            <button onClick={handleCancel} disabled={saveMutation.isPending} className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-4 py-2 text-xs font-semibold text-foreground transition hover:bg-white/[0.1] disabled:opacity-50">
              <X className="h-3.5 w-3.5" /> Cancel
            </button>
            <button onClick={handleSave} disabled={saveMutation.isPending} className="gold-gradient inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold text-primary-foreground transition active:scale-95 disabled:opacity-50">
              {saveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(`/agency/${company?.id ?? ""}`)} disabled={!company} className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-4 py-2 text-xs font-semibold text-foreground transition hover:bg-white/[0.1] disabled:opacity-50">
              <Eye className="h-3.5 w-3.5" /> Preview Public Page
            </button>
            <button onClick={() => setEditing(true)} className="gold-gradient inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold text-primary-foreground transition active:scale-95">
              <Edit3 className="h-3.5 w-3.5" /> Edit Profile
            </button>
          </div>
        )
      }
    >
      {isTestMode && (
        <div className="mb-5 rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] px-4 py-3 text-xs text-amber-200/90">
          <span className="font-bold">Test Mode:</span> Profile changes are saved to your browser. Apply migration 0013 in Supabase to persist to the database.
        </div>
      )}

      {/* Profile completion bar */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={springIn} className="glass mb-5 rounded-3xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-display text-sm font-bold text-foreground">Profile Completion</h4>
            <p className="mt-0.5 text-xs text-muted-foreground">Complete your profile to attract more clients</p>
          </div>
          <span className={cn("font-display text-2xl font-extrabold", completion >= 80 ? "text-emerald-400" : completion >= 50 ? "text-amber-400" : "text-muted-foreground")}>{completion}%</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.06]">
          <motion.div initial={{ width: 0 }} animate={{ width: `${completion}%` }} transition={{ type: "spring", stiffness: 200, damping: 20 }} className={cn("h-full rounded-full", completion >= 80 ? "bg-emerald-500" : completion >= 50 ? "bg-amber-500" : "bg-primary")} />
        </div>
      </motion.div>

      {/* Publish Agency section */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ ...springIn, delay: 0.03 }} className="glass mb-5 rounded-3xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h4 className="font-display text-sm font-bold text-foreground">Agency Visibility</h4>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {form.is_published
                ? "Your agency is publicly visible on OXEN Home and accessible at /agency/" + (company?.id ?? "")
                : "Publish your agency to make it visible on the OXEN Home page."}
            </p>
            {!canPublish && !form.is_published && (
              <p className="mt-2 inline-flex items-center gap-1 text-[11px] text-amber-400">
                <AlertCircle className="h-3 w-3" /> Requires: name, logo, description, phone, country, city
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {form.is_published ? (
              <>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Published
                </span>
                <button
                  onClick={handleUnpublish}
                  disabled={publishMutation.isPending || editing}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-4 py-2 text-xs font-semibold text-foreground transition hover:bg-white/[0.1] disabled:opacity-50"
                >
                  {publishMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />} Unpublish
                </button>
              </>
            ) : (
              <button
                onClick={handlePublish}
                disabled={publishMutation.isPending || editing || !canPublish}
                className="gold-gradient inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold text-primary-foreground transition active:scale-95 disabled:opacity-50"
              >
                {publishMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Publish Agency
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Cover + logo */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={springIn} className="glass mb-5 overflow-hidden rounded-3xl">
        <div className="relative h-40 w-full bg-gradient-to-br from-primary/20 via-primary/5 to-transparent sm:h-52">
          {form.cover_image_url ? <img src={form.cover_image_url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-muted-foreground/40"><Building2 className="h-10 w-10" /></div>}
          {editing && (
            <label className="absolute bottom-3 right-3 cursor-pointer rounded-full bg-black/60 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur transition hover:bg-black/80">
              {uploadingCover ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              <span className="ml-1.5">Cover</span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleImage(e.target.files[0], "cover")} />
            </label>
          )}
        </div>
        <div className="relative px-5 pb-5">
          <div className="-mt-10 flex items-end gap-4">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-4 border-card bg-card">
              {form.logo_url ? <img src={form.logo_url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center bg-primary/15 text-primary"><Building2 className="h-8 w-8" /></div>}
            </div>
            {editing && (
              <label className="mb-1 cursor-pointer rounded-full bg-black/60 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur transition hover:bg-black/80">
                {uploadingLogo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                <span className="ml-1.5">Logo</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleImage(e.target.files[0], "logo")} />
              </label>
            )}
          </div>
          <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              {editing ? <Field label="Agency name" value={form.name} onChange={(v) => set("name", v)} required error={errors.name} /> : <h3 className="font-display text-xl font-extrabold text-foreground">{form.name || "Your agency"}</h3>}
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                {[form.city, form.country].filter(Boolean).join(", ") || "Location not set"}
              </div>
              <div className="mt-2">{verificationBadge()}</div>
            </div>
            <div className="flex items-center gap-2">
              {form.is_published ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-400"><CheckCircle2 className="h-3 w-3" /> Published</span> : <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">Unpublished</span>}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Basic info */}
      <SectionCard title="Basic Information" delay={0.05}>
        <div className="grid gap-4 sm:grid-cols-2">
          {editing ? (
            <>
              <Field label="Agency name" value={form.name} onChange={(v) => set("name", v)} required error={errors.name} />
              <Field label="Official company name" value={form.legal_name} onChange={(v) => set("legal_name", v)} />
              <Field label="Short description" value={form.short_description} onChange={(v) => set("short_description", v)} placeholder="Brief tagline for cards" className="sm:col-span-2" />
              <Field label="Full description" value={form.description} onChange={(v) => set("description", v)} type="textarea" placeholder="Tell clients about your agency…" className="sm:col-span-2" />
              <Field label="Founded year" value={form.founded_year} onChange={(v) => set("founded_year", v)} type="number" error={errors.founded_year} />
              <Field label="Years of experience" value={form.years_experience} onChange={(v) => set("years_experience", v)} type="number" />
              <SelectField label="Country" value={form.country} onChange={(v) => set("country", v)} options={countryOptions} />
              <Field label="City" value={form.city} onChange={(v) => set("city", v)} />
              <Field label="Working hours" value={form.working_hours} onChange={(v) => set("working_hours", v)} placeholder="Mon–Fri 9:00–18:00" className="sm:col-span-2" />
              {/* Specialties */}
              <div className="sm:col-span-2">
                <span className="mb-2 block text-xs font-semibold text-muted-foreground">Specialties</span>
                <div className="flex flex-wrap gap-2">
                  {SPECIALTIES.map((s) => {
                    const on = form.specialties.includes(s);
                    return <button key={s} type="button" onClick={() => toggleArrayItem("specialties", s)} className={cn("rounded-full px-3 py-1.5 text-xs font-semibold transition", on ? "bg-primary text-primary-foreground" : "bg-white/[0.06] text-muted-foreground hover:text-foreground")}>{s}</button>;
                  })}
                </div>
              </div>
              {/* Languages */}
              <div className="sm:col-span-2">
                <span className="mb-2 block text-xs font-semibold text-muted-foreground">Supported languages</span>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGES.map((lang) => {
                    const on = form.supported_languages.includes(lang);
                    return <button key={lang} type="button" onClick={() => toggleArrayItem("supported_languages", lang)} className={cn("rounded-full px-3 py-1.5 text-xs font-semibold transition", on ? "bg-primary text-primary-foreground" : "bg-white/[0.06] text-muted-foreground hover:text-foreground")}>{lang}</button>;
                  })}
                </div>
              </div>
              {/* Destinations */}
              <div className="sm:col-span-2">
                <span className="mb-2 block text-xs font-semibold text-muted-foreground">Destination countries</span>
                <div className="flex flex-wrap gap-2">
                  {COUNTRIES.slice(0, 30).map((c) => {
                    const on = form.destination_countries.includes(c.name);
                    return <button key={c.id} type="button" onClick={() => toggleArrayItem("destination_countries", c.name)} className={cn("rounded-full px-3 py-1.5 text-xs font-semibold transition", on ? "bg-primary text-primary-foreground" : "bg-white/[0.06] text-muted-foreground hover:text-foreground")}>{c.name}</button>;
                  })}
                </div>
              </div>
              {/* Publish status note (publish is managed via the prominent section above) */}
              <div className="rounded-2xl bg-white/[0.03] p-3 text-xs text-muted-foreground sm:col-span-2">
                {form.is_published
                  ? "Your agency is published. Use the Unpublish button above to hide it."
                  : "Your agency is not published. Use the Publish Agency button above to make it visible publicly."}
              </div>
            </>
          ) : (
            <ReadOnlyGrid rows={[
              { icon: FileText, label: "Short description", value: form.short_description || "—" },
              { icon: FileText, label: "Description", value: form.description || "—" },
              { icon: Calendar, label: "Founded year", value: form.founded_year || "—" },
              { icon: Award, label: "Years of experience", value: form.years_experience || "0" },
              { icon: MapPin, label: "Country", value: form.country || "—" },
              { icon: MapPin, label: "City", value: form.city || "—" },
              { icon: Clock, label: "Working hours", value: form.working_hours || "—" },
              { icon: Languages, label: "Languages", value: form.supported_languages.length ? form.supported_languages.join(", ") : "—" },
              { icon: Plane, label: "Destinations", value: form.destination_countries.length ? form.destination_countries.join(", ") : "—" },
              { icon: Award, label: "Specialties", value: form.specialties.length ? form.specialties.join(", ") : "—" },
            ]} />
          )}
        </div>
      </SectionCard>

      {/* Contacts */}
      <SectionCard title="Contacts" delay={0.1}>
        <div className="grid gap-4 sm:grid-cols-2">
          {editing ? (
            <>
              <Field label="Main phone" value={form.contact_phone} onChange={(v) => set("contact_phone", v)} type="tel" error={errors.contact_phone} />
              <Field label="Additional phone" value={form.additional_phone} onChange={(v) => set("additional_phone", v)} type="tel" />
              <Field label="WhatsApp" value={form.whatsapp} onChange={(v) => set("whatsapp", v)} placeholder="+998 90 123 45 67" />
              <Field label="Telegram" value={form.telegram} onChange={(v) => set("telegram", v)} placeholder="@username or link" />
              <Field label="Email" value={form.contact_email} onChange={(v) => set("contact_email", v)} type="email" error={errors.contact_email} />
              <Field label="Website" value={form.website} onChange={(v) => set("website", v)} type="url" placeholder="https://…" error={errors.website} />
            </>
          ) : (
            <ReadOnlyGrid rows={[
              { icon: Phone, label: "Main phone", value: form.contact_phone || "—" },
              { icon: Phone, label: "Additional phone", value: form.additional_phone || "—" },
              { icon: MessageCircle, label: "WhatsApp", value: form.whatsapp || "—" },
              { icon: Send, label: "Telegram", value: form.telegram || "—" },
              { icon: Mail, label: "Email", value: form.contact_email || "—" },
              { icon: Globe, label: "Website", value: form.website || "—" },
            ]} />
          )}
        </div>
      </SectionCard>

      {/* Social links */}
      <SectionCard title="Social Links" delay={0.15}>
        <div className="grid gap-4 sm:grid-cols-2">
          {editing ? (
            <>
              <Field label="Instagram" value={form.social_instagram} onChange={(v) => set("social_instagram", v)} placeholder="https://instagram.com/…" error={errors.social_instagram} />
              <Field label="Facebook" value={form.social_facebook} onChange={(v) => set("social_facebook", v)} placeholder="https://facebook.com/…" error={errors.social_facebook} />
              <Field label="TikTok" value={form.social_tiktok} onChange={(v) => set("social_tiktok", v)} placeholder="https://tiktok.com/@" error={errors.social_tiktok} />
              <Field label="YouTube" value={form.social_youtube} onChange={(v) => set("social_youtube", v)} placeholder="https://youtube.com/@" error={errors.social_youtube} />
              <Field label="Telegram channel" value={form.social_telegram} onChange={(v) => set("social_telegram", v)} placeholder="https://t.me/…" error={errors.social_telegram} />
            </>
          ) : (
            <ReadOnlyGrid rows={[
              { icon: Instagram, label: "Instagram", value: form.social_instagram || "—" },
              { icon: Facebook, label: "Facebook", value: form.social_facebook || "—" },
              { icon: Globe, label: "TikTok", value: form.social_tiktok || "—" },
              { icon: Youtube, label: "YouTube", value: form.social_youtube || "—" },
              { icon: Send, label: "Telegram channel", value: form.social_telegram || "—" },
            ]} />
          )}
        </div>
      </SectionCard>

      {/* Location */}
      <SectionCard title="Location" delay={0.2}>
        <div className="grid gap-4 sm:grid-cols-2">
          {editing ? (
            <>
              <Field label="Full address" value={form.address} onChange={(v) => set("address", v)} className="sm:col-span-2" />
              <Field label="Map link" value={form.map_link} onChange={(v) => set("map_link", v)} placeholder="https://maps.google.com/…" error={errors.map_link} className="sm:col-span-2" />
            </>
          ) : (
            <ReadOnlyGrid rows={[
              { icon: MapPin, label: "Address", value: form.address || "—" },
              { icon: Globe, label: "Map link", value: form.map_link ? "View on map" : "—" },
            ]} />
          )}
        </div>

        {/* Branches */}
        <div className="mt-5">
          <div className="mb-3 flex items-center justify-between">
            <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Branches</h5>
            {editing && <button onClick={addBranch} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/20"><Plus className="h-3 w-3" /> Add branch</button>}
          </div>
          <div className="space-y-3">
            {form.branches.length === 0 && <p className="text-xs text-muted-foreground">No branches added.</p>}
            {form.branches.map((b, idx) => (
              <div key={idx} className="rounded-2xl bg-white/[0.03] p-3">
                {editing ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Branch name" value={b.name} onChange={(v) => updateBranch(idx, "name", v)} />
                    <Field label="Phone" value={b.phone} onChange={(v) => updateBranch(idx, "phone", v)} />
                    <Field label="Address" value={b.address} onChange={(v) => updateBranch(idx, "address", v)} className="sm:col-span-2" />
                    <Field label="Working hours" value={b.working_hours} onChange={(v) => updateBranch(idx, "working_hours", v)} />
                    <Field label="Map link" value={b.map_link} onChange={(v) => updateBranch(idx, "map_link", v)} />
                    <button onClick={() => removeBranch(idx)} className="inline-flex items-center gap-1 text-xs font-semibold text-red-400 transition hover:text-red-300 sm:col-span-2"><Trash2 className="h-3.5 w-3.5" /> Remove branch</button>
                  </div>
                ) : (
                  <div className="text-sm">
                    <p className="font-semibold text-foreground">{b.name || "Branch"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{b.address || "—"}</p>
                    <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                      {b.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {b.phone}</span>}
                      {b.working_hours && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {b.working_hours}</span>}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </SectionCard>

      {/* Agency photos */}
      <SectionCard title="Agency Photos" delay={0.25}>
        <p className="mb-3 text-xs text-muted-foreground">Upload photos of your office, team, and company.</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {form.agency_photos.map((url, idx) => (
            <div key={idx} className="group relative aspect-square overflow-hidden rounded-2xl bg-white/[0.03]">
              <img src={url} alt={`Photo ${idx + 1}`} className="h-full w-full object-cover" />
              {editing && (
                <button onClick={() => removePhoto(idx)} className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-red-400 opacity-0 transition group-hover:opacity-100">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
          {editing && (
            <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/[0.08] bg-white/[0.02] text-muted-foreground transition hover:border-primary/30 hover:text-primary">
              {uploadingPhoto ? <Loader2 className="h-5 w-5 animate-spin" /> : <><ImageIcon className="h-5 w-5" /><span className="text-[10px] font-semibold">Add photo</span></>}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handlePhotoUpload(e.target.files[0])} />
            </label>
          )}
          {form.agency_photos.length === 0 && !editing && <p className="col-span-full text-xs text-muted-foreground">No photos uploaded yet.</p>}
        </div>
      </SectionCard>

      {/* License / Verification */}
      <SectionCard title="License & Verification" delay={0.3}>
        <div className="mb-4">{verificationBadge()}</div>
        <div className="grid gap-4 sm:grid-cols-2">
          {editing ? (
            <>
              <Field label="Tourism license number" value={form.license_number} onChange={(v) => set("license_number", v)} />
              <Field label="Issuing organization" value={form.license_issuing_org} onChange={(v) => set("license_issuing_org", v)} />
              <Field label="License issue date" value={form.license_issue_date} onChange={(v) => set("license_issue_date", v)} type="date" />
              <Field label="License expiry date" value={form.license_expiry_date} onChange={(v) => set("license_expiry_date", v)} type="date" />
              <Field label="Additional license info" value={form.license_info} onChange={(v) => set("license_info", v)} placeholder="Accreditation, regulator…" className="sm:col-span-2" />
              {/* License document upload */}
              <div className="sm:col-span-2">
                <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">Tourism license document (image/PDF)</span>
                <div className="flex items-center gap-3">
                  {form.license_document_url ? (
                    <div className="flex items-center gap-2 rounded-xl bg-white/[0.03] px-3 py-2">
                      <FileText className="h-4 w-4 text-emerald-400" />
                      <span className="text-xs text-muted-foreground">Document uploaded</span>
                      <button type="button" onClick={() => set("license_document_url", "")} className="text-xs text-red-400 hover:text-red-300"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  ) : (
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-white/[0.1]">
                      {uploadingLicenseDoc ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Upload className="h-3.5 w-3.5" /> Upload license</>}
                      <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => e.target.files?.[0] && handleLicenseDocUpload(e.target.files[0])} />
                    </label>
                  )}
                </div>
              </div>
              {/* Registration document upload */}
              <div className="sm:col-span-2">
                <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">Registration document (image/PDF)</span>
                <div className="flex items-center gap-3">
                  {form.registration_document_url ? (
                    <div className="flex items-center gap-2 rounded-xl bg-white/[0.03] px-3 py-2">
                      <FileText className="h-4 w-4 text-emerald-400" />
                      <span className="text-xs text-muted-foreground">Document uploaded</span>
                      <button type="button" onClick={() => set("registration_document_url", "")} className="text-xs text-red-400 hover:text-red-300"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  ) : (
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-white/[0.1]">
                      {uploadingRegDoc ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Upload className="h-3.5 w-3.5" /> Upload registration</>}
                      <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => e.target.files?.[0] && handleRegDocUpload(e.target.files[0])} />
                    </label>
                  )}
                </div>
              </div>
              <div className="rounded-2xl bg-amber-500/[0.06] p-3 text-xs text-amber-200/80 sm:col-span-2">
                <AlertCircle className="mb-1 h-3.5 w-3.5" /> Submitting license info changes your status to "Pending Review". OXEN verifies agencies manually — you will be notified when approved. License and registration documents are private — they will never be shown on your public agency page.
              </div>
            </>
          ) : (
            <ReadOnlyGrid rows={[
              { icon: FileText, label: "License number", value: form.license_number || "—" },
              { icon: Award, label: "Issuing org", value: form.license_issuing_org || "—" },
              { icon: Calendar, label: "Issue date", value: form.license_issue_date || "—" },
              { icon: Calendar, label: "Expiry date", value: form.license_expiry_date || "—" },
              { icon: FileText, label: "Additional info", value: form.license_info || "—" },
              { icon: FileText, label: "License document", value: form.license_document_url ? "Uploaded (private)" : "Not uploaded" },
              { icon: FileText, label: "Registration document", value: form.registration_document_url ? "Uploaded (private)" : "Not uploaded" },
            ]} />
          )}
        </div>
      </SectionCard>
    </DashboardShell>
  );
}

function SectionCard({ title, delay, children }: { title: string; delay: number; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ ...springIn, delay }} className="glass mb-5 rounded-3xl p-5 sm:p-6">
      <h4 className="mb-4 font-display text-sm font-bold text-foreground">{title}</h4>
      {children}
    </motion.div>
  );
}

function ReadOnlyGrid({ rows }: { rows: { icon: typeof Globe; label: string; value: string }[] }) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {rows.map((r) => {
        const Icon = r.icon;
        return (
          <div key={r.label} className="rounded-2xl bg-white/[0.03] p-3">
            <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Icon className="h-3.5 w-3.5" /> {r.label}
            </dt>
            <dd className="mt-1 break-words text-sm text-foreground">{r.value}</dd>
          </div>
        );
      })}
    </dl>
  );
}
