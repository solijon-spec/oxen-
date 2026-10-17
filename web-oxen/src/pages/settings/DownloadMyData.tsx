import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Download, Check, Loader2, FileText, Image, MessageSquare,
  MapPin, Heart, Settings as SettingsIcon, Star,
} from "lucide-react";

import SettingsPageShell, { Card, SectionLabel, PrimaryButton } from "@/components/SettingsPageShell";
import { useAuth } from "@/contexts/AuthContext";
import { useTravel } from "@/contexts/TravelContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface DataSection {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  count: string;
  included: boolean;
}

export default function DownloadMyData() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { visited, wishlist, favorites, posts, stories, extendedProfile } = useTravel();
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set([
    "profile", "trips", "favorites", "messages", "support", "settings", "reviews",
  ]));

  const sections: DataSection[] = [
    { key: "profile", label: "Profile Information", icon: FileText, count: "1 record", included: true },
    { key: "trips", label: "Trips & Bookings", icon: MapPin, count: `${visited.length} visited`, included: true },
    { key: "favorites", label: "Favorites & Wishlist", icon: Heart, count: `${favorites.length + wishlist.length} items`, included: true },
    { key: "posts", label: "Posts & Media", icon: Image, count: `${posts.length + stories.length} items`, included: true },
    { key: "messages", label: "Messages", icon: MessageSquare, count: "Conversations", included: true },
    { key: "support", label: "Support History", icon: MessageSquare, count: "Tickets", included: true },
    { key: "settings", label: "Settings & Preferences", icon: SettingsIcon, count: "All settings", included: true },
    { key: "reviews", label: "Reviews", icon: Star, count: "Submitted reviews", included: true },
  ];

  const toggleSection = useCallback((key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const handleDownload = useCallback(async () => {
    setGenerating(true);
    await new Promise((r) => setTimeout(r, 1800));

    // Build JSON archive
    const archive = {
      exportedAt: new Date().toISOString(),
      user: {
        id: user?.id,
        name: user?.name,
        email: user?.email,
        profile: extendedProfile,
      },
      sections: {
        profile: selected.has("profile") ? extendedProfile : null,
        trips: selected.has("trips") ? { visited, wishlist } : null,
        favorites: selected.has("favorites") ? { favorites } : null,
        posts: selected.has("posts") ? { posts, stories } : null,
        messages: selected.has("messages") ? "Messages data" : null,
        support: selected.has("support") ? "Support history" : null,
        settings: selected.has("settings") ? "All settings" : null,
        reviews: selected.has("reviews") ? "Reviews" : null,
      },
    };

    const blob = new Blob([JSON.stringify(archive, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `oxen-data-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    setGenerating(false);
    setGenerated(true);
    toast({ title: "Data archive downloaded", description: "Your data has been exported successfully." });
    setTimeout(() => setGenerated(false), 3000);
  }, [selected, user, extendedProfile, visited, wishlist, favorites, posts, stories, toast]);

  return (
    <SettingsPageShell
      title="Download My Data"
      subtitle="Export a copy of your data"
      icon={<Download className="h-4.5 w-4.5" />}
    >
      {/* Info */}
      <div className="glass rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4">
        <p className="text-sm font-semibold">Your data, your control</p>
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
          Download a complete archive of your OXEN data. This includes your profile,
          trips, favorites, posts, messages, and settings — in JSON format.
        </p>
      </div>

      {/* Section selection */}
      <SectionLabel>Select Data to Include</SectionLabel>
      <Card>
        {sections.map((section) => {
          const isSelected = selected.has(section.key);
          return (
            <button
              key={section.key}
              onClick={() => toggleSection(section.key)}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-white/[0.04] active:scale-[0.98]"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-muted-foreground">
                <section.icon className="h-4 w-4" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{section.label}</p>
                <p className="text-xs text-muted-foreground">{section.count}</p>
              </div>
              <span className={cn(
                "flex h-6 w-6 items-center justify-center rounded-lg border-2 transition-all",
                isSelected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-white/[0.12] bg-transparent",
              )}>
                {isSelected && <Check className="h-3.5 w-3.5" />}
              </span>
            </button>
          );
        })}
      </Card>

      {/* Download button */}
      <PrimaryButton
        onClick={handleDownload}
        disabled={selected.size === 0 || generating}
        className={cn(
          generated ? "bg-emerald-500 text-white" : "gold-gradient text-primary-foreground shadow-lg",
        )}
      >
        {generating ? (
          <><Loader2 className="h-5 w-5 animate-spin" /> Generating archive...</>
        ) : generated ? (
          <><Check className="h-5 w-5" /> Download complete!</>
        ) : (
          <><Download className="h-4 w-4" /> Download {selected.size} section{selected.size !== 1 ? "s" : ""}</>
        )}
      </PrimaryButton>
    </SettingsPageShell>
  );
}
