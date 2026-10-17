import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck, Mail, Smartphone, KeyRound, Copy, Check, Loader2,
  ShieldAlert, Info,
} from "lucide-react";

import SettingsPageShell, { Card, ToggleRow, SectionLabel, PrimaryButton } from "@/components/SettingsPageShell";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Method = "email" | "authenticator" | null;

const BACKUP_CODES = [
  "OX7K-2M9P", "Q4R8-T5ZV", "N3LA-6WBJ", "H1XC-9FDK",
  "E2YG-7PRM", "S8TN-4QDC", "U5VB-3KHF", "J6WD-1XAE",
];

export default function TwoFactorAuth() {
  const { toast } = useToast();
  const [method, setMethod] = useState<Method>(null);
  const [enabled, setEnabled] = useState(false);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [codesRevealed, setCodesRevealed] = useState(false);

  const handleVerify = useCallback(async () => {
    if (code.length < 6) return;
    setVerifying(true);
    await new Promise((r) => setTimeout(r, 1200));
    setVerifying(false);
    setVerified(true);
    setEnabled(true);
    toast({ title: "Two-factor authentication enabled", description: "Your account is now protected with 2FA." });
    setTimeout(() => { setVerified(false); setCode(""); }, 2500);
  }, [code, toast]);

  const handleDisable = useCallback(() => {
    setEnabled(false);
    setMethod(null);
    toast({ title: "2FA disabled", description: "Two-factor authentication has been turned off." });
  }, [toast]);

  const copyCode = useCallback((c: string) => {
    navigator.clipboard?.writeText(c);
    setCopiedCode(c);
    setTimeout(() => setCopiedCode(null), 1500);
  }, []);

  return (
    <SettingsPageShell
      title="Two-Factor Authentication"
      subtitle="Add an extra layer of security"
      icon={<ShieldCheck className="h-4.5 w-4.5" />}
    >
      {/* Current status */}
      <div className={cn(
        "glass flex items-center gap-3 rounded-2xl border p-4",
        enabled ? "border-emerald-500/20 bg-emerald-500/5" : "border-amber-500/20 bg-amber-500/5",
      )}>
        <span className={cn(
          "flex h-10 w-10 items-center justify-center rounded-xl",
          enabled ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400",
        )}>
          {enabled ? <ShieldCheck className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
        </span>
        <div className="flex-1">
          <p className="text-sm font-bold">{enabled ? "2FA Active" : "2FA Not Enabled"}</p>
          <p className="text-xs text-muted-foreground">
            {enabled ? `Protected via ${method === "email" ? "email verification" : "authenticator app"}` : "Enable 2FA to secure your account"}
          </p>
        </div>
      </div>

      {!enabled && (
        <>
          <SectionLabel>Choose Method</SectionLabel>
          <Card>
            <button
              onClick={() => setMethod("email")}
              className={cn(
                "flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-white/[0.04]",
                method === "email" && "bg-primary/5",
              )}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400">
                <Mail className="h-4.5 w-4.5" />
              </span>
              <div className="flex-1">
                <p className="text-sm font-semibold">Email Verification</p>
                <p className="text-xs text-muted-foreground">Receive codes via email</p>
              </div>
              {method === "email" && <Check className="h-4 w-4 text-primary" />}
            </button>

            <button
              onClick={() => setMethod("authenticator")}
              className={cn(
                "flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-white/[0.04]",
                method === "authenticator" && "bg-primary/5",
              )}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/15 text-violet-400">
                <Smartphone className="h-4.5 w-4.5" />
              </span>
              <div className="flex-1">
                <p className="text-sm font-semibold">Authenticator App</p>
                <p className="text-xs text-muted-foreground">Google Authenticator, Authy, etc.</p>
              </div>
              {method === "authenticator" && <Check className="h-4 w-4 text-primary" />}
            </button>
          </Card>
        </>
      )}

      {/* Verification input */}
      <AnimatePresence>
        {method && !enabled && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <SectionLabel>Enter Verification Code</SectionLabel>
            <div className="profile-input-field rounded-2xl px-4 py-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                {method === "email" ? "Email Code" : "Authenticator Code"}
              </p>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                inputMode="numeric"
                className="w-full bg-transparent text-2xl font-bold tracking-[0.5em] text-foreground focus:outline-none"
              />
            </div>
            <PrimaryButton
              onClick={handleVerify}
              disabled={code.length < 6 || verifying}
              className={cn(
                verified ? "bg-emerald-500 text-white" : "gold-gradient text-primary-foreground shadow-lg",
              )}
            >
              {verifying ? (
                <><Loader2 className="h-5 w-5 animate-spin" /> Verifying...</>
              ) : verified ? (
                <><Check className="h-5 w-5" /> Verified!</>
              ) : (
                "Verify & Enable"
              )}
            </PrimaryButton>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backup codes */}
      <AnimatePresence>
        {enabled && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <SectionLabel>Backup Recovery Codes</SectionLabel>
            <div className="glass rounded-2xl border border-white/[0.06] p-4">
              <div className="flex items-start gap-2.5 mb-3">
                <Info className="h-4 w-4 shrink-0 text-blue-400 mt-0.5" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Save these codes in a safe place. Each can be used once if you lose access to your 2FA method.
                </p>
              </div>
              <button
                onClick={() => setCodesRevealed(!codesRevealed)}
                className="mb-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/[0.08] py-2.5 text-xs font-semibold text-muted-foreground transition hover:bg-white/[0.04]"
              >
                <KeyRound className="h-3.5 w-3.5" />
                {codesRevealed ? "Hide codes" : "Reveal codes"}
              </button>
              <AnimatePresence>
                {codesRevealed && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="grid grid-cols-2 gap-2"
                  >
                    {BACKUP_CODES.map((c) => (
                      <button
                        key={c}
                        onClick={() => copyCode(c)}
                        className="flex items-center justify-between rounded-lg bg-white/[0.04] px-3 py-2 text-xs font-mono font-semibold transition hover:bg-white/[0.08]"
                      >
                        {c}
                        {copiedCode === c ? (
                          <Check className="h-3 w-3 text-emerald-400" />
                        ) : (
                          <Copy className="h-3 w-3 text-muted-foreground/50" />
                        )}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <SectionLabel>Security Tips</SectionLabel>
            <div className="glass rounded-2xl border border-white/[0.06] p-4 space-y-2.5">
              {[
                "Never share your backup codes with anyone",
                "Use a password manager to store codes securely",
                "Enable 2FA on your email account too",
                "Review active devices regularly",
              ].map((tip) => (
                <div key={tip} className="flex items-start gap-2">
                  <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400 mt-0.5" />
                  <p className="text-xs text-muted-foreground">{tip}</p>
                </div>
              ))}
            </div>

            <PrimaryButton
              onClick={handleDisable}
              className="border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20"
            >
              Disable 2FA
            </PrimaryButton>
          </motion.div>
        )}
      </AnimatePresence>
    </SettingsPageShell>
  );
}
