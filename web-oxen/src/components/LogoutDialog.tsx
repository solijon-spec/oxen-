import { motion, AnimatePresence } from "framer-motion";
import { Loader2, LogOut } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";

interface LogoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * iOS-style confirmation dialog for signing out.
 * Uses a spring scale-in card with a blurred backdrop,
 * a red "Sign Out" action button, and a loading spinner
 * while the signOut promise is in flight.
 */
export default function LogoutDialog({ open, onOpenChange }: LogoutDialogProps) {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();

  const [isSigningOut, setIsSigningOut] = useState<boolean>(false);

  // Reset loading state when dialog closes
  useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => setIsSigningOut(false), 200);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // ESC to cancel
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSigningOut) onOpenChange(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, isSigningOut, onOpenChange]);

  const handleSignOut = useCallback(async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      onOpenChange(false);
      toast({
        title: t("settings.signedOut", "Signed out"),
        description: t("settings.signOutDesc", "See you on the next adventure."),
      });
      navigate("/");
    } catch {
      setIsSigningOut(false);
      toast({
        title: t("settings.signOutFailed", "Sign out failed"),
        description: "Please try again.",
        variant: "destructive",
      });
    }
  }, [signOut, onOpenChange, toast, navigate, t]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center px-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-md"
            onClick={() => !isSigningOut && onOpenChange(false)}
          />

          {/* Dialog card */}
          <motion.div
            initial={{ scale: 0.85, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.88, opacity: 0, y: 8 }}
            transition={{ type: "spring", stiffness: 380, damping: 28, mass: 0.9 }}
            className="relative z-10 w-full max-w-[340px] overflow-hidden rounded-3xl border border-white/[0.08] bg-[hsl(225,42%,9%)]/[0.97] shadow-2xl backdrop-blur-2xl"
          >
            {/* Icon */}
            <div className="flex flex-col items-center pt-7 pb-2">
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.05, type: "spring", stiffness: 300, damping: 18 }}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/15 text-red-400"
              >
                <LogOut className="h-6 w-6" strokeWidth={2.2} />
              </motion.div>
            </div>

            {/* Title */}
            <h2 className="px-6 pt-2 text-center text-lg font-bold text-foreground">
              {t("settings.signOutTitle", "Sign out?")}
            </h2>

            {/* Message */}
            <p className="px-6 pt-1.5 pb-6 text-center text-sm text-muted-foreground leading-relaxed">
              {t(
                "settings.signOutMessage",
                "Are you sure you want to sign out of your OXEN account?",
              )}
            </p>

            {/* Buttons */}
            <div className="flex gap-2.5 px-5 pb-6">
              {/* Cancel */}
              <button
                type="button"
                disabled={isSigningOut}
                onClick={() => onOpenChange(false)}
                className="flex flex-1 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04] py-3 text-sm font-semibold text-foreground transition-all hover:bg-white/[0.08] active:scale-[0.97] disabled:opacity-50"
              >
                {t("common.cancel", "Cancel")}
              </button>

              {/* Sign Out — red */}
              <button
                type="button"
                disabled={isSigningOut}
                onClick={handleSignOut}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-red-500 py-3 text-sm font-bold text-white shadow-lg shadow-red-500/20 transition-all hover:bg-red-600 active:scale-[0.97] disabled:opacity-70"
              >
                {isSigningOut ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{t("settings.signingOut", "Signing out...")}</span>
                  </>
                ) : (
                  <span>{t("settings.signOut", "Sign Out")}</span>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
