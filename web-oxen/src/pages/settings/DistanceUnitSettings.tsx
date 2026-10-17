import { useCallback } from "react";
import { motion } from "framer-motion";
import { Ruler, Check } from "lucide-react";

import SettingsPageShell, { Card } from "@/components/SettingsPageShell";
import { usePreferences, type DistanceUnit } from "@/contexts/PreferencesContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const UNITS: { value: DistanceUnit; label: string; symbol: string; description: string }[] = [
  { value: "km", label: "Kilometers", symbol: "km", description: "Used worldwide · metric system" },
  { value: "mi", label: "Miles", symbol: "mi", description: "Used in US, UK · imperial system" },
];

export default function DistanceUnitSettings() {
  const { distanceUnit, setDistanceUnit, formatDistance } = usePreferences();
  const { toast } = useToast();

  const handleSelect = useCallback((unit: DistanceUnit) => {
    setDistanceUnit(unit);
    toast({
      title: "Distance unit updated",
      description: `Distances now display in ${unit === "km" ? "kilometers" : "miles"}.`,
    });
  }, [setDistanceUnit, toast]);

  return (
    <SettingsPageShell
      title="Distance Unit"
      subtitle="How distances are shown"
      icon={<Ruler className="h-4.5 w-4.5" />}
    >
      {/* Preview */}
      <div className="glass rounded-2xl border border-white/[0.06] p-5 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
          Example Distance
        </p>
        <p className="font-display text-3xl font-extrabold text-primary">
          {formatDistance(42)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Tashkent → Samarkand</p>
      </div>

      {/* Unit options */}
      <Card>
        {UNITS.map((unit) => {
          const isActive = distanceUnit === unit.value;
          return (
            <button
              key={unit.value}
              onClick={() => handleSelect(unit.value)}
              className={cn(
                "flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-white/[0.04] active:scale-[0.98]",
                isActive && "bg-primary/5",
              )}
            >
              <span className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-base font-extrabold",
                isActive ? "bg-primary/20 text-primary" : "bg-white/[0.06] text-muted-foreground",
              )}>
                {unit.symbol}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold">{unit.label}</p>
                <p className="text-xs text-muted-foreground">{unit.description}</p>
              </div>
              {isActive && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20"
                >
                  <Check className="h-3.5 w-3.5 text-primary" />
                </motion.span>
              )}
            </button>
          );
        })}
      </Card>

      <p className="px-1 text-center text-[11px] text-muted-foreground">
        Maps, routes, and nearby places update instantly.
      </p>
    </SettingsPageShell>
  );
}
