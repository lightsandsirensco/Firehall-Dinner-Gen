import { ExternalLink } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import {
  BRAND_NAME,
  BRAND_TAGLINE,
  COPYRIGHT_NOTICE,
  CTA,
  FOOTER_SUBLINE,
  FOOTER_TAGLINE,
  RECIPE_IMAGE_DISCLOSURE,
} from "@/lib/brand-copy";
import {
  LIGHTS_AND_SIRENS,
  LIGHTS_COPY,
  LIGHTS_FOOTER_LINKS,
} from "@/lib/lights-and-sirens";
import { LightsAndSirensLink } from "@/components/brand/lights-and-sirens-link";
import { BrandLogo } from "@/components/brand/brand-logo";
import { HALL_FEEDBACK_COPY } from "@shared/hall-feedback/copy";
import { HallFeedbackFooterLink } from "@/components/hall-feedback/hall-feedback-footer-link";
import { FooterNewsletter } from "@/components/footer-newsletter";

type SiteFooterProps = {
  variant?: "full" | "compact";
  className?: string;
  /** Extra bottom padding for mobile sticky CTAs */
  pbSafe?: boolean;
  /** Defaults to on for the full footer only; the homepage has its own signup section. */
  newsletter?: boolean;
};

const SUPPORT_MAILTO = "mailto:support@firehallmeals.com?subject=Firehall%20Meals%20support";

const LEGAL_LINK_CLASS = "text-muted-foreground/80 hover:text-primary transition-colors underline-offset-4 hover:underline";

const LEGAL_DOT = (
  <span aria-hidden className="text-muted-foreground/40">
    ·
  </span>
);

/**
 * Brand sign-off, then copyright + Terms / Privacy / Support in one understated
 * row on desktop (stacked on mobile). Shared by both footer variants and the
 * minimal page footers. Aligns center by default; pass `align="start"` for left.
 */
export function SiteLegalLine({ className, align = "center" }: { className?: string; align?: "center" | "start" }) {
  const start = align === "start";
  return (
    <div
      className={cn("flex flex-col items-center gap-2 text-center", start && "lg:items-start lg:text-left", className)}
      data-testid="footer-legal-line"
    >
      <div className="space-y-0.5">
        <p className="text-xs font-medium tracking-wide text-foreground/80" data-testid="footer-brand-tagline">
          {FOOTER_TAGLINE}
        </p>
        <p className="text-[11px] text-muted-foreground/70">{FOOTER_SUBLINE}</p>
      </div>
      <div
        className={cn(
          "flex flex-col items-center gap-1.5 text-xs sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-3 sm:gap-y-1",
          start && "lg:justify-start",
        )}
      >
        <p className="text-muted-foreground/60" data-testid="footer-copyright">
          {COPYRIGHT_NOTICE}
        </p>
        <span aria-hidden className="hidden text-muted-foreground/40 sm:inline">
          ·
        </span>
        <nav aria-label="Legal" className="flex items-center justify-center gap-2">
          <Link href="/terms" className={LEGAL_LINK_CLASS}>
            Terms of Service
          </Link>
          {LEGAL_DOT}
          <Link href="/privacy" className={LEGAL_LINK_CLASS}>
            Privacy Policy
          </Link>
          {LEGAL_DOT}
          <a href={SUPPORT_MAILTO} className={LEGAL_LINK_CLASS}>
            Support
          </a>
        </nav>
      </div>
    </div>
  );
}

/** Understated parent-brand credit — only the brand name is a link. */
function ParentBrandCredit({ className }: { className?: string }) {
  return (
    <p className={cn("text-xs text-muted-foreground/60", className)} data-testid="footer-parent-brand-credit">
      Created by{" "}
      <a
        href={LIGHTS_AND_SIRENS.website}
        target="_blank"
        rel="noopener noreferrer"
        className="text-muted-foreground/80 hover:text-primary transition-colors underline-offset-4 hover:underline"
      >
        {LIGHTS_AND_SIRENS.name}
      </a>{" "}
      — a firefighter-owned brand.
    </p>
  );
}

export function SiteFooter({ variant = "full", className, pbSafe = false, newsletter = variant === "full" }: SiteFooterProps) {
  if (variant === "compact") {
    return (
      <footer
        className={cn(
          "border-t border-border/20 bg-background/80",
          pbSafe && "pb-safe-nav",
          className,
        )}
        data-testid="site-footer-compact"
      >
        <div className="max-w-[1400px] mx-auto px-page py-6 text-center space-y-2">
          {newsletter && <FooterNewsletter className="mx-auto pb-4 mb-2 border-b border-border/15" />}
          <p className="text-xs text-muted-foreground/80">{HALL_FEEDBACK_COPY.footerTagline}</p>
          <HallFeedbackFooterLink className="text-xs text-primary/85 hover:text-primary transition-colors underline-offset-4 hover:underline" />
          <p className="text-xs font-medium text-foreground/80 pt-1">{LIGHTS_COPY.footerTagline}</p>
          <p className="text-xs text-muted-foreground">
            {LIGHTS_COPY.footerSub}{" "}
            <LightsAndSirensLink variant="footer">Lights & Sirens Co.</LightsAndSirensLink>
          </p>
          <SiteLegalLine className="pt-2" />
          <p className="text-[11px] text-muted-foreground/60" data-testid="footer-image-disclosure">
            {RECIPE_IMAGE_DISCLOSURE}
          </p>
          <ParentBrandCredit />
        </div>
      </footer>
    );
  }

  return (
    <footer
      className={cn("border-t border-border/20 bg-background", pbSafe && "pb-safe-nav", className)}
      data-testid="site-footer-full"
    >
      <div className="max-w-[1400px] mx-auto px-page py-12 sm:py-14">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 hover:opacity-90 transition-opacity"
              data-testid="footer-logo"
              aria-label={`${BRAND_NAME} — Home`}
            >
              <BrandLogo className="h-7 w-7" />
              <p className="font-heading text-lg tracking-wide text-foreground">{BRAND_NAME}</p>
            </Link>
            <p className="mt-2 text-[10px] uppercase tracking-[0.28em] text-muted-foreground/70">
              {BRAND_TAGLINE}
            </p>
            <p className="mt-4 text-sm font-medium text-foreground/90">{LIGHTS_COPY.footerTagline}</p>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-md">
              {LIGHTS_COPY.footerSub}{" "}
              <LightsAndSirensLink variant="inline">Lights & Sirens Co.</LightsAndSirensLink>
              {" — "}
              {LIGHTS_COPY.footerBlurb}
            </p>
            <p className="mt-3 text-xs text-primary/80 font-semibold uppercase tracking-wider">
              {LIGHTS_AND_SIRENS.firefighterOwned}
            </p>
            {newsletter && <FooterNewsletter className="mt-6" />}
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Firehall Meals
              </h3>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <Link href="/generator" className="text-foreground/85 hover:text-primary transition-colors">
                    {CTA.findDinner}
                  </Link>
                </li>
                <li>
                  <Link href="/explore" className="text-foreground/85 hover:text-primary transition-colors">
                    {CTA.exploreMeals}
                  </Link>
                </li>
                <li>
                  <Link href="/wheel" className="text-foreground/85 hover:text-primary transition-colors">
                    {CTA.classicsWheel}
                  </Link>
                </li>
                <li>
                  <Link href="/pizza" className="text-foreground/85 hover:text-primary transition-colors">
                    Pizza Night
                  </Link>
                </li>
                <li>
                  <Link href="/explore" className="text-foreground/85 hover:text-primary transition-colors">
                    {CTA.viewRecipes}
                  </Link>
                </li>
                <li>
                  <Link href="/about" className="text-foreground/85 hover:text-primary transition-colors">
                    About
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Legal &amp; Support
              </h3>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <Link href="/privacy" className="text-foreground/85 hover:text-primary transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="text-foreground/85 hover:text-primary transition-colors">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <a href={SUPPORT_MAILTO} className="text-foreground/85 hover:text-primary transition-colors">
                    Contact support
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                <LightsAndSirensLink variant="plain" />
              </h3>
              <ul className="mt-3 space-y-2.5">
                {LIGHTS_FOOTER_LINKS.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group inline-flex items-start gap-1.5 text-sm text-foreground/85 hover:text-primary transition-colors"
                    >
                      <span>{link.label}</span>
                      <ExternalLink
                        className="w-3 h-3 mt-0.5 opacity-40 group-hover:opacity-70 shrink-0"
                        aria-hidden
                      />
                    </a>
                    {link.description && (
                      <p className="text-[11px] text-muted-foreground/80 mt-0.5 pl-0">{link.description}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border/15 text-center sm:text-left space-y-3">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground/75">{HALL_FEEDBACK_COPY.footerTagline}</p>
            <HallFeedbackFooterLink className="text-xs text-primary/80 hover:text-primary transition-colors underline-offset-4 hover:underline" />
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-border/15 text-center">
          <p className="text-[11px] text-muted-foreground/60" data-testid="footer-image-disclosure">
            {RECIPE_IMAGE_DISCLOSURE}
          </p>
        </div>

        <div className="mt-6 pt-6 border-t border-border/15 flex flex-col items-center gap-3 text-center lg:flex-row lg:items-end lg:justify-between lg:text-left">
          <SiteLegalLine align="start" />
          <ParentBrandCredit />
        </div>
      </div>
    </footer>
  );
}
