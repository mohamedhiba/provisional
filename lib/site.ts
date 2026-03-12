import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  BookOpen,
  ClipboardCheck,
  LayoutDashboard,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  shortLabel: string;
};

export const siteConfig = {
  name: "Proof",
  tagline: "Turn ambition into daily proof.",
  mission:
    "A command center for ruthless clarity, evidence of work, and nightly truth.",
  navItems: [
    {
      href: "/today",
      label: "Today",
      shortLabel: "Today",
      icon: LayoutDashboard,
    },
    {
      href: "/sessions",
      label: "Sessions",
      shortLabel: "Focus",
      icon: Activity,
    },
    {
      href: "/review/daily",
      label: "Daily Review",
      shortLabel: "Daily",
      icon: ClipboardCheck,
    },
    {
      href: "/review/weekly",
      label: "Weekly Review",
      shortLabel: "Weekly",
      icon: BookOpen,
    },
    {
      href: "/analytics",
      label: "Analytics",
      shortLabel: "Stats",
      icon: BarChart3,
    },
  ] satisfies NavItem[],
};
