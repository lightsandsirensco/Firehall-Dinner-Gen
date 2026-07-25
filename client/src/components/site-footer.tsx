import { Flame, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { BRAND_NAME, BRAND_TAGLINE, CTA } from "@/lib/brand-copy";
import {
  LIGHTS_AND_SIRENS,
  LIGHTS_COPY,
  LIGHTS_FOOTER_LINKS,
} from "@/lib/lights-and-sirens";
import { LightsAndSirensLink } from "@/components/brand/lights-and-sirens-link";
import { HALL_FEEDBACK_COPY } from "@shared/hall-feedback/copy";
import { HallFeedbackFooterLink } from "@/components/hall-feedback/hall-feedback-footer-link";

type SiteFooterProps = {
  variant?: "full" | "compact";
  className?: string;
  /** Extra bottom padding for mobile sticky CTAs */
  pbSafe?: boolean;
};

export function SiteFooter({ variant = "full", className, pbSafe = false }: SiteFooterProps) {
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
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/70">
            {HALL_FEEDBACK_COPY.footerBeta}
          </p>
          <p className="text-xs text-muted-foreground/80">{HALL_FEEDBACK_COPY.footerTagline}</p>
          <HallFeedbackFooterLink className="text-xs text-primary/85 hover:text-primary transition-colors underline-offset-4 hover:underline" />
          <p className="text-xs font-medium text-foreground/80 pt-1">{LIGHTS_COPY.footerTagline}</p>
          <p className="text-xs text-muted-foreground">
            {LIGHTS_COPY.footerSub}{" "}
            <LightsAndSirensLink variant="footer">Lights & Sirens Co.</LightsAndSirensLink>
          </p>
        </div>
      </footer>
    );
  }

  return (
    <footer
      className={cn("border-t border-border/20 bg-[hsl(0_0%_5%)]", pbSafe && "pb-safe-nav", className)}
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
              <Flame className="w-5 h-5 text-primary" aria-hidden />
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
          </div>

          <div className="grid gap-8 sm:grid-cols-2">
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
                Lights & Sirens Co.
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
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/65">
              {HALL_FEEDBACK_COPY.footerBeta}
            </p>
            <p className="text-xs text-muted-foreground/75">{HALL_FEEDBACK_COPY.footerTagline}</p>
            <HallFeedbackFooterLink className="text-xs text-primary/80 hover:text-primary transition-colors underline-offset-4 hover:underline" />
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-border/15 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <p className="text-xs text-muted-foreground/60">
            © {new Date().getFullYear()} {BRAND_NAME} ·{" "}
            <LightsAndSirensLink variant="inline" className="text-xs">
              {LIGHTS_AND_SIRENS.builtByLabel}
            </LightsAndSirensLink>
          </p>
          <a
            href={LIGHTS_AND_SIRENS.home}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-heading uppercase tracking-wider text-primary hover:text-primary/85"
          >
            {LIGHTS_COPY.visitCta} →
          </a>
        </div>
      </div>
    </footer>
  );
}
