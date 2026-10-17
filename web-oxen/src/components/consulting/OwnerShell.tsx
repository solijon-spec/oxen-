import { AnimatePresence, motion } from "framer-motion";
import { useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Users,
  FileStack,
  CreditCard,
  Building2,
  CalendarClock,
  TrendingUp,
  Bell,
  ScrollText,
  Settings as SettingsIcon,
  ChevronLeft,
  Menu,
  X,
  LogOut,
  Shield,
  Crown,
  ArrowLeft,
  Briefcase,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import LogoutDialog from "@/components/LogoutDialog";
import { fetchUnreadNotificationCount } from "@/lib/owner-admin";

interface OwnerNavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: OwnerNavItem[] = [
  { to: "/owner-admin", label: "Overview", icon: LayoutDashboard },
  { to: "/owner-admin/crm", label: "CRM", icon: Target },
  { to: "/owner-admin/users", label: "Users", icon: Users },
  { to: "/owner-admin/agency-applications", label: "Tour Agency Applications", icon: Briefcase },
  { to: "/owner-admin/applications", label: "Consulting Applications", icon: FileStack },
  { to: "/owner-admin/payments", label: "Payment Requests", icon: CreditCard },
  { to: "/owner-admin/accounts", label: "Premium Consulting Accounts", icon: Building2 },
  { to: "/owner-admin/subscriptions", label: "Subscriptions", icon: CalendarClock },
  { to: "/owner-admin/revenue", label: "Revenue", icon: TrendingUp },
  { to: "/owner-admin/notifications", label: "Notifications", icon: Bell },
  { to: "/owner-admin/audit", label: "Audit Log", icon: ScrollText },
  { to: "/owner-admin/settings", label: "Settings", icon: SettingsIcon },
];

interface OwnerShellProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}

/**
 * OwnerShell — private layout for the Owner Admin Panel.
 * Mirrors the Consulting DashboardShell aesthetic (Apple Vision Pro
 * dark navy + liquid glass) but with a distinct gold crown brand
 * so owners can visually distinguish the admin workspace.
 */
export function OwnerShell({ title, subtitle, actions, children }: OwnerShellProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  // Unread notification badge count
  const { data: unreadCount } = useQuery({
    queryKey: ["owner-unread-notif-count"],
    queryFn: () => fetchUnreadNotificationCount(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const unread = unreadCount ?? 0;

  const go = (item: OwnerNavItem) => {
    navigate(item.to);
    setMobileOpen(false);
  };

  const isActive = (to: string) =>
    to === "/owner-admin"
      ? location.pathname === "/owner-admin"
      : location.pathname.startsWith(to);

  const SidebarContent = (
    <div className="flex h-full flex-col">
      {/* Brand block */}
      <div className="border-b border-white/[0.06] px-4 py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400/20 to-amber-600/10 text-amber-300">
            <Crown className="h-5 w-5" />
          </span>
          <div className={cn("min-w-0", collapsed && "hidden")}>
            <p className="truncate font-display text-sm font-bold text-foreground">OXEN Owner</p>
            <p className="truncate text-[10px] uppercase tracking-widest text-amber-300/70">
              Admin Panel
            </p>
          </div>
        </div>
        {!collapsed && (
          <div className="mt-3 rounded-xl border border-amber-500/15 bg-amber-500/[0.04] p-2.5">
            <div className="flex items-center gap-1.5">
              <Shield className="h-3 w-3 text-amber-300" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-200/90">
                Private Admin Access
              </span>
            </div>
            <p className="mt-1 truncate text-[10px] text-muted-foreground">{user?.email}</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-2">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.to);
            const showBadge = item.to === "/owner-admin/notifications" && unread > 0;
            return (
              <li key={item.to}>
                <button
                  onClick={() => go(item)}
                  title={item.label}
                  className={cn(
                    "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-all",
                    active
                      ? "bg-amber-500/15 text-amber-300 font-semibold"
                      : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground",
                  )}
                >
                  <span className="relative shrink-0">
                    <Icon className="h-[18px] w-[18px]" />
                    {showBadge && (
                      <span className="absolute -right-1.5 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-rose-500 px-1 text-[8px] font-bold text-white">
                        {unread > 99 ? "99+" : unread}
                      </span>
                    )}
                  </span>
                  <span className={cn("truncate", collapsed && "hidden")}>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom: Return to OXEN + User + logout */}
      <div className="border-t border-white/[0.06] p-3">
        <button
          onClick={() => navigate("/")}
          className={cn(
            "mb-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition hover:bg-white/[0.04] hover:text-foreground",
            collapsed && "justify-center",
          )}
        >
          <ArrowLeft className="h-[18px] w-[18px] shrink-0" />
          {!collapsed && <span>Return to OXEN</span>}
        </button>

        <div className={cn("flex items-center gap-2.5 rounded-xl p-2", collapsed && "justify-center")}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-amber-500/15">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-xs font-bold text-amber-300">
                {(user?.name ?? "?").charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-foreground">{user?.name}</p>
              <p className="truncate text-[10px] text-amber-300/70">Owner</p>
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
    <div className="flex min-h-screen">
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
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-white/[0.06] bg-card/40 px-4 py-3 backdrop-blur-xl lg:px-6">
          <button
            onClick={() => setMobileOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] text-muted-foreground transition hover:text-foreground lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex min-w-0 flex-1 items-center gap-3">
            <button
              onClick={() => navigate("/owner-admin")}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400/20 to-amber-600/10 text-amber-300"
              aria-label="Owner home"
            >
              <Crown className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate font-display text-base font-bold text-foreground lg:text-lg">
                {title}
              </h1>
              {subtitle && (
                <p className="truncate text-[11px] text-muted-foreground lg:text-xs">{subtitle}</p>
              )}
            </div>
          </div>

          {/* Notification bell */}
          <button
            onClick={() => navigate("/owner-admin/notifications")}
            className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] text-muted-foreground transition hover:text-foreground"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            {unread > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </button>

          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-amber-500/15">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-xs font-bold text-amber-300">
                {(user?.name ?? "?").charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 px-4 py-5 pb-28 lg:px-6 lg:pb-10">
          <div className="mx-auto max-w-6xl">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-extrabold text-foreground lg:text-2xl">
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
