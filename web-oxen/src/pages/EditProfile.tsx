import { motion, AnimatePresence } from "framer-motion";
import { useState, useCallback, useRef, type ChangeEvent } from "react";
import {
  ArrowLeft, Camera, User as UserIcon, AtSign, FileText, Mail,
  Phone, Calendar, Users, Globe2, MapPin, Check, Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useTravel, type ExtendedProfile } from "@/contexts/TravelContext";
import { COUNTRIES } from "@/data/countries";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function EditProfile() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { extendedProfile, updateProfile, profilePhoto, setProfilePhoto } = useTravel();

  const [form, setForm] = useState<ExtendedProfile>(extendedProfile);
  const [saving, setSaving] = useState<boolean>(false);
  const [saved, setSaved] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = useCallback((field: keyof ExtendedProfile, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handlePhotoUpload = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => setProfilePhoto(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  }, [setProfilePhoto]);

  const handleSave = useCallback(() => {
    setSaving(true);
    setTimeout(() => {
      updateProfile(form);
      setSaving(false);
      setSaved(true);
      toast({ title: "Profile updated", description: "Your changes have been saved." });
      setTimeout(() => navigate("/profile"), 800);
    }, 1000);
  }, [form, updateProfile, toast, navigate]);

  const initials = form.fullName.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase() || "OX";

  return (
    <div className="relative mx-auto max-w-lg px-4 pt-2 pb-32">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 pt-2 pb-5"
      >
        <button
          onClick={() => navigate("/profile")}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-card/50 backdrop-blur-xl border border-white/10 text-muted-foreground transition hover:bg-card/70 hover:text-foreground active:scale-90"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="font-display text-xl font-extrabold">Edit Profile</h1>
          <p className="text-xs text-muted-foreground">Update your personal information</p>
        </div>
      </motion.div>

      {/* Photo section */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, type: "spring" as const, stiffness: 280, damping: 24 }}
        className="flex flex-col items-center mb-6"
      >
        <button
          onClick={() => fileInputRef.current?.click()}
          className="group relative flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-amber-400/30 via-amber-500/20 to-orange-500/30 p-[3px] shadow-lg transition-transform hover:scale-[1.03] active:scale-95"
        >
          <div className="flex h-full w-full items-center justify-center rounded-full bg-card overflow-hidden">
            {profilePhoto ? (
              <img src={profilePhoto} alt={form.fullName} className="h-full w-full object-cover" />
            ) : (
              <span className="font-display text-4xl font-extrabold text-foreground/70">{initials}</span>
            )}
          </div>
          <div className="absolute inset-[3px] flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
            <Camera className="h-7 w-7 text-white/70" />
          </div>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePhotoUpload}
        />
        <p className="mt-3 text-xs text-muted-foreground">Tap to change profile photo</p>
      </motion.div>

      {/* Form fields */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-4"
      >
        {/* Full Name */}
        <FieldRow icon={UserIcon} label="Full Name">
          <input
            value={form.fullName}
            onChange={(e) => handleChange("fullName", e.target.value)}
            className="w-full bg-transparent text-sm font-medium text-foreground focus:outline-none"
            placeholder="Your full name"
          />
        </FieldRow>

        {/* Username */}
        <FieldRow icon={AtSign} label="Username">
          <input
            value={form.username}
            onChange={(e) => handleChange("username", e.target.value.replace(/\s/g, "_").toLowerCase())}
            className="w-full bg-transparent text-sm font-medium text-foreground focus:outline-none"
            placeholder="username"
          />
        </FieldRow>

        {/* Bio */}
        <FieldRow icon={FileText} label="Bio">
          <textarea
            value={form.bio}
            onChange={(e) => handleChange("bio", e.target.value)}
            rows={3}
            className="w-full resize-none bg-transparent text-sm font-medium text-foreground focus:outline-none"
            placeholder="Tell the world about your travels..."
          />
        </FieldRow>

        {/* Email */}
        <FieldRow icon={Mail} label="Email Address">
          <input
            type="email"
            value={form.email}
            onChange={(e) => handleChange("email", e.target.value)}
            className="w-full bg-transparent text-sm font-medium text-foreground focus:outline-none"
            placeholder="you@example.com"
          />
        </FieldRow>

        {/* Phone */}
        <FieldRow icon={Phone} label="Phone Number">
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
            className="w-full bg-transparent text-sm font-medium text-foreground focus:outline-none"
            placeholder="+1 234 567 890"
          />
        </FieldRow>

        {/* Date of Birth */}
        <FieldRow icon={Calendar} label="Date of Birth">
          <input
            type="date"
            value={form.dateOfBirth}
            onChange={(e) => handleChange("dateOfBirth", e.target.value)}
            className="w-full bg-transparent text-sm font-medium text-foreground focus:outline-none"
          />
        </FieldRow>

        {/* Gender */}
        <FieldRow icon={Users} label="Gender">
          <select
            value={form.gender}
            onChange={(e) => handleChange("gender", e.target.value)}
            className="w-full bg-transparent text-sm font-medium text-foreground focus:outline-none cursor-pointer"
          >
            <option value="male" className="bg-card">Male</option>
            <option value="female" className="bg-card">Female</option>
            <option value="other" className="bg-card">Other</option>
            <option value="prefer-not-say" className="bg-card">Prefer not to say</option>
          </select>
        </FieldRow>

        {/* Country */}
        <FieldRow icon={Globe2} label="Country">
          <select
            value={form.country}
            onChange={(e) => handleChange("country", e.target.value)}
            className="w-full bg-transparent text-sm font-medium text-foreground focus:outline-none cursor-pointer"
          >
            <option value="" className="bg-card">Select country</option>
            {COUNTRIES.map((c) => (
              <option key={c.id} value={c.name} className="bg-card">{c.flag} {c.name}</option>
            ))}
          </select>
        </FieldRow>

        {/* City */}
        <FieldRow icon={MapPin} label="City">
          <input
            value={form.city}
            onChange={(e) => handleChange("city", e.target.value)}
            className="w-full bg-transparent text-sm font-medium text-foreground focus:outline-none"
            placeholder="Your city"
          />
        </FieldRow>
      </motion.div>

      {/* Save button */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-8"
      >
        <button
          onClick={handleSave}
          disabled={saving}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold transition-all active:scale-[0.98]",
            saved
              ? "bg-emerald-500 text-white"
              : "gold-gradient text-primary-foreground shadow-lg hover:shadow-xl",
          )}
        >
          {saving ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Saving changes...
            </>
          ) : saved ? (
            <>
              <Check className="h-5 w-5" />
              Saved successfully!
            </>
          ) : (
            "Save Changes"
          )}
        </button>
        <button
          onClick={() => navigate("/profile")}
          className="mt-3 w-full rounded-2xl border border-white/[0.08] py-3.5 text-sm font-semibold text-muted-foreground transition hover:bg-white/[0.04] active:scale-95"
        >
          Cancel
        </button>
      </motion.div>
    </div>
  );
}

/* ── Reusable field row ── */

function FieldRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof UserIcon;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="profile-input-field rounded-2xl px-4 py-3.5">
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-muted-foreground">
          <Icon className="h-4 w-4" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
