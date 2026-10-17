import { motion } from "framer-motion";
import {
  Info, Heart, Github, Mail, Globe2, Star, Shield, Zap,
  Lock, FileText, ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import SettingsPageShell, { Card, SectionLabel } from "@/components/SettingsPageShell";
import { useLanguage } from "@/contexts/LanguageContext";

const OXEN_LOGO = "/logo.png";

export default function About() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <SettingsPageShell
      title={t("about.title", "About OXEN")}
      subtitle={t("about.subtitle", "Version 1.0.0")}
      icon={<Info className="h-4.5 w-4.5" />}
    >
      {/* Logo & branding */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center py-4"
      >
        <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-400/30 via-amber-500/20 to-orange-500/30 p-[3px] shadow-lg shadow-amber-500/20">
          <div className="flex h-full w-full items-center justify-center rounded-3xl bg-card overflow-hidden">
            <img src={OXEN_LOGO} alt="OXEN" className="h-full w-full object-cover" />
          </div>
        </div>
        <h1 className="mt-4 font-display text-2xl font-extrabold">OXEN</h1>
        <p className="text-sm text-muted-foreground">{t("about.tagline", "AI-Powered Travel Platform")}</p>
        <div className="mt-2 flex items-center gap-2 rounded-full bg-white/[0.06] px-3 py-1">
          <Star className="h-3 w-3 text-amber-400" fill="currentColor" />
          <span className="text-xs font-semibold">{t("about.subtitle", "Version 1.0.0")}</span>
        </div>
      </motion.div>

      {/* Description */}
      <div className="glass rounded-2xl border border-white/[0.06] p-5 text-center">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("about.description", "OXEN is a premium travel platform that lets you explore the world through an interactive 3D globe. Discover countries, plan trips with AI, share your journeys, and connect with fellow explorers — all in one beautifully designed app.")}
        </p>
      </div>

      {/* Features */}
      <SectionLabel>{t("about.keyFeatures", "Key Features")}</SectionLabel>
      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: Globe2, label: t("about.3dGlobe", "3D Globe"), color: "text-blue-400" },
          { icon: Zap, label: t("about.aiTripPlanner", "AI Trip Planner"), color: "text-amber-400" },
          { icon: Heart, label: t("about.socialTravel", "Social Travel"), color: "text-rose-400" },
          { icon: Shield, label: t("about.privacyFirst", "Privacy First"), color: "text-emerald-400" },
          { icon: Star, label: t("about.languages", "20+ Languages"), color: "text-violet-400" },
          { icon: Globe2, label: t("about.offlineMode", "Offline Mode"), color: "text-cyan-400" },
        ].map((feature) => (
          <div key={feature.label} className="glass flex items-center gap-2.5 rounded-xl border border-white/[0.06] p-3">
            <feature.icon className={`h-4 w-4 ${feature.color}`} />
            <span className="text-xs font-semibold">{feature.label}</span>
          </div>
        ))}
      </div>

      {/* Legal links */}
      <SectionLabel>{t("about.legalPrivacy", "Legal & Privacy")}</SectionLabel>
      <Card>
        <button
          onClick={() => navigate("/support")}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-white/[0.04] active:scale-[0.98]"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-muted-foreground">
            <FileText className="h-4 w-4" />
          </span>
          <span className="flex-1 text-sm font-medium">{t("about.privacyPolicy", "Privacy Policy")}</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
        </button>
        <button
          onClick={() => navigate("/support")}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-white/[0.04] active:scale-[0.98]"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-muted-foreground">
            <FileText className="h-4 w-4" />
          </span>
          <span className="flex-1 text-sm font-medium">{t("about.termsOfService", "Terms of Service")}</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
        </button>
        <button
          onClick={() => navigate("/support")}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-white/[0.04] active:scale-[0.98]"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-muted-foreground">
            <Lock className="h-4 w-4" />
          </span>
          <span className="flex-1 text-sm font-medium">{t("about.cookiePolicy", "Cookie Policy")}</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
        </button>
      </Card>

      {/* Contact */}
      <SectionLabel>{t("about.contact", "Contact")}</SectionLabel>
      <Card>
        <a
          href="mailto:solisulhiddinov@gmail.com"
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-white/[0.04]"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/15 text-blue-400">
            <Mail className="h-4 w-4" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-medium">{t("about.emailSupport", "Email Support")}</p>
            <p className="text-xs text-muted-foreground">solisulhiddinov@gmail.com</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
        </a>
        <button
          onClick={() => navigate("/support")}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-white/[0.04] active:scale-[0.98]"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 text-violet-400">
            <Github className="h-4 w-4" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-medium">{t("about.helpSupport", "Help & Support")}</p>
            <p className="text-xs text-muted-foreground">Open support messenger</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
        </button>
      </Card>

      {/* Credits */}
      <div className="text-center py-4">
        <p className="text-xs text-muted-foreground">
          {t("about.madeWithLove", "Made with love for explorers")}
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground/60">
          {t("about.copyright", "© 2026 OXEN Travel. All rights reserved.")}
        </p>
      </div>
    </SettingsPageShell>
  );
}
