import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  Cloud,
  Coffee,
  Heart,
  History,
  Layers,
  RotateCw,
  Shield,
  ShoppingCart,
  ShoppingBag,
  Sparkles,
  Tag,
  Users,
  Vote,
  Wallet,
  Warehouse,
} from "lucide-react";
import type { PlanId } from "@shared/billing/types";

export interface PlanFeatureItem {
  label: string;
  icon: LucideIcon;
}

export type PlanCtaKind = "link" | "upgrade" | "disabled";

export interface PlanPresentation {
  planId: PlanId;
  title: string;
  price: string;
  pricePeriod?: string;
  tagline: string;
  features: PlanFeatureItem[];
  footer: string;
  ctaLabel: string;
  ctaKind: PlanCtaKind;
  ctaHref?: string;
  badge?: string;
  recommended?: boolean;
  comingSoon?: boolean;
}

export const PLANS_PAGE = {
  title: "Choose Your Plan",
  subtitle:
    "Whether you're cooking for yourself or your entire crew, Firehall Meals has a plan for you.",
} as const;

export const PLAN_PRESENTATIONS: Record<PlanId, PlanPresentation> = {
  guest: {
    planId: "guest",
    title: "Free",
    price: "$0",
    tagline: "Start cooking tonight—no account required.",
    features: [
      { label: "Meal Generator", icon: Sparkles },
      { label: "Classics Wheel", icon: RotateCw },
      { label: "Browse Recipes", icon: BookOpen },
    ],
    footer: "Perfect for trying Firehall Meals.",
    ctaLabel: "Get Started",
    ctaKind: "link",
    ctaHref: "/generator",
  },
  personal: {
    planId: "personal",
    title: "Firefighter Plus",
    price: "$4.99",
    pricePeriod: "/month",
    tagline: "Everything in Free, plus tools built for firefighters.",
    badge: "Most popular",
    features: [
      { label: "Sync meals across all your devices", icon: Cloud },
      { label: "Save favorite meals", icon: Heart },
      { label: "Personal meal history", icon: History },
      { label: "Grocery lists", icon: ShoppingBag },
      { label: "Shift reminders", icon: Bell },
      { label: "Join your fire hall", icon: Users },
      { label: "Participate in hall voting", icon: Vote },
      { label: "View your hall canteen", icon: Coffee },
      { label: "Weekly protein deals", icon: Tag },
    ],
    footer: "Save time, stay organized, and spend less on groceries.",
    ctaLabel: "Start Free Trial",
    ctaKind: "upgrade",
    recommended: true,
  },
  hall_pro: {
    planId: "hall_pro",
    title: "Hall Pro",
    price: "Contact Us",
    tagline:
      "Built for entire fire halls. Manage meals, canteen operations, and crew collaboration from one place.",
    badge: "Coming soon",
    features: [
      { label: "Everything in Firefighter Plus", icon: Layers },
      { label: "Shared shopping lists", icon: ShoppingCart },
      { label: "Shared meal history", icon: History },
      { label: "Crew meal planning", icon: CalendarDays },
      { label: "Canteen management", icon: Warehouse },
      { label: "Canteen payment tracker", icon: Wallet },
      { label: "Hall analytics", icon: BarChart3 },
      { label: "Exclusive firefighter partner discounts", icon: Tag },
      { label: "Captain administration tools", icon: Shield },
    ],
    footer: "Designed for entire fire halls.",
    ctaLabel: "Coming Soon",
    ctaKind: "disabled",
    comingSoon: true,
  },
};

export const PLAN_CUSTOMER_LABELS: Record<PlanId, string> = {
  guest: "Free",
  personal: "Firefighter Plus",
  hall_pro: "Hall Pro",
};
