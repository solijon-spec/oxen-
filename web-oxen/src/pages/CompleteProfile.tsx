import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Lock, AtSign, Eye, EyeOff, ArrowLeft, Check, X, Globe } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";

import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  validateNicknameFormat,
  validatePassword,
  passwordStrength,
  checkNicknameAvailability,
} from "@/lib/supabase";

const OXEN_LOGO = "/logo.png";

/**
 * CompleteProfile — first-login onboarding page (/complete-profile).
 *
 * Shown after a user signs in with Google (or email) for the first time,
 * before they can enter the main OXEN application. The user must:
 *   - choose a unique nickname (3-24 chars, Latin/number/_/.)
 *   - set a password (min 8, ≥1 letter + ≥1 number)
 *   - confirm the password
 *
 * The password is set via `supabase.auth.updateUser({ password })` —
 * Supabase Auth manages it securely. The plain password is never stored
 * in the profiles table or any public DB table.
 */
export default function CompleteProfile() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, ready, loading, completeOnboarding } = useAuth();

  const [nickname, setNickname] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [nicknameStatus, setNicknameStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Monotonic request id — prevents a stale slow availability response
  // from overwriting the status of a newer keystroke.
  const nicknameReqRef = useRef<number>(0);

  // If not signed in or already onboarded, redirect away
  useEffect(() => {
    if (!ready) return;
    if (!user || user.isGuest) {
      navigate("/auth", { replace: true });
      return;
    }
    if (user.onboardingCompleted) {
      navigate("/", { replace: true });
    }
  }, [ready, user, navigate]);

  // Debounced nickname availability check
  const checkNickname = useCallback((value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = value.trim();
    if (!trimmed) {
      setNicknameStatus("idle");
      return;
    }
    const formatErr = validateNicknameFormat(trimmed);
    if (formatErr) {
      setNicknameStatus("invalid");
      return;
    }
    setNicknameStatus("checking");
    const reqId = ++nicknameReqRef.current;
    debounceRef.current = setTimeout(async () => {
      const result = await checkNicknameAvailability(trimmed);
      // Only apply the result if no newer keystroke has superseded this check.
      if (reqId !== nicknameReqRef.current) return;
      setNicknameStatus(result);
    }, 500);
  }, []);

  const handleNicknameChange = (value: string) => {
    setNickname(value);
    checkNickname(value);
  };

  const pwStrength = passwordStrength(password);
  const pwError = validatePassword(password);
  const confirmError = password && confirmPassword && password !== confirmPassword ? "Passwords don't match" : null;
  const nicknameFormatErr = validateNicknameFormat(nickname);
  const nicknameValid = nicknameStatus === "available";
  const canSubmit =
    nicknameValid &&
    !pwError &&
    !confirmError &&
    password.length > 0 &&
    confirmPassword.length > 0 &&
    !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      const result = await completeOnboarding(nickname, password);
      if (result.error) {
        toast({
          title: "Setup failed",
          description: result.error,
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }
      toast({
        title: "Welcome to OXEN",
        description: "Your account is ready. The world is yours to explore.",
      });
      navigate("/", { replace: true });
    } catch (err) {
      toast({
        title: "Setup failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
      setSubmitting(false);
    }
  };

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0f1e]">
        <div className="oxen-skeleton-globe" aria-label="Loading" />
      </div>
    );
  }

  if (!user || user.isGuest) return null;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-[#0a0f1e] px-4 py-12 sm:px-6">
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
        <span className="hidden sm:inline">Back to Globe</span>
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md"
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
          <h1 className="font-display text-3xl font-bold tracking-tight text-white lg:text-4xl">
            Complete Your Profile
          </h1>
          <p className="mt-2 text-slate-400">
            Choose your nickname and set a password to finish setting up your OXEN account.
          </p>
        </div>

        {/* Card */}
        <div className="auth-card rounded-2xl p-6 lg:p-8">
          {/* Google profile preview */}
          <div className="mb-6 flex items-center gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-500 to-blue-700">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="h-full w-full object-cover"
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
              ) : (
                <span className="text-lg font-bold text-white">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{user.name}</p>
              <p className="truncate text-xs text-slate-400">{user.email}</p>
              <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-blue-400">Read-only</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nickname */}
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
                  onChange={(e) => handleNicknameChange(e.target.value)}
                  onFocus={() => setFocusedField("nickname")}
                  onBlur={() => setFocusedField(null)}
                  autoComplete="username"
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
                />
                <AnimatePresence mode="wait">
                  {nicknameStatus === "checking" && (
                    <motion.span key="checking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
                    </motion.span>
                  )}
                  {nicknameStatus === "available" && (
                    <motion.span key="ok" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <Check className="h-4 w-4 text-emerald-400" />
                    </motion.span>
                  )}
                  {(nicknameStatus === "taken" || nicknameStatus === "invalid") && nickname.trim() && (
                    <motion.span key="bad" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <X className="h-4 w-4 text-red-400" />
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
              {/* Nickname status text */}
              {nickname.trim() && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`mt-1.5 text-xs ${
                    nicknameStatus === "available"
                      ? "text-emerald-400"
                      : nicknameStatus === "taken"
                        ? "text-red-400"
                        : nicknameStatus === "invalid"
                          ? "text-red-400"
                          : "text-slate-500"
                  }`}
                >
                  {nicknameStatus === "checking" && "Checking availability…"}
                  {nicknameStatus === "available" && "Available"}
                  {nicknameStatus === "taken" && "Already taken"}
                  {nicknameStatus === "invalid" && (nicknameFormatErr ?? "Invalid nickname")}
                  {nicknameStatus === "idle" && "3-24 chars: letters, numbers, underscore, dot"}
                </motion.p>
              )}
              {!nickname.trim() && (
                <p className="mt-1.5 text-xs text-slate-500">
                  3-24 chars: Latin letters, numbers, underscore, dot. No spaces.
                </p>
              )}
            </div>

            {/* Password */}
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
                  autoComplete="new-password"
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
              {/* Password strength indicator */}
              {password && (
                <div className="mt-2 flex items-center gap-1.5">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                        pwStrength > i
                          ? pwStrength === 1
                            ? "bg-red-500"
                            : pwStrength === 2
                              ? "bg-amber-500"
                              : pwStrength === 3
                                ? "bg-blue-500"
                                : "bg-emerald-500"
                          : "bg-white/[0.06]"
                      }`}
                    />
                  ))}
                  <span className="ml-1 text-[10px] font-medium text-slate-500">
                    {pwStrength <= 1 ? "Weak" : pwStrength === 2 ? "Fair" : pwStrength === 3 ? "Good" : "Strong"}
                  </span>
                </div>
              )}
              {password && pwError && (
                <p className="mt-1.5 text-xs text-red-400">{pwError}</p>
              )}
              {!password && (
                <p className="mt-1.5 text-xs text-slate-500">
                  Min 8 characters, at least one letter and one number.
                </p>
              )}
            </div>

            {/* Confirm password */}
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
                  autoComplete="new-password"
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="shrink-0 text-slate-500 hover:text-slate-300 transition-colors"
                  tabIndex={-1}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmError && (
                <p className="mt-1.5 text-xs text-red-400">{confirmError}</p>
              )}
            </div>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={!canSubmit}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="auth-btn-primary relative mt-2 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl py-3.5 text-sm font-bold text-white disabled:opacity-60"
            >
              {submitting || loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Setting up your account…
                </>
              ) : (
                "Continue to OXEN"
              )}
            </motion.button>
          </form>
        </div>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-slate-500">
          <Globe className="h-3 w-3" />
          Your password is securely managed by Supabase Auth and never stored in plain text.
        </p>
      </motion.div>
    </div>
  );
}
