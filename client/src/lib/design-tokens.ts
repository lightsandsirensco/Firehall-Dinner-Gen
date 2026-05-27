/**
 * Mobile-first design tokens — single source for spacing, type, surfaces, motion.
 * Prefer these over one-off Tailwind in page shells.
 */
export const app = {
  page: "page-shell min-h-screen min-h-[100dvh] bg-background overflow-x-hidden",
  main: "max-w-[1400px] mx-auto px-page",
  mainFeed: "max-w-[1320px] mx-auto px-page",
  mainDetail: "max-w-[900px] mx-auto px-page",
  sectionY: "py-4 sm:py-6",
  sectionGap: "space-y-3 sm:space-y-4 lg:space-y-6",
  stagger: "stagger-fade motion-reduce:[&>*]:!animate-none",
  mealReveal: "meal-reveal motion-reduce:animate-none",

  /** Image-dominant cards (explore, favorites) */
  cardCinematic:
    "relative overflow-hidden rounded-2xl sm:rounded-[1.35rem] ring-1 ring-white/[0.12] shadow-lg shadow-black/30 transition-[transform,box-shadow] duration-300 ease-out active:scale-[0.98] touch-manipulation",

  /** Flat mobile panels (filters) — bordered only on lg */
  panel:
    "lg:rounded-xl lg:border lg:border-border/30 lg:bg-card/40 lg:backdrop-blur-sm",

  eyebrow:
    "inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-wide text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full",

  titlePage: "font-heading text-[1.65rem] sm:text-4xl leading-[1.1] tracking-tight text-foreground",
  titleMeal: "font-heading text-[1.65rem] sm:text-3xl md:text-4xl leading-[1.12] tracking-tight text-foreground",
  subtitle: "text-sm sm:text-base text-muted-foreground leading-relaxed",
  label: "text-[11px] font-medium text-muted-foreground",

  pill:
    "inline-flex items-center rounded-full bg-muted/60 border border-border/40 px-3 py-1.5 text-xs font-medium text-foreground",

  stickyBar: "mobile-sticky-bar lg:hidden",
} as const;

export const motion = {
  transition: "duration-300 ease-out",
  transitionSlow: "duration-500 ease-out",
  hoverScale: "hover:scale-[1.02] active:scale-[0.98] motion-reduce:transition-none motion-reduce:hover:scale-100",
} as const;
