import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, ArrowLeft, X, Globe2, MapPin, Plane,
  DollarSign, Search, UserPlus, MessageSquare, Image as ImageIcon,
  Sparkles, Check,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { cn } from "@/lib/utils";

const TOTAL_SCENES = 6; // 5 scenes + final

export default function OnboardingTutorial() {
  const { t } = useLanguage();
  const { showTutorial, completeTutorial } = useOnboarding();
  const [scene, setScene] = useState(0);
  const [direction, setDirection] = useState(1);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const goNext = useCallback(() => {
    setDirection(1);
    setScene((prev) => Math.min(prev + 1, TOTAL_SCENES - 1));
  }, []);

  const goBack = useCallback(() => {
    setDirection(-1);
    setScene((prev) => Math.max(prev - 1, 0));
  }, []);

  const handleFinish = useCallback(() => {
    void completeTutorial();
  }, [completeTutorial]);

  const handleSkip = useCallback(() => {
    void completeTutorial();
  }, [completeTutorial]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goBack();
      else if (e.key === "Escape") handleSkip();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goBack, handleSkip]);

  // Swipe handlers
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    // Only handle horizontal swipes (ignore vertical scroll)
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) goNext();
      else goBack();
    }
  }, [goNext, goBack]);

  const isLast = scene === TOTAL_SCENES - 1;

  if (!showTutorial) return null;

  const variants = {
    enter: (dir: number) => ({
      opacity: 0,
      x: dir > 0 ? 60 : -60,
      scale: 0.96,
    }),
    center: {
      opacity: 1,
      x: 0,
      scale: 1,
      transition: { type: "spring" as const, stiffness: 300, damping: 30, mass: 0.8 },
    },
    exit: (dir: number) => ({
      opacity: 0,
      x: dir > 0 ? -60 : 60,
      scale: 0.96,
      transition: { duration: 0.3, ease: "easeInOut" as const },
    }),
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
        className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{ background: "hsl(210 55% 4%)" }}
      >
        {/* Atmospheric background */}
        <OnboardingBackground />

        {/* Skip button — top right */}
        {!isLast && (
          <button
            onClick={handleSkip}
            className="absolute top-5 right-5 z-30 flex items-center gap-1.5 rounded-full bg-white/[0.08] backdrop-blur-md px-4 py-2 text-xs font-semibold text-muted-foreground transition hover:bg-white/[0.14] hover:text-foreground active:scale-95"
            style={{ border: "1px solid hsl(0 0% 100% / 0.12)" }}
          >
            <X className="h-3.5 w-3.5" />
            {t("tutorial.skip", "Skip")}
          </button>
        )}

        {/* Scene content */}
        <div className="relative z-20 flex flex-1 items-center justify-center w-full px-6 max-w-2xl">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={scene}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              className="w-full flex flex-col items-center text-center"
            >
              {scene === 0 && <SceneWelcome />}
              {scene === 1 && <SceneExplore />}
              {scene === 2 && <SceneTrips />}
              {scene === 3 && <SceneConnect />}
              {scene === 4 && <SceneAI />}
              {scene === 5 && <SceneFinal onStart={handleFinish} />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom controls — progress + nav */}
        {!isLast && (
          <div className="relative z-20 flex flex-col items-center gap-5 pb-8 pt-2 px-6 w-full max-w-md">
            {/* Progress dots */}
            <div className="flex items-center gap-2">
              {Array.from({ length: TOTAL_SCENES }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setDirection(i > scene ? 1 : -1);
                    setScene(i);
                  }}
                  className="transition-all duration-300"
                  aria-label={`Scene ${i + 1}`}
                >
                  <div
                    className={cn(
                      "rounded-full transition-all duration-300",
                      i === scene
                        ? "w-6 h-2 bg-primary"
                        : "w-2 h-2 bg-white/20 hover:bg-white/40",
                    )}
                  />
                </button>
              ))}
            </div>

            {/* Nav buttons */}
            <div className="flex items-center justify-between w-full gap-3">
              <button
                onClick={goBack}
                disabled={scene === 0}
                className={cn(
                  "flex items-center gap-1.5 rounded-2xl px-5 py-3 text-sm font-bold transition-all active:scale-95",
                  scene === 0
                    ? "opacity-30 pointer-events-none bg-white/[0.04] text-muted-foreground"
                    : "bg-white/[0.06] text-foreground hover:bg-white/[0.12]",
                )}
                style={{ border: "1px solid hsl(0 0% 100% / 0.08)" }}
              >
                <ArrowLeft className="h-4 w-4" />
                {t("tutorial.back", "Back")}
              </button>

              <button
                onClick={goNext}
                className="flex items-center gap-1.5 rounded-2xl px-6 py-3 text-sm font-bold text-white transition-all active:scale-95 gold-gradient"
              >
                {t("tutorial.next", "Next")}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

/* ════════════════════════════════════════════════════════════════ */
/*  Atmospheric background — nebula gradients + starfield            */
/* ════════════════════════════════════════════════════════════════ */

function OnboardingBackground() {
  const starsRef = useRef<{ top: string; left: string; size: number; delay: string; duration: string; opacity: number }[]>([]);

  if (starsRef.current.length === 0) {
    starsRef.current = Array.from({ length: 60 }, () => ({
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      size: Math.random() * 2 + 0.5,
      delay: `${Math.random() * 4}s`,
      duration: `${Math.random() * 3 + 2}s`,
      opacity: Math.random() * 0.5 + 0.15,
    }));
  }

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Base gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 70% at 50% -15%, hsl(213 66% 12% / 0.6), transparent 65%)," +
            "radial-gradient(ellipse 60% 50% at 80% 10%, hsl(217 91% 53% / 0.08), transparent 55%)," +
            "radial-gradient(ellipse 70% 50% at 10% 90%, hsl(210 55% 8% / 0.5), transparent 60%)," +
            "linear-gradient(180deg, #060B14 0%, #0A1833 50%, #060B14 100%)",
        }}
      />
      {/* Nebula drift blobs */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: "400px",
          height: "400px",
          top: "10%",
          left: "60%",
          background: "radial-gradient(circle, hsl(217 91% 53% / 0.15), transparent 70%)",
          filter: "blur(40px)",
        }}
        animate={{ x: [0, 30, -20, 0], y: [0, -15, 20, 0], scale: [1, 1.05, 0.98, 1] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute rounded-full"
        style={{
          width: "300px",
          height: "300px",
          top: "60%",
          left: "10%",
          background: "radial-gradient(circle, hsl(199 95% 74% / 0.08), transparent 70%)",
          filter: "blur(35px)",
        }}
        animate={{ x: [0, -20, 25, 0], y: [0, 20, -10, 0], scale: [1, 0.95, 1.08, 1] }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Stars */}
      {starsRef.current.map((s, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            top: s.top,
            left: s.left,
            width: s.size,
            height: s.size,
            opacity: s.opacity,
            animation: `twinkle ${s.duration} ease-in-out ${s.delay} infinite`,
          }}
        />
      ))}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════ */
/*  Scene 1 — Welcome to OXEN                                         */
/* ════════════════════════════════════════════════════════════════ */

function SceneWelcome() {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col items-center gap-6 py-8">
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5, filter: "blur(12px)" }}
        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
        transition={{ duration: 1, ease: [0.4, 0, 0.2, 1] }}
        className="relative"
      >
        <div
          className="flex h-24 w-24 items-center justify-center rounded-3xl gold-gradient"
          style={{ boxShadow: "0 0 60px rgba(59,130,246,0.3), inset 0 1px 0 hsl(199 95% 74% / 0.25)" }}
        >
          <Globe2 className="h-12 w-12 text-white" strokeWidth={1.5} />
        </div>
        {/* Glow ring */}
        <motion.div
          className="absolute inset-0 rounded-3xl"
          style={{ border: "2px solid hsl(217 91% 53% / 0.3)" }}
          animate={{ scale: [1, 1.4], opacity: [0.5, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
        />
      </motion.div>

      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: 24, filter: "blur(6px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ delay: 0.5, duration: 0.6 }}
        className="flex flex-col items-center gap-2"
      >
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          {t("tutorial.welcome", "Welcome to OXEN")}
        </h1>
        <p className="text-lg sm:text-xl text-muted-foreground font-medium tracking-wide">
          {t("tutorial.subtitle", "Explore. Plan. Connect.")}
        </p>
      </motion.div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════ */
/*  Scene 2 — Explore the World                                       */
/* ════════════════════════════════════════════════════════════════ */

function SceneExplore() {
  const { t } = useLanguage();
  const markers = [
    { top: "15%", left: "25%", delay: 0.3 },
    { top: "40%", left: "70%", delay: 0.6 },
    { top: "65%", left: "30%", delay: 0.9 },
    { top: "25%", left: "55%", delay: 1.2 },
    { top: "70%", left: "65%", delay: 1.5 },
  ];
  const flowSteps = [
    { label: t("tutorial.scene2Globe", "Globe"), icon: Globe2 },
    { label: t("tutorial.scene2Country", "Country"), icon: MapPin },
    { label: t("tutorial.scene2Destination", "Destination"), icon: Plane },
  ];

  return (
    <div className="flex flex-col items-center gap-8 py-4">
      {/* Animated globe preview */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="relative h-44 w-44 sm:h-52 sm:w-52"
      >
        {/* Sphere */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: "radial-gradient(circle at 35% 30%, hsl(213 66% 20%), hsl(210 55% 8%) 70%)",
            boxShadow: "inset -8px -8px 24px rgba(0,0,0,0.4), inset 4px 4px 16px rgba(59,130,246,0.1), 0 8px 40px rgba(59,130,246,0.15)",
          }}
        />
        {/* Equator + meridian lines */}
        <div
          className="absolute inset-0 rounded-full"
          style={{ border: "1px solid hsl(217 91% 53% / 0.15)" }}
        />
        <div
          className="absolute inset-[15%] rounded-full"
          style={{ border: "1px solid hsl(217 91% 53% / 0.1)" }}
        />
        {/* Orbit ring */}
        <motion.div
          className="absolute inset-[-8%] rounded-full"
          style={{ border: "1px solid hsl(199 95% 74% / 0.15)" }}
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />
        {/* Markers */}
        {markers.map((m, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{ top: m.top, left: m.left }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: m.delay, type: "spring", stiffness: 200, damping: 15 }}
          >
            <div
              className="h-3 w-3 rounded-full bg-primary"
              style={{ animation: `onb-marker-pulse 2s ease-in-out ${m.delay}s infinite` }}
            />
          </motion.div>
        ))}
      </motion.div>

      {/* Title + description */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex flex-col items-center gap-2"
      >
        <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-white">
          {t("tutorial.scene2Title", "Explore the World")}
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground max-w-md leading-relaxed">
          {t("tutorial.scene2Desc", "Discover destinations, cities, universities and places around the world.")}
        </p>
      </motion.div>

      {/* Flow: Globe → Country → Destination */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="flex items-center gap-2 sm:gap-3"
      >
        {flowSteps.map((step, i) => (
          <div key={i} className="flex items-center gap-2 sm:gap-3">
            <motion.div
              initial={{ opacity: 0, scale: 0.7, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.8 + i * 0.25, type: "spring", stiffness: 200 }}
              className="flex items-center gap-2 rounded-xl px-3 py-2 bg-white/[0.06] backdrop-blur-md"
              style={{ border: "1px solid hsl(0 0% 100% / 0.1)" }}
            >
              <step.icon className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold text-foreground">{step.label}</span>
            </motion.div>
            {i < flowSteps.length - 1 && (
              <motion.div
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 1 }}
                transition={{ delay: 1.0 + i * 0.25, duration: 0.3 }}
                className="w-4 sm:w-6 h-px bg-primary/40 origin-left"
              />
            )}
          </div>
        ))}
      </motion.div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════ */
/*  Scene 3 — Find Your Perfect Trip                                  */
/* ════════════════════════════════════════════════════════════════ */

function SceneTrips() {
  const { t } = useLanguage();
  const packages = [
    { destination: "Istanbul", price: "$450", duration: t("tutorial.duration", "5 days"), agency: "Wanderlust Travel" },
    { destination: "Dubai", price: "$890", duration: "7 days", agency: "Globe Tours" },
    { destination: "Maldives", price: "$1,200", duration: "10 days", agency: "Paradise Escapes" },
  ];

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      {/* Title + description */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-2"
      >
        <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-white">
          {t("tutorial.scene3Title", "Find Your Perfect Trip")}
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground max-w-md leading-relaxed">
          {t("tutorial.scene3Desc", "Discover real tour packages from travel agencies and find options that match your budget.")}
        </p>
      </motion.div>

      {/* Flow: Budget → Search → Results */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex items-center gap-3"
      >
        <FlowChip icon={DollarSign} label={t("tutorial.scene3Budget", "Budget")} delay={0.4} value="$800" />
        <FlowArrow delay={0.6} />
        <FlowChip icon={Search} label={t("tutorial.scene3Search", "Search")} delay={0.7} />
        <FlowArrow delay={0.9} />
        <FlowChip icon={Check} label={t("tutorial.scene3Results", "Matching Packages")} delay={1.0} />
      </motion.div>

      {/* Travel package cards */}
      <div className="flex flex-col gap-3 w-full max-w-sm">
        {packages.map((pkg, i) => (
          <motion.div
            key={pkg.destination}
            initial={{ opacity: 0, x: 60, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ delay: 1.2 + i * 0.25, type: "spring", stiffness: 250, damping: 25 }}
            className="glass rounded-2xl p-4 flex items-center gap-4"
            style={{ animation: `onb-card-float 3s ease-in-out ${1.5 + i * 0.3}s infinite` }}
          >
            {/* Destination image placeholder */}
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl"
              style={{
                background: `linear-gradient(135deg, hsl(${217 + i * 20} 70% 30%), hsl(${199 + i * 15} 80% 25%))`,
              }}
            >
              <Plane className="h-6 w-6 text-white/80" />
            </div>
            {/* Info */}
            <div className="flex-1 text-left min-w-0">
              <h3 className="font-display text-sm font-bold text-foreground truncate">{pkg.destination}</h3>
              <p className="text-xs text-muted-foreground truncate">{pkg.duration} · {pkg.agency}</p>
            </div>
            {/* Price */}
            <div className="text-right shrink-0">
              <div className="font-display text-base font-extrabold text-primary">{pkg.price}</div>
              <div className="text-[10px] text-muted-foreground">{t("tutorial.perPerson", "per person")}</div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function FlowChip({ icon: Icon, label, value, delay }: { icon: typeof DollarSign; label: string; value?: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.7, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay, type: "spring", stiffness: 200 }}
      className="flex items-center gap-1.5 rounded-full bg-white/[0.06] backdrop-blur-md px-3 py-1.5"
      style={{ border: "1px solid hsl(0 0% 100% / 0.1)" }}
    >
      <Icon className="h-3.5 w-3.5 text-primary" />
      <span className="text-xs font-semibold text-foreground">{label}</span>
      {value && <span className="text-xs font-bold text-primary ml-0.5">{value}</span>}
    </motion.div>
  );
}

function FlowArrow({ delay }: { delay: number }) {
  return (
    <motion.div
      initial={{ scaleX: 0, opacity: 0 }}
      animate={{ scaleX: 1, opacity: 1 }}
      transition={{ delay, duration: 0.3 }}
      className="w-4 sm:w-5 h-px bg-primary/40 origin-left"
    />
  );
}

/* ════════════════════════════════════════════════════════════════ */
/*  Scene 4 — Connect & Share                                         */
/* ════════════════════════════════════════════════════════════════ */

function SceneConnect() {
  const { t } = useLanguage();
  const steps = [
    { label: t("tutorial.scene4Profile", "Profile"), icon: Globe2, delay: 0.2 },
    { label: t("tutorial.scene4Follow", "Follow"), icon: UserPlus, delay: 0.6 },
    { label: t("tutorial.scene4Message", "Message"), icon: MessageSquare, delay: 1.0 },
    { label: t("tutorial.scene4Post", "Post"), icon: ImageIcon, delay: 1.4 },
    { label: t("tutorial.scene4Story", "Story"), icon: Sparkles, delay: 1.8 },
  ];

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      {/* Title + description */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-2"
      >
        <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-white">
          {t("tutorial.scene4Title", "Connect & Share")}
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground max-w-md leading-relaxed">
          {t("tutorial.scene4Desc", "Follow travelers, send messages and share your travel experiences.")}
        </p>
      </motion.div>

      {/* Visual sequence */}
      <div className="flex flex-col items-center gap-5 w-full max-w-sm">
        {/* Profile avatar with follow + message buttons */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="glass rounded-2xl p-4 flex items-center gap-3 w-full"
        >
          {/* Avatar */}
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
            style={{ background: "linear-gradient(135deg, hsl(217 91% 53% / 0.3), hsl(199 95% 74% / 0.2))" }}
          >
            <span className="text-sm font-bold text-white">OX</span>
          </div>
          <div className="flex-1 text-left min-w-0">
            <div className="text-sm font-bold text-foreground truncate">Explorer</div>
            <div className="text-xs text-muted-foreground truncate">@explorer</div>
          </div>
          {/* Follow button */}
          <motion.div
            className="flex items-center gap-1 rounded-xl gold-gradient px-3 py-1.5"
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ delay: 0.8, duration: 0.6, repeat: Infinity, repeatDelay: 1.5 }}
          >
            <UserPlus className="h-3 w-3 text-white" />
            <span className="text-[10px] font-bold text-white">{t("tutorial.scene4Follow", "Follow")}</span>
          </motion.div>
        </motion.div>

        {/* Down arrow */}
        <motion.div
          initial={{ opacity: 0, scaleY: 0 }}
          animate={{ opacity: 1, scaleY: 1 }}
          transition={{ delay: 0.5 }}
          className="h-6 w-px bg-primary/30 origin-top"
        />

        {/* Message bubble */}
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 1.0, type: "spring", stiffness: 200 }}
          className="self-start rounded-2xl rounded-bl-sm px-4 py-2.5 max-w-[80%]"
          style={{
            background: "linear-gradient(135deg, hsl(217 91% 53%), hsl(221 83% 47%))",
            boxShadow: "0 2px 12px -2px rgba(59,130,246,0.3)",
          }}
        >
          <p className="text-xs text-white font-medium">Love your travel posts! 🌍</p>
        </motion.div>

        {/* Down arrow */}
        <motion.div
          initial={{ opacity: 0, scaleY: 0 }}
          animate={{ opacity: 1, scaleY: 1 }}
          transition={{ delay: 1.3 }}
          className="h-6 w-px bg-primary/30 origin-top"
        />

        {/* Post + Story row */}
        <div className="flex items-center gap-3 w-full">
          {/* Post card */}
          <motion.div
            initial={{ opacity: 0, x: -20, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ delay: 1.5, type: "spring", stiffness: 200 }}
            className="glass rounded-2xl p-3 flex-1 flex items-center gap-2"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/[0.06]">
              <ImageIcon className="h-5 w-5 text-primary" />
            </div>
            <span className="text-xs font-semibold text-foreground">{t("tutorial.scene4Post", "Post")}</span>
          </motion.div>
          {/* Story ring */}
          <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ delay: 1.7, type: "spring", stiffness: 200 }}
            className="glass rounded-2xl p-3 flex-1 flex items-center gap-2"
          >
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full"
              style={{
                border: "2px solid hsl(217 91% 53% / 0.4)",
                background: "hsl(217 91% 53% / 0.08)",
              }}
            >
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <span className="text-xs font-semibold text-foreground">{t("tutorial.scene4Story", "Story")}</span>
          </motion.div>
        </div>
      </div>

      {/* Feature labels */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.0 }}
        className="flex flex-wrap items-center justify-center gap-2 mt-1"
      >
        {steps.map((s) => (
          <div
            key={s.label}
            className="flex items-center gap-1 rounded-full bg-white/[0.04] px-2.5 py-1"
            style={{ border: "1px solid hsl(0 0% 100% / 0.06)" }}
          >
            <s.icon className="h-3 w-3 text-primary" />
            <span className="text-[10px] font-medium text-muted-foreground">{s.label}</span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════ */
/*  Scene 5 — OXEN AI                                                 */
/* ════════════════════════════════════════════════════════════════ */

function SceneAI() {
  const { t } = useLanguage();
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowResults(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const results = [
    { dest: "Istanbul", price: "$450", duration: "5 days" },
    { dest: "Istanbul Old City", price: "$620", duration: "7 days" },
  ];

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      {/* Title + description */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-2"
      >
        <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-white">
          {t("tutorial.scene5Title", "Travel Smarter with OXEN AI")}
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground max-w-md leading-relaxed">
          {t("tutorial.scene5Desc", "Tell OXEN what you need and get relevant travel recommendations.")}
        </p>
      </motion.div>

      {/* Chat preview */}
      <div className="w-full max-w-sm flex flex-col gap-3">
        {/* User message */}
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="self-end rounded-2xl rounded-br-sm px-4 py-2.5 max-w-[85%]"
          style={{
            background: "linear-gradient(135deg, hsl(217 91% 53%), hsl(221 83% 47%))",
            boxShadow: "0 2px 12px -2px rgba(59,130,246,0.3)",
          }}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[10px] font-bold text-white/70">{t("tutorial.scene5User", "You")}</span>
          </div>
          <p className="text-sm text-white font-medium">{t("tutorial.scene5Example", "$800 budget — Istanbul")}</p>
        </motion.div>

        {/* AI response */}
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.8 }}
          className="self-start rounded-2xl rounded-bl-sm px-4 py-3 max-w-[90%] glass"
        >
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles className="h-3 w-3 text-primary" />
            <span className="text-[10px] font-bold text-primary">{t("tutorial.scene5AI", "OXEN AI")}</span>
          </div>
          {!showResults ? (
            <div className="flex items-center gap-1.5 py-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-2 w-2 rounded-full bg-primary"
                  style={{ animation: `onb-ai-dot 1.4s ease-in-out ${i * 0.2}s infinite` }}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {results.map((r, i) => (
                <motion.div
                  key={r.dest}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 0.1 + i * 0.2 }}
                  className="flex items-center gap-3 rounded-xl bg-white/[0.04] p-2.5"
                  style={{ border: "1px solid hsl(0 0% 100% / 0.06)" }}
                >
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0"
                    style={{ background: "linear-gradient(135deg, hsl(217 91% 53% / 0.2), hsl(199 95% 74% / 0.15))" }}
                  >
                    <Plane className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="text-xs font-bold text-foreground truncate">{r.dest}</div>
                    <div className="text-[10px] text-muted-foreground">{r.duration}</div>
                  </div>
                  <div className="text-xs font-extrabold text-primary shrink-0">{r.price}</div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════ */
/*  Final Scene — Your journey starts here                            */
/* ════════════════════════════════════════════════════════════════ */

function SceneFinal({ onStart }: { onStart: () => void }) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col items-center gap-8 py-8">
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5, filter: "blur(12px)" }}
        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
        className="relative"
      >
        <div
          className="flex h-20 w-20 items-center justify-center rounded-3xl gold-gradient"
          style={{ boxShadow: "0 0 50px rgba(59,130,246,0.3), inset 0 1px 0 hsl(199 95% 74% / 0.25)" }}
        >
          <Globe2 className="h-10 w-10 text-white" strokeWidth={1.5} />
        </div>
        <motion.div
          className="absolute inset-0 rounded-3xl"
          style={{ border: "2px solid hsl(217 91% 53% / 0.3)" }}
          animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut" }}
        />
      </motion.div>

      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: 20, filter: "blur(6px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ delay: 0.4, duration: 0.6 }}
        className="flex flex-col items-center gap-1"
      >
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white text-center max-w-md">
          {t("tutorial.finalTitle", "Your journey starts here.")}
        </h1>
      </motion.div>

      {/* Start button */}
      <motion.button
        initial={{ opacity: 0, y: 16, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.7, type: "spring", stiffness: 250, damping: 20 }}
        whileTap={{ scale: 0.97 }}
        onClick={onStart}
        className="flex items-center gap-2 rounded-2xl gold-gradient px-8 py-4 text-base font-bold text-white transition-all active:scale-95"
        style={{ boxShadow: "0 8px 32px -4px rgba(59,130,246,0.4), inset 0 1px 0 hsl(199 95% 74% / 0.25)" }}
      >
        <Globe2 className="h-5 w-5" />
        {t("tutorial.startExploring", "Start Exploring")}
      </motion.button>
    </div>
  );
}
