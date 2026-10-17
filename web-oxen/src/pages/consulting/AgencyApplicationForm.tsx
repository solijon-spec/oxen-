import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  Upload,
  Loader2,
  ArrowLeft,
  Check,
  FileText,
  AlertCircle,
  Save,
  Send,
  X,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { useSEO } from "@/hooks/use-seo";
import { toast } from "@/hooks/use-toast";
import {
  createAgencyApplication,
  updateAgencyApplication,
  submitAgencyApplication,
  notifyAdminOfApplication,
  uploadAgencyDocument,
  getSignedDocumentUrl,
  type AgencyApplication,
  type AgencyApplicationInput,
  type AgencyApplicationStatus,
  canEditApplication,
} from "@/lib/agency-applications";
import { COUNTRIES } from "@/data/countries";
import { cn } from "@/lib/utils";

const springIn = {
  type: "spring" as const,
  stiffness: 260,
  damping: 26,
};

interface FormState extends AgencyApplicationInput {}

const EMPTY_FORM: FormState = {
  agency_name: "",
  legal_name: "",
  manager_name: "",
  country: "",
  city: "",
  address: "",
  phone: "",
  email: "",
  website: "",
  logo_url: null,
  social_links: {},
  license_number: "",
  license_issuing_org: "",
  license_issue_date: "",
  license_expiry_date: "",
  license_document_url: null,
  registration_document_url: null,
  additional_documents: [],
  agency_photos: [],
};

/**
 * AgencyApplicationForm — the user-facing tour agency CRM application.
 *
 * Users fill in company info, license info, upload documents, and submit.
 * On submit: status → 'submitted', admin email notification triggered.
 *
 * If the user already has an application, it loads in edit mode
 * (only editable when status is draft/more_info_required/rejected).
 */
export default function AgencyApplicationForm() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const logoRef = useRef<HTMLInputElement>(null);
  const licenseRef = useRef<HTMLInputElement>(null);
  const registrationRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [existingApp, setExistingApp] = useState<AgencyApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingLicense, setUploadingLicense] = useState(false);
  const [uploadingReg, setUploadingReg] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Selected file metadata for display (filename, size, status)
  const [licenseFileMeta, setLicenseFileMeta] = useState<{ name: string; size: number; status: "uploading" | "uploaded" | "error" } | null>(null);
  const [regFileMeta, setRegFileMeta] = useState<{ name: string; size: number; status: "uploading" | "uploaded" | "error" } | null>(null);
  // Signed URL for logo preview (private bucket)
  const [logoSignedUrl, setLogoSignedUrl] = useState<string | null>(null);

  useSEO({
    title: "Apply for OXEN CRM Access",
    description: "Submit your tour agency application for OXEN CRM access.",
  });

  // Load existing application if any
  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      try {
        const { fetchMyAgencyApplication } = await import("@/lib/agency-applications");
        const app = await fetchMyAgencyApplication(user.id);
        if (app) {
          setExistingApp(app);
          setForm({
            agency_name: app.agency_name ?? "",
            legal_name: app.legal_name ?? "",
            manager_name: app.manager_name ?? "",
            country: app.country ?? "",
            city: app.city ?? "",
            address: app.address ?? "",
            phone: app.phone ?? "",
            email: app.email ?? "",
            website: app.website ?? "",
            logo_url: app.logo_url ?? null,
            social_links: app.social_links ?? {},
            license_number: app.license_number ?? "",
            license_issuing_org: app.license_issuing_org ?? "",
            license_issue_date: app.license_issue_date ?? "",
            license_expiry_date: app.license_expiry_date ?? "",
            license_document_url: app.license_document_url ?? null,
            registration_document_url: app.registration_document_url ?? null,
            additional_documents: app.additional_documents ?? [],
            agency_photos: app.agency_photos ?? [],
          });
        } else {
          // Pre-fill email from user
          setForm((prev) => ({ ...prev, email: user.email ?? "", manager_name: user.name ?? "" }));
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  // Fetch signed URL for logo preview whenever logo_url (storage path) changes
  useEffect(() => {
    if (!form.logo_url) {
      setLogoSignedUrl(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const signed = await getSignedDocumentUrl(form.logo_url!);
      if (!cancelled) setLogoSignedUrl(signed);
    })();
    return () => { cancelled = true; };
  }, [form.logo_url]);

  const status: AgencyApplicationStatus | null = existingApp?.status ?? null;
  const isEditable = !status || canEditApplication(status);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key as string]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key as string];
        return next;
      });
    }
  };

  const setSocial = (key: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      social_links: { ...(prev.social_links ?? {}), [key]: value },
    }));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.agency_name.trim()) errs.agency_name = "Agency name is required.";
    if (!form.phone.trim()) errs.phone = "Phone number is required.";
    if (!form.country.trim()) errs.country = "Country is required.";
    if (!form.city.trim()) errs.city = "City is required.";
    if (!form.license_number.trim()) errs.license_number = "License number is required.";
    if (!form.license_document_url) errs.license_document = "Tourism license document is required.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleLogoUpload = async (file: File) => {
    if (!user) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Image too large", description: "Max 2 MB.", variant: "destructive" });
      return;
    }
    setUploadingLogo(true);
    try {
      const { path, error: uploadError } = await uploadAgencyDocument(file, user.id, "logo");
      if (path) {
        set("logo_url", path);
        toast({ title: "Logo uploaded" });
      } else {
        toast({ title: "Logo upload failed", description: uploadError ?? "Unknown error", variant: "destructive" });
      }
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleLicenseUpload = async (file: File) => {
    if (!user) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 10 MB.", variant: "destructive" });
      return;
    }
    // Immediately store file metadata and clear validation error
    setLicenseFileMeta({ name: file.name, size: file.size, status: "uploading" });
    if (errors.license_document) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.license_document;
        return next;
      });
    }
    setUploadingLicense(true);
    try {
      const { path, error: uploadError } = await uploadAgencyDocument(file, user.id, "license");
      if (path) {
        set("license_document_url", path);
        setLicenseFileMeta({ name: file.name, size: file.size, status: "uploaded" });
        toast({ title: "License document uploaded" });
      } else {
        setLicenseFileMeta({ name: file.name, size: file.size, status: "error" });
        toast({ title: "License document upload failed", description: uploadError ?? "Unknown error", variant: "destructive" });
      }
    } catch {
      setLicenseFileMeta({ name: file.name, size: file.size, status: "error" });
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploadingLicense(false);
    }
  };

  const handleRegistrationUpload = async (file: File) => {
    if (!user) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 10 MB.", variant: "destructive" });
      return;
    }
    setRegFileMeta({ name: file.name, size: file.size, status: "uploading" });
    setUploadingReg(true);
    try {
      const { path, error: uploadError } = await uploadAgencyDocument(file, user.id, "registration");
      if (path) {
        set("registration_document_url", path);
        setRegFileMeta({ name: file.name, size: file.size, status: "uploaded" });
        toast({ title: "Registration document uploaded" });
      } else {
        setRegFileMeta({ name: file.name, size: file.size, status: "error" });
        toast({ title: "Registration document upload failed", description: uploadError ?? "Unknown error", variant: "destructive" });
      }
    } catch {
      setRegFileMeta({ name: file.name, size: file.size, status: "error" });
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploadingReg(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!user) return;
    setSaving(true);
    try {
      if (existingApp) {
        const result = await updateAgencyApplication(existingApp.id, form);
        if (result.application) {
          setExistingApp(result.application);
          toast({ title: "Draft saved" });
        } else {
          toast({ title: "Save failed", description: result.error ?? undefined, variant: "destructive" });
        }
      } else {
        const result = await createAgencyApplication(user.id, form);
        if (result.application) {
          setExistingApp(result.application);
          toast({ title: "Draft saved" });
        } else {
          toast({ title: "Save failed", description: result.error ?? undefined, variant: "destructive" });
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!user || !validate()) return;
    setSubmitting(true);
    try {
      let appId = existingApp?.id;

      // Create or update the application
      if (existingApp) {
        const result = await updateAgencyApplication(existingApp.id, form);
        if (result.error) {
          toast({ title: "Failed to save", description: result.error, variant: "destructive" });
          setSubmitting(false);
          return;
        }
        appId = result.application?.id ?? existingApp.id;
      } else {
        const result = await createAgencyApplication(user.id, form);
        if (result.error || !result.application) {
          toast({ title: "Failed to create application", description: result.error ?? undefined, variant: "destructive" });
          setSubmitting(false);
          return;
        }
        appId = result.application.id;
      }

      if (!appId) {
        toast({ title: "Application ID missing", variant: "destructive" });
        setSubmitting(false);
        return;
      }

      // Submit — change status to 'submitted'
      const submitResult = await submitAgencyApplication(appId);
      if (submitResult.error || !submitResult.application) {
        toast({ title: "Submit failed", description: submitResult.error ?? undefined, variant: "destructive" });
        setSubmitting(false);
        return;
      }

      setExistingApp(submitResult.application);

      // Trigger admin email notification (non-blocking — application is already submitted)
      notifyAdminOfApplication(appId).catch((err) => {
        console.error("Admin notification failed:", err);
      });

      toast({
        title: "Application submitted!",
        description: "OXEN will review your application. You'll be notified once approved.",
      });

      // Navigate to the status page
      navigate("/consulting/application-status", { replace: true });
    } catch (err) {
      toast({
        title: "Submission error",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If not editable (submitted/under_review/approved), redirect to status page
  if (status && !isEditable) {
    navigate("/consulting/application-status", { replace: true });
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-white/[0.06]">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-5">
          <button
            onClick={() => navigate("/consulting/workspace")}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">
              {existingApp ? "Edit Application" : "Apply for OXEN CRM Access"}
            </h1>
            <p className="text-xs text-muted-foreground">
              Submit your tour agency information for review
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-8">
        {/* More info required banner */}
        {status === "more_info_required" && existingApp?.owner_request_message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-xl border border-purple-500/25 bg-purple-500/[0.06] p-4"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-purple-400" />
              <div>
                <p className="font-semibold text-purple-300">More information required</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {existingApp.owner_request_message}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Rejection banner */}
        {status === "rejected" && existingApp?.rejection_reason && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-xl border border-destructive/25 bg-destructive/[0.06] p-4"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
              <div>
                <p className="font-semibold text-destructive">Application was not approved</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {existingApp.rejection_reason}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  You can edit and resubmit your application below.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springIn}
          className="space-y-6"
        >
          {/* A. Agency Information */}
          <FormSection title="Agency Information" icon={Building2}>
            {/* Logo */}
            <div className="mb-5 flex flex-col items-center">
              <button
                onClick={() => logoRef.current?.click()}
                disabled={uploadingLogo || !isEditable}
                className="group relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.02] transition hover:border-primary/30 disabled:opacity-50"
              >
                {logoSignedUrl ? (
                  <img src={logoSignedUrl} alt="" className="h-full w-full object-cover" />
                ) : uploadingLogo ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-muted-foreground">
                    <Upload className="h-5 w-5" />
                    <span className="text-[9px]">Logo</span>
                  </div>
                )}
              </button>
              <input
                ref={logoRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleLogoUpload(file);
                }}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Agency Name"
                required
                error={errors.agency_name}
                value={form.agency_name}
                onChange={(v) => set("agency_name", v)}
                placeholder="e.g. Global Travel & Tours"
                disabled={!isEditable}
              />
              <FormField
                label="Official Legal Name"
                value={form.legal_name ?? ""}
                onChange={(v) => set("legal_name", v)}
                placeholder="e.g. Global Travel & Tours LLC"
                disabled={!isEditable}
              />
              <FormField
                label="Manager / Responsible Person"
                value={form.manager_name ?? ""}
                onChange={(v) => set("manager_name", v)}
                placeholder="Full name"
                disabled={!isEditable}
              />
              <FormField
                label="Phone"
                required
                error={errors.phone}
                value={form.phone ?? ""}
                onChange={(v) => set("phone", v)}
                placeholder="+1 555 0100"
                disabled={!isEditable}
              />
              <FormField
                label="Email"
                type="email"
                value={form.email ?? ""}
                onChange={(v) => set("email", v)}
                placeholder="agency@example.com"
                disabled={!isEditable}
              />
              <FormField
                label="Website"
                value={form.website ?? ""}
                onChange={(v) => set("website", v)}
                placeholder="https://..."
                disabled={!isEditable}
              />
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-muted-foreground">
                  Country <span className="text-destructive">*</span>
                </label>
                <select
                  value={form.country ?? ""}
                  onChange={(e) => set("country", e.target.value)}
                  disabled={!isEditable}
                  className={cn(
                    "w-full rounded-xl border bg-white/[0.03] px-4 py-3 text-sm text-foreground focus:outline-none",
                    errors.country ? "border-destructive/40" : "border-white/[0.06] focus:border-primary/40",
                  )}
                >
                  <option value="">Select country…</option>
                  {COUNTRIES.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
                {errors.country && <p className="mt-1 text-xs text-destructive">{errors.country}</p>}
              </div>
              <FormField
                label="City"
                required
                error={errors.city}
                value={form.city ?? ""}
                onChange={(v) => set("city", v)}
                placeholder="e.g. Tashkent"
                disabled={!isEditable}
              />
            </div>

            <div className="mt-4">
              <FormField
                label="Address"
                value={form.address ?? ""}
                onChange={(v) => set("address", v)}
                placeholder="Street address"
                disabled={!isEditable}
              />
            </div>

            {/* Social links */}
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <FormField
                label="Instagram"
                value={form.social_links?.instagram ?? ""}
                onChange={(v) => setSocial("instagram", v)}
                placeholder="@username"
                disabled={!isEditable}
              />
              <FormField
                label="Telegram"
                value={form.social_links?.telegram ?? ""}
                onChange={(v) => setSocial("telegram", v)}
                placeholder="@username"
                disabled={!isEditable}
              />
              <FormField
                label="WhatsApp"
                value={form.social_links?.whatsapp ?? ""}
                onChange={(v) => setSocial("whatsapp", v)}
                placeholder="+1 555 0100"
                disabled={!isEditable}
              />
            </div>
          </FormSection>

          {/* B. License Information */}
          <FormSection title="License Information" icon={FileText}>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="License Number"
                required
                error={errors.license_number}
                value={form.license_number ?? ""}
                onChange={(v) => set("license_number", v)}
                placeholder="e.g. TL-2024-001"
                disabled={!isEditable}
              />
              <FormField
                label="Issuing Organization"
                value={form.license_issuing_org ?? ""}
                onChange={(v) => set("license_issuing_org", v)}
                placeholder="e.g. Ministry of Tourism"
                disabled={!isEditable}
              />
              <FormField
                label="Issue Date"
                type="date"
                value={form.license_issue_date ?? ""}
                onChange={(v) => set("license_issue_date", v)}
                disabled={!isEditable}
              />
              <FormField
                label="Expiry Date"
                type="date"
                value={form.license_expiry_date ?? ""}
                onChange={(v) => set("license_expiry_date", v)}
                disabled={!isEditable}
              />
            </div>
          </FormSection>

          {/* C. Documents */}
          <FormSection title="Documents" icon={Upload}>
            <p className="mb-4 text-xs text-muted-foreground">
              These documents are private and will only be reviewed by authorized OXEN administrators.
            </p>

            <div className="space-y-3">
              {/* License document */}
              <DocumentUpload
                label="Tourism License Document"
                required
                error={errors.license_document}
                hasFile={!!form.license_document_url}
                uploading={uploadingLicense}
                disabled={!isEditable}
                fileMeta={licenseFileMeta}
                onUpload={() => licenseRef.current?.click()}
                onClear={() => {
                  set("license_document_url", null);
                  setLicenseFileMeta(null);
                }}
              />
              <input
                ref={licenseRef}
                type="file"
                accept=".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleLicenseUpload(file);
                  // Reset input so selecting the same file again still fires onChange
                  e.target.value = "";
                }}
              />

              {/* Registration document */}
              <DocumentUpload
                label="Company Registration Document"
                hasFile={!!form.registration_document_url}
                uploading={uploadingReg}
                disabled={!isEditable}
                fileMeta={regFileMeta}
                onUpload={() => registrationRef.current?.click()}
                onClear={() => {
                  set("registration_document_url", null);
                  setRegFileMeta(null);
                }}
              />
              <input
                ref={registrationRef}
                type="file"
                accept=".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleRegistrationUpload(file);
                  e.target.value = "";
                }}
              />
            </div>
          </FormSection>

          {/* Actions */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={handleSubmit}
              disabled={submitting || !isEditable}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting…
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Submit Application
                </>
              )}
            </button>
            <button
              onClick={handleSaveDraft}
              disabled={saving || !isEditable}
              className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-6 py-3.5 text-sm font-semibold text-muted-foreground transition hover:text-foreground disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Draft
            </button>
            <button
              onClick={() => navigate("/consulting/workspace")}
              disabled={submitting}
              className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-6 py-3.5 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────

function FormSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
      <div className="mb-5 flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <h2 className="font-display text-sm font-bold text-foreground">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function FormField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required,
  error,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-muted-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "w-full rounded-xl border bg-white/[0.03] px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none disabled:opacity-60",
          error ? "border-destructive/40 focus:border-destructive" : "border-white/[0.06] focus:border-primary/40",
        )}
      />
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DocumentUpload({
  label,
  required,
  error,
  hasFile,
  uploading,
  disabled,
  fileMeta,
  onUpload,
  onClear,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hasFile: boolean;
  uploading: boolean;
  disabled: boolean;
  fileMeta: { name: string; size: number; status: "uploading" | "uploaded" | "error" } | null;
  onUpload: () => void;
  onClear: () => void;
}) {
  // A file is present if hasFile is true AND fileMeta is not in error state
  const filePresent = hasFile && (!fileMeta || fileMeta.status !== "error");
  const showError = error && !filePresent;

  return (
    <div>
      <p className="mb-1.5 text-sm font-semibold text-muted-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </p>
      <div
        className={cn(
          "flex items-center gap-3 rounded-xl border p-3 transition-colors",
          showError ? "border-destructive/40" : filePresent ? "border-emerald-500/30" : "border-white/[0.06]",
        )}
      >
        {filePresent ? (
          <>
            {/* Status icon */}
            {fileMeta?.status === "uploading" || uploading ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-amber-400" />
            ) : fileMeta?.status === "error" ? (
              <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
            ) : (
              <Check className="h-4 w-4 shrink-0 text-emerald-400" />
            )}

            {/* Filename + size + status */}
            <div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
              <span className="truncate text-xs font-medium text-foreground">
                {fileMeta?.name ?? "Document uploaded"}
              </span>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                {fileMeta && <span>{formatFileSize(fileMeta.size)}</span>}
                <span
                  className={cn(
                    "font-semibold",
                    fileMeta?.status === "uploading" || uploading
                      ? "text-amber-400"
                      : fileMeta?.status === "error"
                        ? "text-destructive"
                        : "text-emerald-400",
                  )}
                >
                  {fileMeta?.status === "uploading" || uploading
                    ? "Uploading…"
                    : fileMeta?.status === "error"
                      ? "Upload failed"
                      : "Uploaded"}
                </span>
              </div>
            </div>

            {/* Actions */}
            {!disabled && (
              <div className="flex items-center gap-2">
                <button
                  onClick={onUpload}
                  className="text-xs font-semibold text-primary transition hover:text-primary/80"
                >
                  Replace
                </button>
                <button
                  onClick={onClear}
                  className="flex h-6 w-6 items-center justify-center rounded-lg text-muted-foreground transition hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </>
        ) : (
          <button
            onClick={onUpload}
            disabled={disabled}
            className="flex flex-1 items-center gap-2 text-xs font-semibold text-primary transition hover:text-primary/80 disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
            Upload document
            <span className="ml-1 text-[10px] font-normal text-muted-foreground">PNG, JPG, JPEG, or PDF · Max 10 MB</span>
          </button>
        )}
      </div>
      {showError && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
