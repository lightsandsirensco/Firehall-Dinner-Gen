/**
 * Platform design tokens — Firehall Meals v2
 * Premium, operational, firefighter-first. Single source for layout + type.
 */
export const app = {
  page: "page-shell min-h-screen min-h-[100dvh] bg-background overflow-x-hidden",
  main: "max-w-[1400px] mx-auto px-page",
  mainFeed: "max-w-[1320px] mx-auto px-page",
  mainDetail: "max-w-[720px] mx-auto px-page",

  sectionY: "py-8 sm:py-12",
  sectionGap: "space-y-8 sm:space-y-12",
  stagger: "stagger-fade motion-reduce:[&>*]:!animate-none",
  mealReveal: "meal-reveal motion-reduce:animate-none",

  /** Display — hero headlines only */
  display:
    "font-heading text-[2.75rem] sm:text-5xl md:text-[3.25rem] leading-[0.95] tracking-tight text-foreground",

  /** Page titles (Explore, etc.) */
  titlePage:
    "font-heading text-3xl sm:text-[2.75rem] leading-[1.05] tracking-tight text-foreground",

  titleSection:
    "font-heading text-2xl sm:text-[1.75rem] leading-[1.1] tracking-tight text-foreground",

  titleMeal:
    "font-heading text-[1.75rem] sm:text-3xl leading-[1.1] tracking-tight text-foreground",

  lead: "text-base sm:text-lg text-muted-foreground leading-relaxed font-normal",
  subtitle: "text-sm sm:text-base text-muted-foreground leading-relaxed",
  label: "text-xs font-medium text-muted-foreground tracking-wide",
  caption: "text-[11px] text-muted-foreground/80 leading-snug",

  eyebrowMuted:
    "text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/70",

  /** @deprecated use eyebrowMuted */
  eyebrow:
    "text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/70",

  pill:
    "inline-flex items-center rounded-full bg-muted/40 border border-border/30 px-3 py-1.5 text-xs font-medium text-foreground/90",

  /** Image-dominant cards */
  cardCinematic:
    "relative overflow-hidden rounded-2xl sm:rounded-3xl ring-1 ring-white/[0.08] shadow-xl shadow-black/40 transition-[transform,box-shadow] duration-300 ease-out active:scale-[0.99] touch-manipulation",

  panel:
    "rounded-2xl border border-border/25 bg-card/30 backdrop-blur-sm",

  stickyBar: "mobile-sticky-bar lg:hidden",
} as const;

export const type = {
  display: app.display,
  h1: app.titlePage,
  h2: app.titleSection,
  h3: app.titleMeal,
  body: "text-[15px] leading-relaxed text-foreground/90",
  bodyMuted: app.subtitle,
  caption: app.caption,
} as const;

export const motion = {
  transition: "duration-300 ease-out",
  transitionSlow: "duration-500 ease-out",
  hoverScale:
    "hover:scale-[1.01] active:scale-[0.99] motion-reduce:transition-none motion-reduce:hover:scale-100",
} as const;
