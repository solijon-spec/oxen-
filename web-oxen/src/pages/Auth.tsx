import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Mail, Lock, AtSign, Eye, EyeOff, ArrowLeft, Globe, Phone, Sparkles, ExternalLink } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";

import TravelIllustration from "@/components/TravelIllustration";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";

type Mode = "signin" | "signup";

const OXEN_LOGO = "/logo.png";

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { user, ready, loading, signIn, signUp, signInWithNickname, signInWithProvider, resetPassword } = useAuth();

  // Determine initial mode from URL or default to signup
  const searchParams = new URLSearchParams(location.search);
  const initialMode: Mode = searchParams.get("mode") === "signin" ? "signin" : "signup";
  const redirectTarget: string = searchParams.get("redirect") || "/profile";

  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [nickname, setNickname] = useState<string>(""); // OXEN account login
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [localLoading, setLocalLoading] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [oauthFallbackUrl, setOauthFallbackUrl] = useState<string | null>(null);

  // Forgot password modal
  const [forgotOpen, setForgotOpen] = useState<boolean>(false);
  const [forgotEmail, setForgotEmail] = useState<string>("");
  const [forgotLoading, setForgotLoading] = useState<boolean>(false);
  const [forgotSent, setForgotSent] = useState<boolean>(false);

  const formRef = useRef<HTMLFormElement>(null);

  // If already signed in (non-guest), redirect to the page they came from
  useEffect(() => {
    if (ready && user && !user.isGuest) {
      // If onboarding not complete, send to complete-profile first
      if (!user.onboardingCompleted) {
        navigate("/complete-profile", { replace: true });
      } else {
        navigate(redirectTarget, { replace: true });
      }
    }
  }, [ready, user, navigate, redirectTarget]);

  const switchMode = useCallback((newMode: Mode) => {
    setMode(newMode);
    setName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setNickname("");
    setShowPassword(false);
    setShowConfirmPassword(false);
    setOauthError(null);
  }, []);

  // ── Email/password submit (sign-up mode only — signin uses nickname) ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "signup") {
      if (!name.trim()) {
        toast({ title: "Name required", description: "Please enter your full name.", variant: "destructive" });
        return;
      }
      if (password.length < 8) {
        toast({ title: "Password too short", description: "Password must be at least 8 characters.", variant: "destructive" });
        return;
      }
      if (password !== confirmPassword) {
        toast({ title: "Passwords don't match", description: "Please make sure both passwords match.", variant: "destructive" });
        return;
      }
    }

    setLocalLoading("email");
    try {
      const result = mode === "signin"
        ? await signIn(email, password)
        : await signUp(name, email, password);

      if (result.error) {
        toast({
          title: mode === "signin" ? "Sign in failed" : "Registration failed",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Welcome to OXEN", description: "The world is yours to explore." });
      navigate(redirectTarget, { replace: true });
    } catch (err) {
      toast({
        title: mode === "signin" ? "Sign in failed" : "Registration failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLocalLoading(null);
    }
  };

  // ── OXEN nickname + password login ──
  const handleNicknameLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim() || !password) {
      toast({ title: "Missing details", description: "Enter your nickname and password.", variant: "destructive" });
      return;
    }
    setLocalLoading("nickname");
    try {
      const result = await signInWithNickname(nickname, password);
      if (result.error) {
        toast({
          title: "Sign in failed",
          description: result.error,
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Welcome back", description: "The world is yours to explore." });
      navigate(redirectTarget, { replace: true });
    } catch (err) {
      toast({
        title: "Sign in failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLocalLoading(null);
    }
  };

  const handleGoogle = async () => {
    setLocalLoading("google");
    setOauthError(null);
    setOauthFallbackUrl(null);
    try {
      const result = await signInWithProvider("google", {
        redirectToPath: redirectTarget,
      });
      if (result.error) {
        setOauthError(result.error);
        toast({ title: "Sign in failed", description: result.error, variant: "destructive" });
        setLocalLoading(null);
        return;
      }
      if (result.url) {
        setOauthFallbackUrl(result.url);
        setLocalLoading(null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Google sign-in failed. Please try again.";
      setOauthError(message);
      toast({ title: "Sign in failed", description: message, variant: "destructive" });
      setLocalLoading(null);
    }
  };

  const openFallbackInNewTab = () => {
    if (!oauthFallbackUrl) return;
    window.open(oauthFallbackUrl, "_blank", "noopener,noreferrer");
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotLoading(true);
    try {
      const result = await resetPassword(forgotEmail);
      if (result.error) {
        toast({ title: "Reset failed", description: result.error, variant: "destructive" });
        return;
      }
      setForgotSent(true);
      toast({ title: "Reset email sent", description: "Check your inbox for the password reset link." });
    } finally {
      setForgotLoading(false);
    }
  };

  if (ready && user && !user.isGuest) return null;

  const isLoading = !ready || loading || localLoading !== null;

  return (
    <div className="relative flex min-h-screen flex-col md:flex-row">
      {/* Background */}
      <div className="absolute inset-0 bg-[#0a0f1e]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(37,99,235,0.15),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_90%_80%,rgba(59,130,246,0.08),transparent_50%)]" />

      {/* Back link */}
      <Link
        to="/"
        className="absolute left-4 top-4 z-30 flex items-center gap-2 text-sm font-medium text-slate-400 transition-colors hover:text-white sm:left-6 sm:top-6"
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="hidden sm:inline">{t("auth.backToGlobe", "Back to Globe")}</span>
      </Link>

      {/* Left Panel: Form */}
      <div className="relative z-10 flex w-full items-center justify-center px-4 py-12 sm:px-6 md:w-1/2 md:px-12 lg:px-20">
        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="w-full max-w-md"
        >
          {/* Logo + heading */}
          <div className="mb-8">
            <div className="mb-6 flex items-center gap-3">
              <img
                src={OXEN_LOGO}
                alt="OXEN"
                className="h-10 w-10 rounded-xl object-contain shadow-lg shadow-blue-500/20"
                onError={(e) => { e.currentTarget.src = "/placeholder.svg"; }}
              />
              <span className="font-display text-lg font-bold tracking-wider text-white">OXEN</span>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={mode + "-heading"}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.25 }}
              >
                <h1 className="font-display text-3xl font-bold tracking-tight text-white lg:text-4xl">
                  {mode === "signup" ? "Create Your Account" : "Welcome Back"}
                </h1>
                <p className="mt-2 text-slate-400">
                  {mode === "signup"
                    ? "Start your journey around the world."
                    : "Continue your exploration of the world."}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Form card */}
          <div className="auth-card rounded-2xl p-4 sm:p-6 lg:p-8">
            {/* OAuth error banner */}
            {oauthError && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300"
              >
                <p className="font-medium">Authentication Error</p>
                <p className="mt-1 text-red-400">{oauthError}</p>
                <p className="mt-2 text-xs text-red-400/70">
                  Make sure the Google OAuth provider is configured in your Supabase dashboard.
                </p>
              </motion.div>
            )}

            {/* A. Continue with Google — fully functional */}
            <div className="space-y-3">
              <motion.button
                type="button"
                onClick={handleGoogle}
                disabled={isLoading}
                whileTap={{ scale: 0.98 }}
                className="auth-btn-provider flex w-full items-center justify-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {localLoading === "google" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <GoogleMark />
                )}
                {t("auth.google", "Continue with Google")}
              </motion.button>

              {oauthFallbackUrl && (
                <motion.button
                  type="button"
                  onClick={openFallbackInNewTab}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-200 transition hover:bg-amber-500/15"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open Google Login in New Tab
                </motion.button>
              )}

              {/* Apple — coming soon */}
              <div className="auth-btn-provider flex w-full items-center justify-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-white opacity-60">
                <AppleMark />
                {t("auth.apple", "Continue with Apple")}
                <span className="ml-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-400">
                  {t("auth.soon", "Soon")}
                </span>
              </div>

              {/* Phone — coming soon */}
              <div className="auth-btn-provider flex w-full items-center justify-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-white opacity-60">
                <Phone className="h-4 w-4" />
                Continue with Phone
                <span className="ml-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-400">
                  {t("auth.soon", "Soon")}
                </span>
              </div>
            </div>

            {/* Divider */}
            <div className="my-6 flex items-center gap-3 text-xs font-medium text-slate-500">
              <div className="h-px flex-1 bg-white/[0.08]" />
              OR
              <div className="h-px flex-1 bg-white/[0.08]" />
            </div>

            {/* B. Sign in with OXEN account (nickname + password) — always available */}
            {mode === "signin" && (
              <form ref={formRef} onSubmit={handleNicknameLogin} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">
                    Nickname
                  </label>
                  <div
                    className={`flex items-center gap-3 rounded-xl border bg-white/[0.03] px-4 py-3 transition-all duration-200 ${
                      focusedField === "nickname"
                        ? "border-blue-500/50 shadow-[0_0_0_3px_rgba(59,130,246,0.12)]"
                        : "border-white/[0.08]"
                    }`}
                  >
                    <AtSign className="h-4 w-4 shrink-0 text-slate-500" />
                    <input
                      type="text"
                      placeholder="alex.42"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      onFocus={() => setFocusedField("nickname")}
                      onBlur={() => setFocusedField(null)}
                      autoComplete="username"
                      className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">
                    Password
                  </label>
                  <div
                    className={`flex items-center gap-3 rounded-xl border bg-white/[0.03] px-4 py-3 transition-all duration-200 ${
                      focusedField === "password"
                        ? "border-blue-500/50 shadow-[0_0_0_3px_rgba(59,130,246,0.12)]"
                        : "border-white/[0.08]"
                    }`}
                  >
                    <Lock className="h-4 w-4 shrink-0 text-slate-500" />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setFocusedField("password")}
                      onBlur={() => setFocusedField(null)}
                      autoComplete="current-password"
                      className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="shrink-0 text-slate-500 hover:text-slate-300 transition-colors"
                      tabIndex={-1}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <motion.button
                  type="submit"
                  disabled={isLoading}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className="auth-btn-primary relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl py-3.5 text-sm font-bold text-white disabled:opacity-60"
                >
                  {localLoading === "nickname" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Signing in…
                    </>
                  ) : (
                    "Sign In"
                  )}
                </motion.button>

                <div className="flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => setForgotOpen(true)}
                    className="font-medium text-blue-400 transition-colors hover:text-blue-300"
                  >
                    Forgot password?
                  </button>
                </div>
              </form>
            )}

            {/* Sign-up mode: email/password form (kept for direct email signup) */}
            {mode === "signup" && (
              <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">
                    Full Name
                  </label>
                  <div
                    className={`flex items-center gap-3 rounded-xl border bg-white/[0.03] px-4 py-3 transition-all duration-200 ${
                      focusedField === "name"
                        ? "border-blue-500/50 shadow-[0_0_0_3px_rgba(59,130,246,0.12)]"
                        : "border-white/[0.08]"
                    }`}
                  >
                    <AtSign className="h-4 w-4 shrink-0 text-slate-500" />
                    <input
                      type="text"
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onFocus={() => setFocusedField("name")}
                      onBlur={() => setFocusedField(null)}
                      className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">
                    Email Address
                  </label>
                  <div
                    className={`flex items-center gap-3 rounded-xl border bg-white/[0.03] px-4 py-3 transition-all duration-200 ${
                      focusedField === "email"
                        ? "border-blue-500/50 shadow-[0_0_0_3px_rgba(59,130,246,0.12)]"
                        : "border-white/[0.08]"
                    }`}
                  >
                    <Mail className="h-4 w-4 shrink-0 text-slate-500" />
                    <input
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setFocusedField("email")}
                      onBlur={() => setFocusedField(null)}
                      className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">
                    Password
                  </label>
                  <div
                    className={`flex items-center gap-3 rounded-xl border bg-white/[0.03] px-4 py-3 transition-all duration-200 ${
                      focusedField === "password"
                        ? "border-blue-500/50 shadow-[0_0_0_3px_rgba(59,130,246,0.12)]"
                        : "border-white/[0.08]"
                    }`}
                  >
                    <Lock className="h-4 w-4 shrink-0 text-slate-500" />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setFocusedField("password")}
                      onBlur={() => setFocusedField(null)}
                      className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="shrink-0 text-slate-500 hover:text-slate-300 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">
                    Confirm Password
                  </label>
                  <div
                    className={`flex items-center gap-3 rounded-xl border bg-white/[0.03] px-4 py-3 transition-all duration-200 ${
                      focusedField === "confirm"
                        ? "border-blue-500/50 shadow-[0_0_0_3px_rgba(59,130,246,0.12)]"
                        : "border-white/[0.08]"
                    }`}
                  >
                    <Lock className="h-4 w-4 shrink-0 text-slate-500" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      onFocus={() => setFocusedField("confirm")}
                      onBlur={() => setFocusedField(null)}
                      className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="shrink-0 text-slate-500 hover:text-slate-300 transition-colors"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <motion.button
                  type="submit"
                  disabled={isLoading}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className="auth-btn-primary relative mt-2 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl py-3.5 text-sm font-bold text-white disabled:opacity-60"
                >
                  {localLoading === "email" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating account…
                    </>
                  ) : (
                    "Create Account"
                  )}
                </motion.button>
              </form>
            )}

            {/* Bottom switch */}
            <p className="mt-6 text-center text-sm text-slate-400">
              {mode === "signup" ? "Already have an account?" : "New to OXEN?"}{" "}
              <button
                type="button"
                onClick={() => switchMode(mode === "signup" ? "signin" : "signup")}
                className="font-semibold text-blue-400 transition-colors hover:text-blue-300"
              >
                {mode === "signup" ? "Sign In" : "Create one"}
              </button>
            </p>
          </div>

          {/* Guest continue */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-6"
          >
            <Link
              to="/"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:from-blue-500 hover:to-blue-600 hover:shadow-blue-500/30 active:scale-[0.98]"
            >
              <Globe className="h-4 w-4" />
              {t("auth.continueAsGuest", "Continue as Guest Explorer")}
            </Link>
            <p className="mt-3 text-center text-xs text-slate-500">
              <Sparkles className="inline h-3 w-3 text-amber-500" />{" "}
              {t("auth.guestDesc", "No account needed — explore 200+ countries, plan trips with AI, and discover the world.")}
            </p>
          </motion.div>
        </motion.div>
      </div>

      {/* Right Panel: Illustration */}
      <div className="relative z-10 hidden w-1/2 overflow-hidden md:block">
        <TravelIllustration />

        <div className="absolute inset-0 flex flex-col items-center justify-center px-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="glass-auth mb-6 rounded-2xl px-6 py-4 shadow-2xl"
          >
            <p className="text-center font-display text-xl font-bold text-white lg:text-2xl">
              {t("auth.travelTheWorld", "Travel the world")}
            </p>
            <p className="text-center text-sm text-blue-300">{t("auth.withOxen", "with OXEN")}</p>
          </motion.div>

          <div className="flex flex-wrap justify-center gap-3">
            {[
              { icon: "🌍", label: t("auth.featureCountries", "200+ Countries") },
              { icon: "✈️", label: t("auth.featureAIPlanner", "AI Planner") },
              { icon: "📍", label: t("auth.featureLocalGuides", "Local Guides") },
              { icon: "🗺️", label: t("auth.featureOfflineMaps", "Offline Maps") },
            ].map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.1, duration: 0.4 }}
                className="glass-auth flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-lg"
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </motion.div>
            ))}
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.6 }}
            className="mt-8 max-w-xs text-center text-sm leading-relaxed text-slate-400"
          >
            {t("auth.bottomTagline", "Discover destinations, plan with AI, and explore every corner of the world — all in one place.")}
          </motion.p>
        </div>
      </div>

      {/* ── Forgot password modal ── */}
      <AnimatePresence>
        {forgotOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setForgotOpen(false); setForgotSent(false); setForgotEmail(""); }}
              className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              className="fixed left-1/2 top-1/2 z-[101] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-white/[0.08] bg-[#0a0f1e]/95 p-6 shadow-2xl backdrop-blur-xl"
            >
              {!forgotSent ? (
                <>
                  <h3 className="font-display text-lg font-bold text-white">Reset your password</h3>
                  <p className="mt-1 text-sm text-slate-400">
                    Enter your Gmail address and we'll send you a secure link to set a new password.
                  </p>
                  <form onSubmit={handleForgotPassword} className="mt-4 space-y-3">
                    <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
                      <Mail className="h-4 w-4 shrink-0 text-slate-500" />
                      <input
                        type="email"
                        placeholder="you@gmail.com"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        autoFocus
                        className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={forgotLoading || !forgotEmail.trim()}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 py-3 text-sm font-bold text-white disabled:opacity-60"
                    >
                      {forgotLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Sending…
                        </>
                      ) : (
                        "Send reset link"
                      )}
                    </button>
                  </form>
                  <button
                    type="button"
                    onClick={() => { setForgotOpen(false); setForgotEmail(""); }}
                    className="mt-3 w-full rounded-xl py-2.5 text-sm font-medium text-slate-400 transition hover:bg-white/[0.04] hover:text-white"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15">
                    <Mail className="h-7 w-7 text-emerald-400" />
                  </div>
                  <h3 className="font-display text-lg font-bold text-white">Check your inbox</h3>
                  <p className="mt-2 text-sm text-slate-400">
                    We've sent a password reset link to <span className="font-semibold text-white">{forgotEmail}</span>.
                    The link expires in 60 minutes.
                  </p>
                  <button
                    type="button"
                    onClick={() => { setForgotOpen(false); setForgotSent(false); setForgotEmail(""); }}
                    className="mt-5 w-full rounded-xl bg-white/[0.04] py-3 text-sm font-bold text-white transition hover:bg-white/[0.08]"
                  >
                    Got it
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Inline SVG brand marks ── */

function GoogleMark() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function AppleMark() {
  return (
    <svg className="h-4 w-4 fill-white" viewBox="0 0 24 24">
      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}
