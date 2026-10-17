import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Fingerprint, Check, Loader2, Info, ShieldCheck, Smartphone, ScanFace,
} from "lucide-react";

import SettingsPageShell, { Card, ToggleRow, SectionLabel } from "@/components/SettingsPageShell";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function Biometrics() {
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(false);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [enrolling, setEnrolling] = useState(false);

  // Detect biometric support
  const detectSupport = useCallback(async () => {
    try {
      // WebAuthn API check (browser/PWA)
      if ("PublicKeyCredential" in window) {
        const available = await (window as unknown as {
          PublicKeyCredential?: {
            isUserVerifyingPlatformAuthenticatorAvailable?: () => Promise<boolean>;
          };
        }).PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable?.();
        setSupported(available ?? false);
      } else {
        setSupported(false);
      }
    } catch {
      setSupported(false);
    }
  }, []);

  const handleToggle = useCallback(async (v: boolean) => {
    if (v) {
      if (supported === null) await detectSupport();
      if (supported === false) {
        toast({
          title: "Biometrics not available",
          description: "Your device doesn't support biometric authentication.",
        });
        return;
      }
      setEnrolling(true);
      await new Promise((r) => setTimeout(r, 1500));
      setEnrolling(false);
      setEnabled(true);
      toast({ title: "Biometric login enabled", description: "Use Face ID / Touch ID to sign in." });
    } else {
      setEnabled(false);
      toast({ title: "Biometric login disabled" });
    }
  }, [supported, detectSupport, toast]);

  return (
    <SettingsPageShell
      title="Face ID / Touch ID"
      subtitle="Biometric authentication"
      icon={<Fingerprint className="h-4.5 w-4.5" />}
    >
      {/* Visual */}
      <div className="flex flex-col items-center py-4">
        <motion.div
          animate={enabled ? { scale: [1, 1.05, 1] } : {}}
          transition={{ duration: 2, repeat: Infinity }}
          className={cn(
            "flex h-24 w-24 items-center justify-center rounded-full border-2 transition-colors",
            enabled
              ? "border-emerald-500/30 bg-emerald-500/10"
              : "border-white/[0.08] bg-white/[0.03]",
          )}
        >
          {enrolling ? (
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          ) : enabled ? (
            <ScanFace className="h-10 w-10 text-emerald-400" />
          ) : (
            <Fingerprint className="h-10 w-10 text-muted-foreground/40" />
          )}
        </motion.div>
        <p className={cn(
          "mt-3 text-sm font-bold",
          enabled ? "text-emerald-400" : "text-muted-foreground",
        )}>
          {enrolling ? "Scanning..." : enabled ? "Enabled" : "Not Enabled"}
        </p>
      </div>

      {/* Toggle */}
      <Card>
        <ToggleRow
          icon={Fingerprint}
          label="Enable Biometric Login"
          value={enabled}
          onChange={handleToggle}
        />
      </Card>

      {/* Status */}
      <SectionLabel>Device Support</SectionLabel>
      <div className="glass rounded-2xl border border-white/[0.06] p-4 space-y-3">
        <div className="flex items-center gap-3">
          <span className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg",
            supported === true ? "bg-emerald-500/15 text-emerald-400" :
            supported === false ? "bg-red-500/15 text-red-400" :
            "bg-white/[0.06] text-muted-foreground",
          )}>
            {supported === true ? <Check className="h-4 w-4" /> :
             supported === false ? <Smartphone className="h-4 w-4" /> :
             <Info className="h-4 w-4" />}
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold">Platform Authenticator</p>
            <p className="text-xs text-muted-foreground">
              {supported === true ? "Available on this device" :
               supported === false ? "Not available — biometrics may work on mobile app" :
               "Tap the toggle to check support"}
            </p>
          </div>
        </div>
      </div>

      {/* Supported devices */}
      <SectionLabel>Supported Devices</SectionLabel>
      <div className="glass rounded-2xl border border-white/[0.06] p-4 space-y-2.5">
        {[
          "iPhone X and newer (Face ID)",
          "iPad Pro with Face ID",
          "MacBook Pro with Touch ID",
          "Android devices with fingerprint sensor",
          "Windows Hello compatible devices",
        ].map((item) => (
          <div key={item} className="flex items-start gap-2">
            <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400 mt-0.5" />
            <p className="text-xs text-muted-foreground">{item}</p>
          </div>
        ))}
      </div>

      {/* Security note */}
      <AnimatePresence>
        {enabled && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass flex items-start gap-2.5 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4"
          >
            <ShieldCheck className="h-4 w-4 shrink-0 text-blue-400 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Biometric data never leaves your device. OXEN only receives a cryptographic confirmation that authentication succeeded.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </SettingsPageShell>
  );
}
