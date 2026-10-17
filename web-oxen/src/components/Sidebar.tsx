import { motion, AnimatePresence, useDragControls, type PanInfo } from "framer-motion";
import {
  Crown,
  Briefcase,
  Compass,
  BarChart3,
  Heart,
  Settings,
  HelpCircle,
  LogOut,
  ChevronRight,
  X,
  BriefcaseBusiness,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSidebar } from "@/contexts/SidebarContext";
import LogoutDialog from "@/components/LogoutDialog";

const OXEN_LOGO = "/logo.png";

interface MenuItem {
  id: string;
  label: string;
  icon: typeof Crown;
  to?: string;
  danger?: boolean;
  action?: () => void;
}

const SIDEBAR_WIDTH = 320;
const DRAG_CLOSE_THRESHOLD = 100;

const springTransition = {
  type: "spring" as const,
  stiffness: 280,
  damping: 29,
  mass: 1.05,
};

const staggerDelay = 0.04;

const menuItemVariants = {
  hidden: { opacity: 0, x: -24 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: 0.12 + i * staggerDelay,
      duration: 0.35,
    },
  }),
  exit: (i: number) => ({
    opacity: 0,
    x: -12,
    transition: {
      delay: i * 0.02,
      duration: 0.18,
    },
  }),
};

export default function Sidebar() {
  const navigate = useNavigate();
  const { user, ready: authReady } = useAuth();
  const { isOpen, close } = useSidebar();
  const { t } = useLanguage();
  const dragControls = useDragControls();
  const containerRef = useRef<HTMLDivElement>(null);

  // ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, close]);

  // Lock body scroll when sidebar is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleDragEnd = useCallback(
    (_: TouchEvent | MouseEvent | PointerEvent, info: PanInfo) => {
      if (info.offset.x < -DRAG_CLOSE_THRESHOLD || info.velocity.x < -500) {
        close();
      }
    },
    [close],
  );

  const handleNavigate = useCallback(
    (to: string) => {
      close();
      navigate(to);
    },
    [close, navigate],
  );

  const [logoutDialogOpen, setLogoutDialogOpen] = useState<boolean>(false);

  const handleSignOut = useCallback(() => {
    close();
    setLogoutDialogOpen(true);
  }, [close]);

  /** CRM — smart multi-agency routing (not a static route): guests go to
   *  sign-in first, then land on the workspace onboarding page. */
  const handleOpenCrm = useCallback(() => {
    if (!authReady) return;
    close();
    if (!user || user.isGuest) {
      navigate(`/auth?redirect=${encodeURIComponent("/consulting/workspace")}`);
      return;
    }
    navigate("/consulting/workspace");
  }, [authReady, user, navigate, close]);

  const initials = user
    ? user.name
        .split(" ")
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "OX";

  const menuItems: MenuItem[] = [
    { id: "explore", label: t("nav.explore", "CRM"), icon: Compass, action: handleOpenCrm },
    { id: "services", label: t("nav.services", "Travel Services"), icon: BriefcaseBusiness, to: "/services" },
    { id: "premium", label: t("nav.premium", "Premium Membership"), icon: Crown, to: "/profile" },
    { id: "trips", label: t("nav.trips", "My Trips"), icon: Briefcase, to: "/dashboard" },
    { id: "statistics", label: t("nav.statistics", "Statistics"), icon: BarChart3, to: "/dashboard" },
    { id: "favorites", label: t("nav.favorites", "Favorites"), icon: Heart, to: "/dashboard" },
    { id: "settings", label: t("nav.settings", "Settings"), icon: Settings, to: "/profile" },
    { id: "help", label: t("nav.help", "Help & Support"), icon: HelpCircle, to: "/support" },
    { id: "logout", label: t("settings.logOut", "Logout"), icon: LogOut, danger: true, action: handleSignOut },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          ref={containerRef}
          drag="x"
          dragControls={dragControls}
          dragConstraints={{ left: -120, right: 0 }}
          dragElastic={0.08}
          dragDirectionLock
          onDragEnd={handleDragEnd}
          initial={{ x: -SIDEBAR_WIDTH }}
          animate={{ x: 0 }}
          exit={{ x: -SIDEBAR_WIDTH }}
          transition={springTransition}
          className="sidebar-glass fixed inset-y-0 left-0 z-50 flex w-[82vw] max-w-[320px] flex-col rounded-r-3xl"
          style={{ willChange: "transform" }}
        >
          {/* Close button */}
          <button
            onClick={close}
            className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-muted-foreground transition hover:bg-white/20 hover:text-foreground"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Header */}
          <div className="flex-shrink-0 px-4 pt-10 pb-6 sm:px-5">
            <div className="flex items-center gap-3">
              <img
                src={OXEN_LOGO}
                alt="OXEN"
                className="h-10 w-10 rounded-xl object-contain shadow-lg"
              />
              <span className="text-lg font-extrabold tracking-widest">OXEN</span>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08, duration: 0.3 }}
              className="mt-5 flex items-center gap-3.5"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 font-display text-lg font-bold text-foreground shadow-inner">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-foreground">{user?.name ?? t("auth.guest", "Guest Explorer")}</p>
                <p className="truncate text-xs text-muted-foreground">{user?.email ?? "explorer@oxen.travel"}</p>
              </div>
            </motion.div>
          </div>

          {/* Divider */}
          <div className="mx-4 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent sm:mx-5" />

          {/* Menu items */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 no-scrollbar">
            <div className="space-y-1">
              {menuItems.filter((m) => (user && !user.isGuest) || m.id !== "logout").map(
                (item, i) => {
                  const Icon = item.icon;
                  return (
                    <motion.button
                      key={item.id}
                      custom={i}
                      variants={menuItemVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      onClick={() => {
                        if (item.action) {
                          item.action();
                        } else if (item.to) {
                          handleNavigate(item.to);
                        }
                      }}
                      className={`sidebar-item group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-all ${
                        item.danger
                          ? "text-red-400 hover:bg-red-500/10"
                          : "text-muted-foreground hover:bg-white/8 hover:text-foreground"
                      }`}
                    >
                      <span
                        className={`flex h-9 w-9 items-center justify-center rounded-lg transition-all ${
                          item.danger
                            ? "bg-red-500/10 text-red-400 group-hover:bg-red-500/20"
                            : "bg-white/5 text-muted-foreground group-hover:bg-white/12 group-hover:text-primary"
                        }`}
                      >
                        <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
                      </span>
                      <span className="flex-1 text-sm font-medium">{item.label}</span>
                      {!item.danger && (
                        <ChevronRight className="h-4 w-4 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-60" />
                      )}
                    </motion.button>
                  );
                },
              )}
            </div>
          </nav>

          {/* Footer */}
          <div className="flex-shrink-0 px-4 pb-7 pt-3 sm:px-5">
            <p className="text-center text-[11px] text-muted-foreground/50">
              OXEN · {t("nav.tagline", "Explore the world")}
            </p>
          </div>
        </motion.aside>
      )}

      <LogoutDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen} />
    </AnimatePresence>
  );
}
