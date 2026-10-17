import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  FileStack,
  Megaphone,
  ShoppingCart,
  Wallet,
  BarChart3,
  Activity,
  Star,
  Building2,
  Settings as SettingsIcon,
  LifeBuoy,
  LogOut,
  Menu,
  X,
  Bell,
  Search as SearchIcon,
  ChevronLeft,
  ChevronDown,
  Sparkles,
  CalendarClock,
  Plus,
  Check,
  LogIn,
  ShieldCheck,
  Clock,
  AlertCircle,
  Loader2,
  CheckCheck,
  Crown,
  LogOut as ExitIcon,
  Target,
  Briefcase,
  UserCheck as WorkersIcon,
  MessageCircle as MessageCircleIcon,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useConsulting } from "@/contexts/ConsultingContext";
import { useOwnerAgency } from "@/contexts/OwnerAgencyContext";
import LogoutDialog from "@/components/LogoutDialog";
import { getPlan } from "@/lib/consulting";
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type ConsultingNotification,
} from "@/lib/crm-extras";

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

// All modules are now fully functional — no SOON badges.
const NAV_ITEMS: NavItem[] = [
  { to: "/consulting/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/consulting/crm", label: "CRM Pipeline", icon: Target },
  { to: "/consulting/messages", label: "Messages", icon: MessageCircleIcon },
  { to: "/consulting/clients", label: "Clients", icon: Users },
  { to: "/consulting/applications", label: "Applications", icon: FileStack },
  { to: "/consulting/posts", label: "Posts", icon: Megaphone },
  { to: "/consulting/vacancies", label: "Vacancies", icon: Briefcase },
  { to: "/consulting/workers", label: "Workers", icon: WorkersIcon },
  { to: "/consulting/pos", label: "POS", icon: ShoppingCart },
  { to: "/consulting/cashier", label: "Cashier", icon: Wallet },
  { to: "/consulting/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/consulting/activity", label: "Activity Log", icon: Activity },
  { to: "/consulting/reviews", label: "Reviews", icon: Star },
  { to: "/consulting/settings", label: "Settings", icon: SettingsIcon },
  { to: "/consulting/support", label: "Help & Support", icon: LifeBuoy },
];

interface DashboardShellProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  /** When true, show a back button that navigates one step back in router history. */
  showBack?: boolean;
  children: ReactNode;
}

export function DashboardShell({ title, subtitle, actions, showBack = false, children }: DashboardShellProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { company, member, subscriptionPlan, subscriptionEndDate, subscriptionAccess, agencies, activeAgencyId, switchAgency, isSwitching } = useConsulting();
  const { isOwnerMode, ownerAgency, exitAgencyCRM } = useOwnerAgency();
  const [switcherSearch, setSwitcherSearch] = useState("");

  const filteredAgencies = useMemo(() => {
    if (!switcherSearch.trim()) return agencies;
    const q = switcherSearch.toLowerCase();
    return agencies.filter((am) => am.company.name.toLowerCase().includes(q));
  }, [agencies, switcherSearch]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  // ── Notifications ──
  const queryClient = useQueryClient();
  const companyId = company?.id ?? "";
  const { data: notifications } = useQuery({
    queryKey: ["consulting-notifications", companyId],
    queryFn: () => fetchNotifications(companyId, 20),
    enabled: !!companyId,
    staleTime: 30_000,
    retry: false,
    refetchInterval: 60_000,
  });

  const unreadCount = notifications?.filter((n) => !n.is_read).length ?? 0;

  const markReadMutation = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["consulting-notifications"] }),
  });

  const markAllMutation = useMutation({
    mutationFn: () => markAllNotificationsRead(companyId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["consulting-notifications"] }),
  });

  const getNotifIcon = (type: string) => {
    switch (type) {
      case "new_client": return Users;
      case "new_application": return FileStack;
      case "tour_inquiry": return Megaphone;
      case "review": return Star;
      case "support_reply": return LifeBuoy;
      default: return Bell;
    }
  };

  const getNotifRoute = (type: string, data?: unknown) => {
    switch (type) {
      case "new_client": return "/consulting/clients";
      case "new_application": return "/consulting/applications";
      case "tour_inquiry": return "/consulting/posts";
      case "review": return "/consulting/reviews";
      case "support_reply": return "/consulting/support";
      default: return null;
    }
  };

  const companyName = company?.name ?? "Consulting Dashboard";
  const logoUrl = company?.logo_url ?? null;
  const plan = subscriptionPlan ? getPlan(subscriptionPlan) : null;

  const formatEndDate = (iso: string | null): string => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return "—";
    }
  };

  const go = (item: NavItem) => {
    navigate(item.to);
    setMobileOpen(false);
  };

  const SidebarContent = (
    <div className="flex h-full flex-col">
      {/* Agency Switcher + subscription block */}
      <div className="border-b border-white/[0.06] px-4 py-4">
        {/* Agency Switcher button — always clickable (even with 1 agency, to access Add/Join) */}
        <button
          onClick={() => !collapsed && setSwitcherOpen((s) => !s)}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-xl px-2 py-2 transition",
            collapsed && "justify-center",
            switcherOpen ? "bg-white/[0.06]" : "hover:bg-white/[0.04]",
          )}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/15 text-primary">
            {isSwitching ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : logoUrl ? (
              <img src={logoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <Building2 className="h-5 w-5" />
            )}
          </span>
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1 text-left">
                <p className="truncate font-display text-sm font-bold text-foreground">{companyName}</p>
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-[10px] capitalize text-muted-foreground">
                    {member?.role ?? "—"}
                  </p>
                  {company?.verification_status === "verified" && (
                    <ShieldCheck className="h-3 w-3 shrink-0 text-emerald-400" />
                  )}
                  {company?.verification_status === "pending" && (
                    <Clock className="h-3 w-3 shrink-0 text-amber-400" />
                  )}
                </div>
              </div>
              <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", switcherOpen && "rotate-180")} />
            </>
          )}
        </button>

        {/* Agency Switcher dropdown — Telegram-style */}
        <AnimatePresence>
          {switcherOpen && !collapsed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="overflow-hidden"
            >
              <div className="mt-2 rounded-xl border border-white/[0.06] bg-popover/95 backdrop-blur-xl">
                {/* Search (when > 3 agencies) */}
                {agencies.length > 3 && (
                  <div className="relative border-b border-white/[0.04] p-2">
                    <SearchIcon className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={switcherSearch}
                      onChange={(e) => setSwitcherSearch(e.target.value)}
                      placeholder="Search agencies…"
                      className="w-full rounded-lg border border-white/[0.06] bg-white/[0.03] py-1.5 pl-7 pr-3 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary/40 focus:outline-none"
                    />
                  </div>
                )}

                {/* Agency list */}
                <div className="max-h-64 overflow-y-auto p-1.5">
                  {filteredAgencies.length === 0 && switcherSearch.trim() && (
                    <p className="py-4 text-center text-xs text-muted-foreground">No agencies found</p>
                  )}
                  {filteredAgencies.map((am) => {
                    const isActive = am.company.id === activeAgencyId;
                    const vStatus = am.company.verification_status;
                    return (
                      <button
                        key={am.company.id}
                        onClick={() => {
                          if (!isActive) {
                            switchAgency(am.company.id);
                          }
                          setSwitcherOpen(false);
                          setMobileOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-lg px-2 py-2.5 text-left transition",
                          isActive ? "bg-primary/10" : "hover:bg-white/[0.04]",
                        )}
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary/10">
                          {am.company.logo_url ? (
                            <img src={am.company.logo_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <Building2 className="h-4 w-4 text-primary" />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-bold text-foreground">{am.company.name}</p>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] capitalize text-muted-foreground">{am.member.role}</span>
                            {vStatus === "verified" && <ShieldCheck className="h-2.5 w-2.5 text-emerald-400" />}
                            {vStatus === "pending" && <Clock className="h-2.5 w-2.5 text-amber-400" />}
                            {vStatus === "rejected" && <AlertCircle className="h-2.5 w-2.5 text-destructive" />}
                          </div>
                        </div>
                        {isActive && (
                          <span className="flex items-center gap-1 rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
                            <Check className="h-2.5 w-2.5" /> Active
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Bottom actions — Add Agency + Join Agency */}
                <div className="border-t border-white/[0.06] p-1.5">
                  <button
                    onClick={() => {
                      navigate("/consulting/create-agency");
                      setSwitcherOpen(false);
                      setMobileOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-bold text-primary transition hover:bg-primary/5"
                  >
                    <Plus className="h-3.5 w-3.5 shrink-0" />
                    Add Agency
                  </button>
                  <button
                    onClick={() => {
                      navigate("/consulting/join-agency");
                      setSwitcherOpen(false);
                      setMobileOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-bold text-primary transition hover:bg-primary/5"
                  >
                    <LogIn className="h-3.5 w-3.5 shrink-0" />
                    Join Existing Agency
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Subscription info */}
        {!collapsed && (
          <div className="mt-3 space-y-1.5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Plan</span>
              <span className="text-[11px] font-bold text-foreground">{plan?.name ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                <CalendarClock className="h-2.5 w-2.5" /> Expires
              </span>
              <span className="text-[11px] font-semibold text-foreground">{formatEndDate(subscriptionEndDate)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Status</span>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                  subscriptionAccess === "active"
                    ? "bg-emerald-500/15 text-emerald-400"
                    : subscriptionAccess === "expired"
                      ? "bg-amber-500/15 text-amber-400"
                      : "bg-white/[0.06] text-muted-foreground",
                )}
              >
                {subscriptionAccess === "active" ? "Active" : subscriptionAccess === "expired" ? "Expired" : "None"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-2">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to;
            return (
              <li key={item.to}>
                <button
                  onClick={() => go(item)}
                  title={item.label}
                  className={cn(
                    "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-all",
                    active
                      ? "bg-primary/15 text-primary font-semibold"
                      : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground",
                  )}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" />
                  <span className={cn("truncate", collapsed && "hidden")}>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User + logout */}
      <div className="border-t border-white/[0.06] p-3">
        <div className={cn("flex items-center gap-2.5 rounded-xl p-2", collapsed && "justify-center")}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-xs font-bold text-primary">
                {(user?.name ?? "?").charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-foreground">{user?.name}</p>
              <p className="truncate text-[10px] capitalize text-muted-foreground">{member?.role}</p>
            </div>
          )}
        </div>
        <button
          onClick={() => setLogoutOpen(true)}
          className={cn(
            "mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-destructive transition hover:bg-destructive/10",
            collapsed && "justify-center",
          )}
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" strokeWidth={2.1} />
          {!collapsed && <span>Log Out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen crm-main-content">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 border-r border-white/[0.06] bg-sidebar/60 backdrop-blur-xl transition-all duration-300 lg:block",
          collapsed ? "w-[72px]" : "w-[248px]",
        )}
      >
        {SidebarContent}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-card/80 text-muted-foreground transition hover:text-foreground"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft className={cn("h-3.5 w-3.5 transition-transform", collapsed && "rotate-180")} />
        </button>
      </aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="fixed inset-y-0 left-0 z-[81] w-[264px] border-r border-white/[0.06] bg-sidebar/95 backdrop-blur-xl lg:hidden"
            >
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute right-3 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-white/[0.06] hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
              {SidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-white/[0.06] bg-card/40 px-3 py-3 backdrop-blur-xl sm:px-4 lg:px-6">
          <button
            onClick={() => setMobileOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] text-muted-foreground transition hover:text-foreground lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            {showBack && (
              <button
                onClick={() => navigate(-1)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] text-muted-foreground transition hover:text-foreground"
                aria-label="Go back"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            {/* Company logo + name */}
            <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/15 sm:h-9 sm:w-9">
              {logoUrl ? (
                <img src={logoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <Building2 className="h-4 w-4 text-primary" />
              )}
            </div>
            <div className="min-w-0">
              <h1 className="truncate font-display text-base font-bold text-foreground lg:text-lg">
                {companyName}
              </h1>
              {subtitle && (
                <p className="truncate text-[11px] text-muted-foreground lg:text-xs">{subtitle}</p>
              )}
            </div>
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <div className="relative">
              <SearchIcon className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                placeholder="Search…"
                className="w-44 rounded-xl border border-white/[0.06] bg-white/[0.03] py-2 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary/40 focus:outline-none lg:w-56"
              />
            </div>
          </div>

          {/* Notification bell with dropdown */}
          <div className="relative">
            <button
              onClick={() => setNotifOpen((s) => !s)}
              className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] text-muted-foreground transition hover:text-foreground"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
            <AnimatePresence>
              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-[70]" onClick={() => setNotifOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.96 }}
                    transition={{ type: "spring", stiffness: 300, damping: 28 }}
                    className="absolute right-0 top-11 z-[71] w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-white/[0.08] bg-popover/95 shadow-2xl backdrop-blur-xl"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
                      <span className="text-xs font-bold text-foreground">Notifications</span>
                      {unreadCount > 0 && (
                        <button
                          onClick={() => markAllMutation.mutate()}
                          className="flex items-center gap-1 text-[10px] font-semibold text-primary transition hover:text-primary/80"
                        >
                          <CheckCheck className="h-3 w-3" /> Mark all read
                        </button>
                      )}
                    </div>
                    {/* List */}
                    <div className="max-h-80 overflow-y-auto">
                      {(!notifications || notifications.length === 0) ? (
                        <div className="py-8 text-center">
                          <Bell className="mx-auto mb-2 h-6 w-6 text-muted-foreground/30" />
                          <p className="text-xs text-muted-foreground">No notifications yet</p>
                        </div>
                      ) : (
                        notifications.map((n: ConsultingNotification) => {
                          const NIcon = getNotifIcon(n.type);
                          const route = getNotifRoute(n.type, n.data);
                          return (
                            <button
                              key={n.id}
                              onClick={() => {
                                if (!n.is_read) markReadMutation.mutate(n.id);
                                const r = getNotifRoute(n.type, n.data);
                                if (r) {
                                  navigate(r);
                                  setNotifOpen(false);
                                }
                              }}
                              className={cn(
                                "flex w-full items-start gap-2.5 border-b border-white/[0.04] px-4 py-3 text-left transition last:border-0",
                                !n.is_read ? "bg-primary/5 hover:bg-primary/8" : "hover:bg-white/[0.03]",
                              )}
                            >
                              <span className={cn(
                                "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                                !n.is_read ? "bg-primary/15 text-primary" : "bg-white/[0.04] text-muted-foreground",
                              )}>
                                <NIcon className="h-3.5 w-3.5" />
                              </span>
                              <div className="min-w-0 flex-1">
                                {n.title && (
                                  <p className="truncate text-xs font-semibold text-foreground">{n.title}</p>
                                )}
                                {n.body && (
                                  <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{n.body}</p>
                                )}
                                <p className="mt-0.5 text-[10px] text-muted-foreground/60">
                                  {new Date(n.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                </p>
                              </div>
                              {!n.is_read && (
                                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15 sm:h-9 sm:w-9">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-xs font-bold text-primary">
                {(user?.name ?? "?").charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 px-3 py-4 pb-28 sm:px-4 lg:px-6 lg:pb-10">
          <div className="mx-auto max-w-6xl">
            {/* OWNER MODE banner */}
            {isOwnerMode && ownerAgency && (
              <div className="mb-4 flex flex-col gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-300">
                    <Crown className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-amber-200">OWNER MODE — Managing {ownerAgency.name}</p>
                    <p className="text-[10px] text-amber-200/60">You are managing this agency as OXEN Owner. All actions are logged.</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    const agencyId = ownerAgency.id;
                    exitAgencyCRM();
                    navigate(`/owner-admin/accounts/${agencyId}`);
                  }}
                  className="flex shrink-0 items-center gap-1.5 rounded-xl bg-amber-500/20 px-3 py-2 text-xs font-bold text-amber-200 transition hover:bg-amber-500/30"
                >
                  <ExitIcon className="h-3.5 w-3.5" /> Exit Agency
                </button>
              </div>
            )}
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
              <div className="min-w-0">
                <h2 className="font-display text-lg font-extrabold text-foreground sm:text-xl lg:text-2xl">
                  {title}
                </h2>
              </div>
              {actions && <div className="shrink-0">{actions}</div>}
            </div>
            {children}
          </div>
        </main>
      </div>

      <LogoutDialog open={logoutOpen} onOpenChange={setLogoutOpen} />
    </div>
  );
}
