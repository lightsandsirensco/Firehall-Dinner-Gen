/**
 * Share-ready meal card — story/reel friendly layout with LS + Firehall branding.
 */

import { BRAND_NAME } from "@/lib/brand-copy";
import { LIGHTS_AND_SIRENS } from "@/lib/lights-and-sirens";
import { MealHeroImage } from "@/components/meal-hero-image";
import { MealTrustBadges } from "@/components/trust/meal-trust-badges";
import type { MealTrustInput } from "@shared/meal-trust/badges";

export type MealShareCardProps = {
  title: string;
  subtitle?: string;
  heroImage: string;
  imageAlt: string;
  emoji?: string;
  trustInput?: MealTrustInput;
  /** e.g. wheel result, generator pick */
  eyebrow?: string;
  className?: string;
};

/** Vertical 9:16-friendly share surface (screenshot or future canvas export) */
export function MealShareCard({
  title,
  subtitle,
  heroImage,
  imageAlt,
  emoji,
  trustInput,
  eyebrow = "Tonight's hall meal",
  className,
}: MealShareCardProps) {
  return (
    <div
      className={`relative w-full max-w-[360px] mx-auto aspect-[9/16] rounded-3xl overflow-hidden border border-border/50 bg-zinc-950 shadow-2xl ${className ?? ""}`}
      data-testid="meal-share-card"
    >
      <div className="absolute inset-0">
        <MealHeroImage
          src={heroImage}
          alt={imageAlt}
          emoji={emoji}
          title={title}
          variant="cinematic"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/20" />
      </div>

      <div className="relative z-10 flex flex-col justify-between h-full p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/70 font-semibold">
            {BRAND_NAME}
          </p>
          <p className="text-[9px] text-white/50">FirehallMeals.com</p>
        </div>

        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.25em] text-primary font-semibold">
            {eyebrow}
          </p>
          <h2 className="font-heading text-2xl text-white leading-tight tracking-wide">
            {title}
          </h2>
          {subtitle && (
            <p className="text-sm text-white/75 leading-snug line-clamp-2">{subtitle}</p>
          )}
          {trustInput && <MealTrustBadges input={trustInput} max={2} size="sm" />}
        </div>

        <p className="text-[10px] text-white/55 text-center">
          Built by{" "}
          <span className="text-white/80 font-medium">{LIGHTS_AND_SIRENS.name}</span>
        </p>
      </div>
    </div>
  );
}

export async function shareMealNative(data: {
  title: string;
  text: string;
  url?: string;
}): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.share) return false;
  try {
    await navigator.share({
      title: data.title,
      text: data.text,
      url: data.url ?? window.location.href,
    });
    return true;
  } catch {
    return false;
  }
}
