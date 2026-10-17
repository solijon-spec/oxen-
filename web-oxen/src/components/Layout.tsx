import { motion, AnimatePresence } from "framer-motion";
import { Menu, Globe2, Plane, User, WifiOff, RefreshCw, GraduationCap, Search, IdCard } from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

import Sidebar from "@/components/Sidebar";
import Starfield from "@/components/Starfield";
import { useSidebar } from "@/contexts/SidebarContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useOffline } from "@/contexts/OfflineContext";
import { cn } from "@/lib/utils";
import { type ComponentType } from "react";

interface LucideIconProps {
  className?: string;
  strokeWidth?: number;
}

type LucideIcon = ComponentType<LucideIconProps>;

interface TabDef {
  to: string;
  label: string;
  icon: LucideIcon;
  end: boolean;
}

const TABS: TabDef[] = [
  { to: "/", label: "nav.globe", icon: Globe2, end: true },
  { to: "/green-card", label: "nav.greenCard", icon: IdCard, end: false },
  { to: "/travel", label: "nav.travel", icon: Plane, end: false },
  { to: "/discover", label: "nav.discover", icon: Search, end: false },
  { to: "/universities", label: "nav.universities", icon: GraduationCap, end: false },
  { to: "/profile", label: "nav.profile", icon: User, end: false },
];

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.35 } },
  exit: { opacity: 0, transition: { duration: 0.25 } },
};

export default function Layout() {
  const location = useLocation();
  const isGlobe = location.pathname === "/";
  const { t } = useLanguage();
  const { isOpen, open, close } = useSidebar();
  const { isOffline, pendingSync } = useOffline();

  return (
    <div className="relative min-h-screen safe-x">
      <Starfield count={isGlobe ? 110 : 60} />

      {/* Offline indicator banner */}
      <AnimatePresence>
        {isOffline && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="fixed left-3 right-3 top-16 z-50 flex items-center justify-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-2 backdrop-blur-xl sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:px-4"
          >
            <WifiOff className="h-3.5 w-3.5 text-amber-400" strokeWidth={2.5} />
            <span className="text-xs font-semibold text-amber-300">{t("offline.mode", "Offline Mode")}</span>
            {pendingSync && (
              <span className="ml-1 flex items-center gap-1 text-[10px] text-amber-400/70">
                <RefreshCw className="h-2.5 w-2.5 animate-spin" /> {t("offline.pendingSync", "pending sync")}
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hamburger button — top-left corner */}
      {!isOpen && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, duration: 0.35, ease: "easeOut" }}
          onClick={open}
          className="fixed left-3 z-30 flex h-9 w-9 items-center justify-center rounded-xl bg-card/50 backdrop-blur-xl border border-white/10 text-muted-foreground shadow-lg transition-all hover:bg-card/70 hover:text-foreground hover:border-white/20 active:scale-95 sm:left-4 sm:h-10 sm:w-10"
          style={{ top: "calc(env(safe-area-inset-top, 0px) + 14px)" }}
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" strokeWidth={2} />
        </motion.button>
      )}

      {/* Dark overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="overlay"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={close}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            style={{ willChange: "opacity" }}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <Sidebar />

      {/* Main content */}
      <main className="relative z-10 pb-28 overflow-x-hidden">
        <Outlet />
      </main>

      {/* Floating iOS-style bottom tab bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-2 sm:px-4"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}
      >
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring" as const, stiffness: 260, damping: 26, mass: 1, delay: 0.1 }}
          className="glass-strong flex w-full max-w-xl items-center justify-around rounded-[22px] px-1 py-2 shadow-2xl sm:px-2"
          style={{ willChange: "transform" }}
        >
          {TABS.map((tab) => {
            const Icon = tab.icon;

            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.end}
                className={({ isActive }) =>
                  cn(
                    "group relative flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-0.5 py-1.5 transition-all",
                    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <motion.span
                      layout
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all",
                        isActive && "bg-primary/15 glow-gold",
                      )}
                    >
                      <Icon className="h-[18px] w-[18px]" strokeWidth={2.2} />
                    </motion.span>
                    <span className="w-full truncate text-center text-[8px] font-semibold leading-tight">{t(tab.label)}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </motion.div>
      </nav>
    </div>
  );
}
