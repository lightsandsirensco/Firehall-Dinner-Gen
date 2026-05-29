import { ExternalLink, Flame } from "lucide-react";
import { LIGHTS_AND_SIRENS, LIGHTS_COPY, LIGHTS_FOOTER_LINKS } from "@/lib/lights-and-sirens";
import { LightsAndSirensLink } from "./lights-and-sirens-link";

/** Brand block at bottom of mobile nav sheet */
export function LightsAndSirensMobilePanel() {
  return (
    <div
      className="mt-6 pt-5 border-t border-border/30 rounded-xl bg-primary/[0.05] ring-1 ring-primary/15 px-4 py-4"
      data-testid="nav-mobile-lights-panel"
    >
      <div className="flex items-center gap-2 text-primary/90">
        <Flame className="w-3.5 h-3.5" aria-hidden />
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em]">
          {LIGHTS_AND_SIRENS.firefighterOwned}
        </span>
      </div>
      <p className="mt-2 text-sm text-foreground/90 leading-snug">
        Built by <LightsAndSirensLink variant="inline">Lights & Sirens Co.</LightsAndSirensLink>
      </p>
      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{LIGHTS_COPY.footerBlurb}</p>
      <ul className="mt-3 flex flex-col gap-2">
        {LIGHTS_FOOTER_LINKS.slice(0, 3).map((link) => (
          <li key={link.href}>
            <a
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/85"
            >
              {link.label}
              <ExternalLink className="w-3 h-3 opacity-60" aria-hidden />
            </a>
          </li>
        ))}
      </ul>
      <a
        href={LIGHTS_AND_SIRENS.home}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-block text-xs font-heading uppercase tracking-wider text-primary"
      >
        {LIGHTS_COPY.visitCta} →
      </a>
    </div>
  );
}
