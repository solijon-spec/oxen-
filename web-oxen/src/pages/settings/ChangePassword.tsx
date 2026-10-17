import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock, Eye, EyeOff, Check, Loader2, ShieldCheck, X,
} from "lucide-react";

import SettingsPageShell, { FieldRow, PrimaryButton } from "@/components/SettingsPageShell";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface PasswordRule {
  key: string;
  label: string;
  test: (pw: string) => boolean;
}

const RULES: PasswordRule[] = [
  { key: "length", label: "Minimum 8 characters", test: (pw) => pw.length >= 8 },
  { key: "upper", label: "Uppercase letter", test: (pw) => /[A-Z]/.test(pw) },
  { key: "lower", label: "Lowercase letter", test: (pw) => /[a-z]/.test(pw) },
  { key: "number", label: "Number", test: (pw) => /\d/.test(pw) },
  { key: "special", label: "Special character", test: (pw) => /[!@#$%^&*(),.?":{}|<>]/.test(pw) },
];

export default function ChangePassword() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const passedCount = useMemo(() => RULES.filter((r) => r.test(next)).length, [next]);
  const strength = Math.round((passedCount / RULES.length) * 100);
  const strengthLabel = strength < 40 ? "Weak" : strength < 80 ? "Good" : "Strong";
  const strengthColor = strength < 40 ? "bg-red-500" : strength < 80 ? "bg-amber-500" : "bg-emerald-500";

  const matches = next.length > 0 && next === confirm;
  const canSubmit = current.length > 0 && passedCount === RULES.length && matches && !saving;

  const handleSubmit = useCallback(async () => {
    setError("");
    if (!canSubmit) return;
    setSaving(true);
    // Simulated save — real Supabase auth would call supabase.auth.updateUser
    await new Promise((r) => setTimeout(r, 1200));
    setSaving(false);
    setSaved(true);
    toast({
      title: "Password changed successfully",
      description: `A confirmation email has been sent to ${user?.email ?? "your email"}.`,
    });
    setTimeout(() => setSaved(false), 3000);
    setCurrent("");
    setNext("");
    setConfirm("");
  }, [canSubmit, user, toast]);

  return (
    <SettingsPageShell
      title="Change Password"
      subtitle="Keep your account secure"
      icon={<Lock className="h-4.5 w-4.5" />}
    >
      {/* Current Password */}
      <FieldRow icon={Lock} label="Current Password">
        <div className="flex items-center gap-2">
          <input
            type={passwordType(showCurrent)}
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            className="w-full bg-transparent text-sm font-medium text-foreground focus:outline-none"
            placeholder="Enter current password"
          />
          <EyeToggle show={showCurrent} onToggle={() => setShowCurrent(!showCurrent)} />
        </div>
      </FieldRow>

      {/* New Password */}
      <FieldRow icon={ShieldCheck} label="New Password">
        <div className="flex items-center gap-2">
          <input
            type={passwordType(showNew)}
            value={next}
            onChange={(e) => setNext(e.target.value)}
            className="w-full bg-transparent text-sm font-medium text-foreground focus:outline-none"
            placeholder="Enter new password"
          />
          <EyeToggle show={showNew} onToggle={() => setShowNew(!showNew)} />
        </div>
      </FieldRow>

      {/* Strength indicator */}
      {next.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="px-1"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Password Strength
            </span>
            <span className={cn(
              "text-[10px] font-bold",
              strength < 40 ? "text-red-400" : strength < 80 ? "text-amber-400" : "text-emerald-400",
            )}>{strengthLabel}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${strength}%` }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className={cn("h-full rounded-full", strengthColor)}
            />
          </div>
          {/* Requirements checklist */}
          <div className="mt-3 grid grid-cols-1 gap-1.5">
            {RULES.map((rule) => {
              const passed = rule.test(next);
              return (
                <div key={rule.key} className="flex items-center gap-2">
                  <span className={cn(
                    "flex h-4 w-4 items-center justify-center rounded-full transition-colors",
                    passed ? "bg-emerald-500/20 text-emerald-400" : "bg-white/[0.06] text-muted-foreground/40",
                  )}>
                    {passed ? <Check className="h-2.5 w-2.5" /> : <X className="h-2.5 w-2.5" />}
                  </span>
                  <span className={cn(
                    "text-xs transition-colors",
                    passed ? "text-emerald-400" : "text-muted-foreground",
                  )}>{rule.label}</span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Confirm Password */}
      <FieldRow icon={ShieldCheck} label="Confirm Password">
        <div className="flex items-center gap-2">
          <input
            type={passwordType(showConfirm)}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full bg-transparent text-sm font-medium text-foreground focus:outline-none"
            placeholder="Re-enter new password"
          />
          <EyeToggle show={showConfirm} onToggle={() => setShowConfirm(!showConfirm)} />
        </div>
      </FieldRow>

      {/* Mismatch warning */}
      <AnimatePresence>
        {confirm.length > 0 && !matches && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="px-1 text-xs text-red-400"
          >
            Passwords do not match
          </motion.p>
        )}
      </AnimatePresence>

      {error && <p className="px-1 text-xs text-red-400">{error}</p>}

      <PrimaryButton
        onClick={handleSubmit}
        disabled={!canSubmit}
        className={cn(
          saved ? "bg-emerald-500 text-white" : "gold-gradient text-primary-foreground shadow-lg",
        )}
      >
        {saving ? (
          <><Loader2 className="h-5 w-5 animate-spin" /> Updating password...</>
        ) : saved ? (
          <><Check className="h-5 w-5" /> Password changed!</>
        ) : (
          "Update Password"
        )}
      </PrimaryButton>
    </SettingsPageShell>
  );
}

function passwordType(show: boolean): "text" | "password" {
  return show ? "text" : "password";
}

function EyeToggle({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:text-foreground active:scale-90"
      aria-label={show ? "Hide password" : "Show password"}
    >
      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );
}
