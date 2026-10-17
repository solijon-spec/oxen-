import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MonitorSmartphone, Smartphone, Laptop, Monitor, LogOut, Check,
  MapPin, Clock, Globe2,
} from "lucide-react";

import SettingsPageShell, { Card, SectionLabel, PrimaryButton } from "@/components/SettingsPageShell";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Device {
  id: string;
  name: string;
  browser: string;
  os: string;
  location: string;
  ip: string;
  lastActive: string;
  isCurrent: boolean;
  icon: "smartphone" | "laptop" | "monitor";
}

const MOCK_DEVICES: Device[] = [
  {
    id: "dev-1",
    name: "iPhone 15 Pro",
    browser: "Safari 17",
    os: "iOS 18",
    location: "Tashkent, Uzbekistan",
    ip: "85.65.12.34",
    lastActive: "Active now",
    isCurrent: true,
    icon: "smartphone",
  },
  {
    id: "dev-2",
    name: "MacBook Pro 14",
    browser: "Chrome 125",
    os: "macOS 14",
    location: "Tashkent, Uzbekistan",
    ip: "85.65.12.34",
    lastActive: "2 hours ago",
    isCurrent: false,
    icon: "laptop",
  },
  {
    id: "dev-3",
    name: "Windows Desktop",
    browser: "Edge 125",
    os: "Windows 11",
    location: "Samarkand, Uzbekistan",
    ip: "91.196.44.12",
    lastActive: "1 day ago",
    isCurrent: false,
    icon: "monitor",
  },
  {
    id: "dev-4",
    name: "Samsung Galaxy S24",
    browser: "Chrome 125",
    os: "Android 14",
    location: "Bukhara, Uzbekistan",
    ip: "78.111.22.55",
    lastActive: "3 days ago",
    isCurrent: false,
    icon: "smartphone",
  },
];

const ICON_MAP = {
  smartphone: Smartphone,
  laptop: Laptop,
  monitor: Monitor,
};

export default function ActiveDevices() {
  const { toast } = useToast();
  const [devices, setDevices] = useState<Device[]>(MOCK_DEVICES);

  const handleLogout = useCallback((id: string) => {
    setDevices((prev) => prev.filter((d) => d.id !== id));
    toast({ title: "Device logged out", description: "The session has been terminated." });
  }, [toast]);

  const handleLogoutAll = useCallback(() => {
    setDevices((prev) => prev.filter((d) => d.isCurrent));
    toast({ title: "All other devices logged out", description: "Sessions on other devices have been terminated." });
  }, [toast]);

  const currentDevice = devices.find((d) => d.isCurrent);
  const otherDevices = devices.filter((d) => !d.isCurrent);

  return (
    <SettingsPageShell
      title="Active Devices"
      subtitle={`${devices.length} device${devices.length !== 1 ? "s" : ""} signed in`}
      icon={<MonitorSmartphone className="h-4.5 w-4.5" />}
    >
      {/* Current device */}
      {currentDevice && (
        <>
          <SectionLabel>This Device</SectionLabel>
          <DeviceCard device={currentDevice} />
        </>
      )}

      {/* Other devices */}
      {otherDevices.length > 0 && (
        <>
          <SectionLabel>Other Devices ({otherDevices.length})</SectionLabel>
          <Card>
            {otherDevices.map((device) => {
              const Icon = ICON_MAP[device.icon];
              return (
                <div key={device.id} className="flex items-center gap-3 px-4 py-3.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-muted-foreground">
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{device.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {device.browser} · {device.os}
                    </p>
                    <div className="mt-1 flex items-center gap-3 text-[10px] text-muted-foreground/70">
                      <span className="flex items-center gap-0.5">
                        <MapPin className="h-2.5 w-2.5" /> {device.location}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <Clock className="h-2.5 w-2.5" /> {device.lastActive}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleLogout(device.id)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive active:scale-90"
                    aria-label="Log out device"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </Card>

          <PrimaryButton
            onClick={handleLogoutAll}
            className="border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20"
          >
            <LogOut className="h-4 w-4" />
            Log Out All Other Devices
          </PrimaryButton>
        </>
      )}

      {otherDevices.length === 0 && (
        <div className="glass flex flex-col items-center justify-center rounded-2xl border border-white/[0.06] py-12 text-center">
          <Check className="mb-2 h-8 w-8 text-emerald-400" />
          <p className="text-sm font-semibold">No other active devices</p>
          <p className="mt-1 text-xs text-muted-foreground">This is the only device signed in to your account</p>
        </div>
      )}
    </SettingsPageShell>
  );
}

function DeviceCard({ device }: { device: Device }) {
  const Icon = ICON_MAP[device.icon];
  return (
    <div className="glass rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
          <Icon className="h-5 w-5" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold truncate">{device.name}</p>
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] font-bold text-emerald-400">
              <Check className="h-2.5 w-2.5" /> CURRENT
            </span>
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {device.browser} · {device.os}
          </p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <InfoCell icon={MapPin} label="Location" value={device.location} />
        <InfoCell icon={Globe2} label="IP Address" value={device.ip} />
        <InfoCell icon={Clock} label="Last Active" value={device.lastActive} />
      </div>
    </div>
  );
}

function InfoCell({
  icon: Icon, label, value,
}: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/[0.03] px-3 py-2">
      <div className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-2.5 w-2.5" /> {label}
      </div>
      <p className="mt-0.5 text-xs font-medium text-foreground truncate">{value}</p>
    </div>
  );
}
