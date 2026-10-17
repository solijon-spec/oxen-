import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Settings as SettingsIcon,
  Globe,
  Bell,
  Shield,
  Sliders,
  Loader2,
  Check,
  Monitor,
  Lock,
  Building2,
  UserCog,
  CreditCard,
  ChevronRight,
  Target,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

import { DashboardShell } from "@/components/consulting/DashboardShell";
import { SelectField } from "@/components/consulting/Field";
import { useConsulting } from "@/contexts/ConsultingContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSEO } from "@/hooks/use-seo";
import { fetchSettings, upsertSettings, type SettingsInput } from "@/lib/crm-extras";
import { cn } from "@/lib/utils";

const MANAGE_LINKS = [
  { to: "/consulting/company-profile", label: "Agency Profile", description: "Logo, description, contact info", icon: Building2 },
  { to: "/consulting/employees", label: "Employees", description: "Invite staff, manage roles", icon: UserCog },
  { to: "/consulting/subscription", label: "Subscription", description: "Plan, billing history", icon: CreditCard },
  { to: "/consulting/kpi", label: "KPI Targets", description: "Monthly sales targets per employee & tour type", icon: Target },
];

function ManageLinks() {
  const navigate = useNavigate();
  return (
    <div className="mb-4 grid gap-2.5 sm:grid-cols-3">
      {MANAGE_LINKS.map((link) => {
        const Icon = link.icon;
        return (
          <button
            key={link.to}
            onClick={() => navigate(link.to)}
            className="glass flex items-center gap-3 rounded-2xl p-4 text-left transition hover:border-white/[0.12]"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-foreground">{link.label}</p>
              <p className="truncate text-[11px] text-muted-foreground">{link.description}</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50" />
          </button>
        );
      })}
    </div>
  );
}

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "ru", label: "Русский" },
  { value: "uz", label: "O'zbekcha" },
];

const CURRENCIES = ["USD", "EUR", "GBP", "AED", "RUB", "UZS", "JPY"];

const TIMEZONES = [
  "UTC",
  "Europe/London",
  "Europe/Moscow",
  "Asia/Tashkent",
  "Asia/Dubai",
  "Asia/Tokyo",
  "America/New_York",
  "America/Los_Angeles",
];

const DATE_FORMATS = [
  { value: "MMM D, YYYY", label: "Jan 15, 2025" },
  { value: "DD/MM/YYYY", label: "15/01/2025" },
  { value: "MM/DD/YYYY", label: "01/15/2025" },
  { value: "YYYY-MM-DD", label: "2025-01-15" },
];

const DASHBOARD_PERIODS = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "3months", label: "Last 3 Months" },
  { value: "year", label: "This Year" },
];

function ToggleRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-[11px] text-muted-foreground">{description}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition",
          value ? "bg-primary" : "bg-white/[0.1]",
        )}
      >
        <motion.span
          layout
          transition={{ type: "spring", stiffness: 400, damping: 28 }}
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow",
            value ? "right-0.5" : "left-0.5",
          )}
        />
      </button>
    </div>
  );
}

function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <h3 className="font-display text-sm font-bold text-foreground">{title}</h3>
      </div>
      {children}
    </div>
  );
}

export default function Settings() {
  useSEO({ title: "Settings | OXEN CRM", description: "Configure your CRM and agency settings." });
  const { company, can } = useConsulting();
  const canWrite = can("settings:write");
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const companyId = company?.id ?? "";

  const { data: settings, isLoading } = useQuery({
    queryKey: ["consulting-settings", companyId],
    queryFn: () => fetchSettings(companyId),
    enabled: !!companyId,
    staleTime: 30_000,
    retry: false,
  });

  const [form, setForm] = useState<SettingsInput>({
    crm_language: "en",
    currency: "USD",
    timezone: "UTC",
    notify_new_client: true,
    notify_new_application: true,
    notify_tour_inquiry: true,
    notify_review: true,
    notify_employee_activity: true,
    default_dashboard_period: "month",
    default_currency: "USD",
    date_format: "MMM D, YYYY",
  });

  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) {
      setForm({
        crm_language: settings.crm_language,
        currency: settings.currency,
        timezone: settings.timezone,
        notify_new_client: settings.notify_new_client,
        notify_new_application: settings.notify_new_application,
        notify_tour_inquiry: settings.notify_tour_inquiry,
        notify_review: settings.notify_review,
        notify_employee_activity: settings.notify_employee_activity,
        default_dashboard_period: settings.default_dashboard_period,
        default_currency: settings.default_currency,
        date_format: settings.date_format,
      });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: () => upsertSettings(companyId, form),
    onSuccess: () => {
      toast.success("Settings saved successfully.");
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ["consulting-settings"] });
      setTimeout(() => setSaved(false), 2000);
    },
    onError: () => toast.error("Failed to save settings."),
  });

  if (isLoading) {
    return (
      <DashboardShell title="Settings" subtitle="Configure your CRM and agency preferences">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      title="Settings"
      subtitle="Configure your CRM and agency preferences"
      actions={
        canWrite && (
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="gold-gradient flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-primary-foreground transition active:scale-95 disabled:opacity-50"
          >
            {saved ? <Check className="h-4 w-4" /> : saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {saved ? "Saved" : "Save Settings"}
          </button>
        )
      }
    >
      <div className="space-y-4">
        <ManageLinks />

        {/* GENERAL */}
        <SectionCard icon={Globe} title="General">
          <div className="grid gap-4 sm:grid-cols-3">
            <SelectField
              label="CRM Language"
              value={form.crm_language ?? "en"}
              onChange={(v) => setForm((f) => ({ ...f, crm_language: v }))}
              options={LANGUAGES}
            />
            <SelectField
              label="Currency"
              value={form.currency ?? "USD"}
              onChange={(v) => setForm((f) => ({ ...f, currency: v }))}
              options={CURRENCIES.map((c) => ({ value: c, label: c }))}
            />
            <SelectField
              label="Time Zone"
              value={form.timezone ?? "UTC"}
              onChange={(v) => setForm((f) => ({ ...f, timezone: v }))}
              options={TIMEZONES.map((tz) => ({ value: tz, label: tz.replace(/_/g, " ") }))}
            />
          </div>
        </SectionCard>

        {/* NOTIFICATIONS */}
        <SectionCard icon={Bell} title="Notifications">
          <div className="divide-y divide-white/[0.04]">
            <ToggleRow
              label="New Client"
              description="Get notified when a new client is added"
              value={form.notify_new_client ?? true}
              onChange={(v) => setForm((f) => ({ ...f, notify_new_client: v }))}
            />
            <ToggleRow
              label="New Application"
              description="Get notified when a new application is created"
              value={form.notify_new_application ?? true}
              onChange={(v) => setForm((f) => ({ ...f, notify_new_application: v }))}
            />
            <ToggleRow
              label="Tour Inquiry"
              description="Get notified when someone inquires about a tour"
              value={form.notify_tour_inquiry ?? true}
              onChange={(v) => setForm((f) => ({ ...f, notify_tour_inquiry: v }))}
            />
            <ToggleRow
              label="New Review"
              description="Get notified when a new review is posted"
              value={form.notify_review ?? true}
              onChange={(v) => setForm((f) => ({ ...f, notify_review: v }))}
            />
            <ToggleRow
              label="Employee Activity"
              description="Get notified about employee actions"
              value={form.notify_employee_activity ?? true}
              onChange={(v) => setForm((f) => ({ ...f, notify_employee_activity: v }))}
            />
          </div>
        </SectionCard>

        {/* CRM PREFERENCES */}
        <SectionCard icon={Sliders} title="CRM Preferences">
          <div className="grid gap-4 sm:grid-cols-3">
            <SelectField
              label="Default Dashboard Period"
              value={form.default_dashboard_period ?? "month"}
              onChange={(v) => setForm((f) => ({ ...f, default_dashboard_period: v }))}
              options={DASHBOARD_PERIODS}
            />
            <SelectField
              label="Default Currency"
              value={form.default_currency ?? "USD"}
              onChange={(v) => setForm((f) => ({ ...f, default_currency: v }))}
              options={CURRENCIES.map((c) => ({ value: c, label: c }))}
            />
            <SelectField
              label="Date Format"
              value={form.date_format ?? "MMM D, YYYY"}
              onChange={(v) => setForm((f) => ({ ...f, date_format: v }))}
              options={DATE_FORMATS}
            />
          </div>
        </SectionCard>

        {/* SECURITY */}
        <SectionCard icon={Shield} title="Security">
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Lock className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">Account</p>
                <p className="truncate text-[11px] text-muted-foreground">{user?.email}</p>
              </div>
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-400">
                Google
              </span>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Monitor className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">Session</p>
                <p className="text-[11px] text-muted-foreground">Authenticated via Google OAuth</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <SettingsIcon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">Login & Security</p>
                <p className="text-[11px] text-muted-foreground">Manage password, 2FA, and active devices in your Profile settings</p>
              </div>
              <a
                href="/settings/change-password"
                className="shrink-0 rounded-lg bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-white/[0.08]"
              >
                Manage
              </a>
            </div>
          </div>
        </SectionCard>

        {/* AGENCY PREFERENCES note */}
        <div className="glass rounded-2xl p-4">
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Agency:</span> {company?.name} — Settings above apply to this active agency. Switch agencies from the sidebar to configure a different one.
          </p>
        </div>
      </div>
    </DashboardShell>
  );
}
