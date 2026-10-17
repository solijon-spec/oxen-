import {
  Users,
  FileStack,
  Package,
  UserCog,
  BarChart3,
  Star,
  CreditCard as SubscriptionIcon,
  Settings as SettingsIcon,
  LifeBuoy,
} from "lucide-react";

import { DashboardShell } from "@/components/consulting/DashboardShell";
import { ModuleComingSoon } from "@/components/consulting/ModuleComingSoon";
import { useSEO } from "@/hooks/use-seo";

/**
 * Wrapper pages for consulting dashboard sections that are not built yet.
 * Each renders the polished ModuleComingSoon inside the shared DashboardShell
 * so navigation stays consistent and there are no broken buttons.
 */

function ComingSoonPage({
  title,
  icon,
  description,
  features,
}: {
  title: string;
  icon: Parameters<typeof ModuleComingSoon>[0]["icon"];
  description: string;
  features?: string[];
}) {
  useSEO({ title: `${title} | OXEN Consulting`, description });
  return (
    <DashboardShell title={title}>
      <ModuleComingSoon title={title} icon={icon} description={description} features={features} />
    </DashboardShell>
  );
}

export function ReviewsComingSoon() {
  return (
    <ComingSoonPage
      title="Reviews"
      icon={Star}
      description="Read and respond to client reviews of your consulting services."
      features={["Review list", "Reply to reviews", "Rating breakdown", "Flag inappropriate reviews"]}
    />
  );
}

export function SubscriptionComingSoon() {
  return (
    <ComingSoonPage
      title="Subscription"
      icon={SubscriptionIcon}
      description="Manage your OXEN Consulting subscription plan, billing, and renewal."
      features={["Change plan", "Update payment method", "View invoices", "Cancel subscription"]}
    />
  );
}

export function SettingsComingSoon() {
  return (
    <ComingSoonPage
      title="Settings"
      icon={SettingsIcon}
      description="Configure your company settings: team, security, notifications, and more."
      features={["Company information", "Team & permissions", "Security", "Notifications", "Language & currency"]}
    />
  );
}

export function SupportComingSoon() {
  return (
    <ComingSoonPage
      title="Help & Support"
      icon={LifeBuoy}
      description="Get help from the OXEN team with your consulting dashboard."
      features={["Contact support", "Knowledge base", "Live chat (Phase 2)", "System status"]}
    />
  );
}
