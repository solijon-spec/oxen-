import { motion, AnimatePresence } from "framer-motion";
import { useState, useCallback, useRef, useEffect, type ReactNode } from "react";
import {
  X, UserPen, Camera, AtSign, FileText, Mail, Phone, Lock,
  ShieldCheck, MonitorSmartphone, Activity, Fingerprint,
  Bell, BellRing, Globe2, Moon, Sun, Palette, Ruler, DollarSign,
  Clock, Trash2, Download, FileUp, HelpCircle, MessageCircle,
  AlertTriangle, Info, ChevronRight, Check, Languages, LogOut,
  Shield, MessageSquare, Wifi, WifiOff, RefreshCw, Crown,
  GraduationCap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/contexts/AuthContext";
import { useLanguage, type Language } from "@/contexts/LanguageContext";
import { useTheme, type Theme } from "@/contexts/ThemeContext";
import { useSocial } from "@/contexts/SocialContext";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { useOffline } from "@/contexts/OfflineContext";
import { usePreferences, CURRENCIES } from "@/contexts/PreferencesContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import LogoutDialog from "@/components/LogoutDialog";
import { checkOwnerAccess } from "@/lib/owner-admin";

/**
 * Owner email allowlist — the two accounts permitted to see the
 * Owner Panel button and access /owner-admin. Checked client-side
 * so the entry point works even before the owner_admins migration
 * has been applied. The server-side RLS / checkOwnerAccess() check
 * remains the authoritative gate; this list only unlocks the entry
 * button and route for the two known owner emails.
 */
const OWNER_EMAILS = new Set([
  "solisulhiddinov@gmail.com",
  "az1mboevvv@gmail.com",
]);
export function isOwnerEmail(email: string | undefined | null): boolean {
  return !!email && OWNER_EMAILS.has(email.trim().toLowerCase());
}

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const panelVariants = {
  hidden: { x: "100%", opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { type: "spring" as const, stiffness: 300, damping: 32, mass: 0.9 },
  },
  exit: {
    x: "100%",
    opacity: 0,
    transition: { type: "spring" as const, stiffness: 350, damping: 34, mass: 0.9 },
  },
};

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};



function SectionHeader({ children }: { children: ReactNode }) {
  return (
    <h3 className="px-1 pt-6 pb-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
      {children}
    </h3>
  );
}

function SettingsRow({
  icon: Icon,
  label,
  value,
  onClick,
  destructive,
  trailing,
}: {
  icon: typeof UserPen;
  label: string;
  value?: string;
  onClick?: () => void;
  destructive?: boolean;
  trailing?: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
        "hover:bg-white/[0.04] active:scale-[0.98]",
        destructive && "text-destructive",
        !destructive && "text-foreground",
      )}
    >
      <span className={cn(
        "flex h-8 w-8 items-center justify-center rounded-lg",
        destructive ? "bg-destructive/10 text-destructive" : "bg-white/[0.06] text-muted-foreground",
      )}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="flex-1 min-w-0">
        <div className={cn("text-sm font-medium", destructive && "text-destructive")}>{label}</div>
        {value && <div className="text-xs text-muted-foreground truncate">{value}</div>}
      </div>
      {trailing ?? <ChevronRight className="h-4 w-4 text-muted-foreground/50" />}
    </button>
  );
}

function ToggleRow({
  icon: Icon,
  label,
  value,
  onChange,
}: {
  icon: typeof Bell;
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06] text-muted-foreground">
        <Icon className="h-4 w-4" />
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{label}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={cn(
          "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 focus-visible:ring-offset-background",
          value ? "bg-primary" : "bg-white/[0.12]",
        )}
      >
        <span
          className={cn(
            "inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200",
            value ? "translate-x-6" : "translate-x-1",
          )}
        />
      </button>
    </div>
  );
}

export default function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { theme, setTheme } = useTheme();
  type Theme = "dark" | "light";
  const { totalUnread } = useSocial();
  const { replayTutorial } = useOnboarding();
  const { isOffline, forceOffline, setForceOffline, pendingSync, isOnline, sync, lastSyncedAt } = useOffline();
  const { currency, currencyMeta, distanceUnit, setDistanceUnit, timezone } = usePreferences();

  // Owner access check — only the two seeded owner emails see the Owner Panel button.
  // The allowlist lives in `owner_admins` (RLS-protected); this query returns
  // `{ is_owner: false }` for everyone else. Never exposed in the public UI.
  const { data: ownerAccess } = useQuery({
    queryKey: ["owner-access-settings", user?.id],
    queryFn: () => checkOwnerAccess(),
    enabled: !!user && !user.isGuest,
    staleTime: 5 * 60_000,
    retry: false,
  });
  const isOwner = !!ownerAccess?.is_owner || isOwnerEmail(user?.email);

  // Privacy toggles
  const [privateAccount, setPrivateAccount] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [showFollowers, setShowFollowers] = useState(true);
  const [pushNotif, setPushNotif] = useState(true);
  const [emailNotif, setEmailNotif] = useState(true);
  const [travelAlerts, setTravelAlerts] = useState(true);
  const [aiRecs, setAiRecs] = useState(true);

  const panelRef = useRef<HTMLDivElement>(null);

  // ESC to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // Swipe right to close (mobile)
  useEffect(() => {
    if (!isOpen || !panelRef.current) return;
    let startX = 0;
    const el = panelRef.current;
    const onTouchStart = (e: TouchEvent) => { startX = e.touches[0].clientX; };
    const onTouchEnd = (e: TouchEvent) => {
      if (e.changedTouches[0].clientX - startX > 60) onClose();
    };
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [isOpen, onClose]);

  const [logoutDialogOpen, setLogoutDialogOpen] = useState<boolean>(false);

  const handleSignOut = useCallback(() => {
    setLogoutDialogOpen(true);
  }, []);

  if (!user) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            key="settings-overlay"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
            style={{ willChange: "opacity" }}
          />

          {/* Panel */}
          <motion.div
            ref={panelRef}
            key="settings-panel"
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[360px] flex-col shadow-2xl sm:max-w-[380px]"
            style={{ willChange: "transform, opacity" }}
          >
            {/* Glass bg */}
            <div className="absolute inset-0 rounded-l-[28px] bg-[hsl(225,42%,7%)]/[0.96] backdrop-blur-[40px] saturate-[1.8] border-l border-white/[0.06]" />

            {/* Header */}
            <div className="relative z-10 flex items-center justify-between px-4 pt-5 pb-3 sm:px-5">
              <div>
                <h2 className="font-display text-lg font-bold">{t("settings.title", "Profile Settings")}</h2>
                <p className="text-xs text-muted-foreground">{t("settings.subtitle", "Customize your OXEN experience")}</p>
              </div>
              <button
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] text-muted-foreground transition-colors hover:bg-white/[0.12] hover:text-foreground active:scale-90"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="relative z-10 flex-1 overflow-y-auto no-scrollbar pb-8">
              {/* ── ACCOUNT ── */}
              <SectionHeader>{t("settings.account", "Account")}</SectionHeader>
              <div className="mx-2 rounded-2xl bg-white/[0.03] border border-white/[0.04] overflow-hidden divide-y divide-white/[0.04]">
                <SettingsRow icon={UserPen} label={t("settings.editProfile", "Edit Profile")} onClick={() => { onClose(); navigate("/profile/edit"); }} />
                <SettingsRow icon={MessageSquare} label={t("settings.messages", "Messages")} value={totalUnread > 0 ? `${totalUnread} ${t("settings.unread", "unread")}` : t("settings.caughtUp", "All caught up")} onClick={() => { onClose(); navigate("/messages"); }} />
                <SettingsRow icon={Shield} label={t("settings.admin", "Admin Dashboard")} onClick={() => { onClose(); navigate("/admin"); }} />
                {isOwner && (
                  <SettingsRow
                    icon={Crown}
                    label="Owner Panel"
                    value="Private admin access"
                    onClick={() => { onClose(); navigate("/owner-admin"); }}
                  />
                )}
                <SettingsRow icon={AtSign} label={t("settings.username", "Username")} value={`@${user.name.toLowerCase().replace(/\s+/g, "_")}`} />
                <SettingsRow icon={Mail} label={t("settings.email", "Email Address")} value={user.email} />
              </div>

              {/* ── PRIVACY ── */}
              <SectionHeader>{t("settings.privacy", "Privacy")}</SectionHeader>
              <div className="mx-2 rounded-2xl bg-white/[0.03] border border-white/[0.04] overflow-hidden divide-y divide-white/[0.04]">
                <ToggleRow icon={Lock} label={t("settings.privateAccount", "Private Account")} value={privateAccount} onChange={setPrivateAccount} />
                <ToggleRow icon={Mail} label={t("settings.showEmail", "Show Email")} value={showEmail} onChange={setShowEmail} />
                <ToggleRow icon={Activity} label={t("settings.showFollowers", "Show Followers")} value={showFollowers} onChange={setShowFollowers} />
                <SettingsRow icon={MessageCircle} label={t("settings.allowMessages", "Allow Messages")} />
                <SettingsRow icon={ShieldCheck} label={t("settings.blockedUsers", "Blocked Users")} onClick={() => { onClose(); navigate("/settings/blocked-users"); }} />
              </div>

              {/* ── SECURITY ── */}
              <SectionHeader>{t("settings.security", "Security")}</SectionHeader>
              <div className="mx-2 rounded-2xl bg-white/[0.03] border border-white/[0.04] overflow-hidden divide-y divide-white/[0.04]">
                <SettingsRow icon={Lock} label={t("settings.changePassword", "Change Password")} onClick={() => { onClose(); navigate("/settings/change-password"); }} />
                <SettingsRow icon={ShieldCheck} label={t("settings.twoFactor", "Two-Factor Authentication")} onClick={() => { onClose(); navigate("/settings/two-factor"); }} />
                <SettingsRow icon={MonitorSmartphone} label={t("settings.activeDevices", "Active Devices")} onClick={() => { onClose(); navigate("/settings/active-devices"); }} />
                <SettingsRow icon={Activity} label={t("settings.loginActivity", "Login Activity")} onClick={() => { onClose(); navigate("/settings/login-activity"); }} />
                <SettingsRow icon={Fingerprint} label={t("settings.biometrics", "Face ID / Touch ID")} onClick={() => { onClose(); navigate("/settings/biometrics"); }} />
              </div>

              {/* ── NOTIFICATIONS ── */}
              <SectionHeader>{t("settings.notifications", "Notifications")}</SectionHeader>
              <div className="mx-2 rounded-2xl bg-white/[0.03] border border-white/[0.04] overflow-hidden divide-y divide-white/[0.04]">
                <ToggleRow icon={pushNotif ? BellRing : Bell} label={t("settings.pushNotif", "Push Notifications")} value={pushNotif} onChange={setPushNotif} />
                <ToggleRow icon={Mail} label={t("settings.emailNotif", "Email Notifications")} value={emailNotif} onChange={setEmailNotif} />
                <ToggleRow icon={Globe2} label={t("settings.travelAlerts", "Travel Alerts")} value={travelAlerts} onChange={setTravelAlerts} />
                <ToggleRow icon={Bell} label={t("settings.aiRecs", "AI Recommendations")} value={aiRecs} onChange={setAiRecs} />
              </div>

              {/* ── LANGUAGE ── */}
              <SettingsRow icon={Languages} label={t("profile.language", "Language")} value={language.toUpperCase()} onClick={() => { onClose(); navigate("/settings/language"); }} />

              {/* ── APPEARANCE ── */}
              <SectionHeader>{t("settings.appearance", "Appearance")}</SectionHeader>
              <div className="mx-2 rounded-2xl bg-white/[0.03] border border-white/[0.04] overflow-hidden divide-y divide-white/[0.04]">
                {([
                  { value: "dark" as Theme, label: t("settings.darkMode", "Dark Mode"), icon: Moon },
                  { value: "light" as Theme, label: t("settings.lightMode", "Light Mode"), icon: Sun },
                ]).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setTheme(opt.value);
                      toast({ title: t("settings.themeSaved", "Theme saved"), description: t("settings.themeSavedDesc", "Your theme preference has been saved.") });
                    }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.04] active:scale-[0.98]"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06] text-muted-foreground">
                      <opt.icon className="h-4 w-4" />
                    </span>
                    <span className="flex-1 text-sm font-medium">{opt.label}</span>
                    {theme === opt.value && <Check className="h-4 w-4 text-primary" />}
                  </button>
                ))}
              </div>

              {/* ── OFFLINE MODE ── */}
              <SectionHeader>{t("settings.offline", "Offline Mode")}</SectionHeader>
              <div className="mx-2 rounded-2xl bg-white/[0.03] border border-white/[0.04] overflow-hidden divide-y divide-white/[0.04]">
                <ToggleRow
                  icon={forceOffline ? WifiOff : Wifi}
                  label={t("settings.forceOffline", "Force Offline Mode")}
                  value={forceOffline}
                  onChange={(v) => {
                    setForceOffline(v);
                    toast({ title: v ? t("settings.offlineEnabled", "Offline mode enabled") : t("settings.offlineDisabled", "Online mode restored"), description: v ? t("settings.offlineChanges", "Changes will sync when you go online") : undefined });
                  }}
                />
                <SettingsRow
                  icon={isOnline && !forceOffline ? Wifi : WifiOff}
                  label={t("settings.connectionStatus", "Connection Status")}
                  value={isOffline ? t("settings.offlineStatus", "Offline") : t("settings.online", "Online")}
                  onClick={() => { onClose(); navigate("/settings/connection"); }}
                />
                {pendingSync && (
                  <SettingsRow
                    icon={RefreshCw}
                    label={t("settings.pendingSync", "Pending Sync")}
                    value="Changes waiting to sync"
                    onClick={() => { sync(); toast({ title: t("settings.syncing", "Syncing…") }); }}
                  />
                )}
                {lastSyncedAt && (
                  <SettingsRow
                    icon={Clock}
                    label={t("settings.lastSynced", "Last Synced")}
                    value={new Date(lastSyncedAt).toLocaleString()}
                  />
                )}
              </div>

              {/* ── TRAVEL SETTINGS ── */}
              <SectionHeader>{t("settings.travel", "Travel Settings")}</SectionHeader>
              <div className="mx-2 rounded-2xl bg-white/[0.03] border border-white/[0.04] overflow-hidden divide-y divide-white/[0.04]">
                <SettingsRow icon={Ruler} label={t("settings.distanceUnit", "Distance Unit")} value={distanceUnit === "km" ? t("settings.kilometers", "Kilometers") : t("settings.miles", "Miles")} onClick={() => { onClose(); navigate("/settings/distance-unit"); }} trailing={<span className="text-xs text-muted-foreground">{distanceUnit === "km" ? "km" : "mi"}</span>} />
                <SettingsRow icon={DollarSign} label={t("settings.currency", "Currency")} value={`${currencyMeta.symbol} ${currency}`} onClick={() => { onClose(); navigate("/settings/currency"); }} />
                <SettingsRow icon={Clock} label={t("settings.timezone", "Time Zone")} value={timezone} onClick={() => { onClose(); navigate("/settings/timezone"); }} />
              </div>

              {/* ── DATA ── */}
              <SectionHeader>{t("settings.data", "Data")}</SectionHeader>
              <div className="mx-2 rounded-2xl bg-white/[0.03] border border-white/[0.04] overflow-hidden divide-y divide-white/[0.04]">
                <SettingsRow icon={Trash2} label={t("settings.clearCache", "Clear Cache")} destructive onClick={() => { onClose(); navigate("/settings/clear-cache"); }} />
                <SettingsRow icon={Download} label={t("settings.downloadData", "Download My Data")} onClick={() => { onClose(); navigate("/settings/download-data"); }} />
                <SettingsRow icon={FileUp} label={t("settings.exportHistory", "Export Travel History")} onClick={() => { onClose(); navigate("/settings/export-history"); }} />
              </div>

              {/* ── SUPPORT ── */}
              <SectionHeader>{t("settings.support", "Support")}</SectionHeader>
              <div className="mx-2 rounded-2xl bg-white/[0.03] border border-white/[0.04] overflow-hidden divide-y divide-white/[0.04]">
                <SettingsRow icon={HelpCircle} label={t("settings.helpCenter", "Help Center")} onClick={() => { onClose(); navigate("/support"); }} />
                <SettingsRow icon={MessageCircle} label={t("settings.contactSupport", "Contact Support")} onClick={() => { onClose(); navigate("/support"); }} />
                <SettingsRow icon={AlertTriangle} label={t("settings.reportProblem", "Report Problem")} onClick={() => { onClose(); navigate("/support"); }} />
                <SettingsRow icon={MessageCircle} label={t("settings.sendFeedback", "Send Feedback")} onClick={() => { onClose(); navigate("/support"); }} />
                <SettingsRow icon={Info} label={t("settings.about", "About OXEN")} onClick={() => { onClose(); navigate("/settings/about"); }} />
              </div>

              {/* ── TUTORIAL ── */}
              <SectionHeader>{t("tutorial.replayTutorial", "Show OXEN Tutorial Again")}</SectionHeader>
              <div className="mx-2 rounded-2xl bg-white/[0.03] border border-white/[0.04] overflow-hidden divide-y divide-white/[0.04]">
                <SettingsRow
                  icon={GraduationCap}
                  label={t("tutorial.replayTutorial", "Show OXEN Tutorial Again")}
                  value={t("tutorial.replayDesc", "Watch the introduction tutorial")}
                  onClick={() => { onClose(); replayTutorial(); }}
                />
              </div>

              {/* ── LOG OUT — hidden for guest users ── */}
              {!user.isGuest && (
                <div className="mt-6 px-2">
                  <button
                    onClick={handleSignOut}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 py-3.5 text-sm font-bold text-destructive transition-all hover:bg-destructive/20 active:scale-[0.98]"
                  >
                    <LogOut className="h-4 w-4" />
                    {t("settings.logOut", "Log Out")}
                  </button>
                </div>
              )}

              <p className="mt-5 text-center text-[11px] text-muted-foreground">
                {t("settings.version", "OXEN v1.0.0 — Built for explorers")}
              </p>
            </div>
          </motion.div>
        </>
      )}

      {/* Logout confirmation dialog — rendered outside the panel so it
          stays visible even if the panel animates closed. */}
      <LogoutDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen} />
    </AnimatePresence>
  );
}
