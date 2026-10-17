import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Lock, Eye, EyeOff, ArrowLeft, Check } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";

import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { validatePassword, passwordStrength } from "@/lib/supabase";

const OXEN_LOGO = "/logo.png";

/**
 * ResetPassword — secure password reset page (/reset-password).
 *
 * Supabase redirects here with a recovery session in the URL hash after the
 * user clicks the reset link in the email. The recovery session is a valid
 * authenticated session, so we can call `supabase.auth.updateUser({ password })`
 * to set a new password without asking for the old one.
 *
 * The new password is managed securely by Supabase Auth — never stored in
 * the profiles table or any public DB table.
 */
export default function ResetPassword() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { ready, loading, updateUserPassword, user } = useAuth();

  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [done, setDone] = useState<boolean>(false);

  // If no valid recovery session lands here, redirect to auth after ready.
  useEffect(() => {
    if (!ready) return;
    if (!user || user.isGuest) {
      navigate("/auth", { replace: true });
    }
  }, [ready, user, navigate]);

  const pwStrength = passwordStrength(password);
  const pwError = validatePassword(password);
  const confirmError = password && confirmPassword && password !== confirmPassword ? "Passwords don't match" : null;
  const canSubmit =
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
      const result = await updateUserPassword(password);
      if (result.error) {
        toast({
          title: "Reset failed",
          description: result.error,
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }
      setDone(true);
      toast({
        title: "Password updated",
        description: "You can now sign in with your new password.",
      });
    } catch (err) {
      toast({
        title: "Reset failed",
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

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-[#0a0f1e] px-6 py-12">
      <div className="absolute inset-0 bg-[#0a0f1e]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(37,99,235,0.15),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_90%_80%,rgba(59,130,246,0.08),transparent_50%)]" />

      {!done && (
        <Link
          to="/"
          className="absolute left-6 top-6 z-30 flex items-center gap-2 text-sm font-medium text-slate-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Back to Globe</span>
        </Link>
      )}

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="mb-8 flex items-center gap-3">
          <img
            src={OXEN_LOGO}
            alt="OXEN"
            className="h-10 w-10 rounded-xl object-contain shadow-lg shadow-blue-500/20"
            onError={(e) => { e.currentTarget.src = "/placeholder.svg"; }}
          />
          <span className="font-display text-lg font-bold tracking-wider text-white">OXEN</span>
        </div>

        <AnimatePresence mode="wait">
          {!done ? (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <h1 className="font-display text-3xl font-bold tracking-tight text-white lg:text-4xl">
                Set a new password
              </h1>
              <p className="mt-2 text-slate-400">
                Enter your new password below. Your password is securely managed by Supabase Auth.
              </p>

              <div className="auth-card mt-6 rounded-2xl p-6 lg:p-8">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-400">
                      New Password
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
                        autoFocus
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

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-400">
                      Confirm New Password
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

                  <motion.button
                    type="submit"
                    disabled={!canSubmit || loading}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    className="auth-btn-primary relative mt-2 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl py-3.5 text-sm font-bold text-white disabled:opacity-60"
                  >
                    {submitting || loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Updating password…
                      </>
                    ) : (
                      "Update password"
                    )}
                  </motion.button>
                </form>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="done"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center"
            >
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15">
                <Check className="h-8 w-8 text-emerald-400" />
              </div>
              <h1 className="font-display text-3xl font-bold tracking-tight text-white lg:text-4xl">
                Password updated
              </h1>
              <p className="mt-3 text-slate-400">
                Your OXEN account password has been changed. You can now sign in with your nickname and new password, or with Google.
              </p>
              <button
                type="button"
                onClick={() => navigate("/auth?mode=signin", { replace: true })}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:from-blue-500 hover:to-blue-600 active:scale-[0.98]"
              >
                Continue to sign in
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
