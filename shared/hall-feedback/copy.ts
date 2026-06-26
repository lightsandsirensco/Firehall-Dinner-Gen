/** Hall Feedback — shared UI copy (brand tone: gritty, clean, firefighter-built). */

export const HALL_FEEDBACK_COPY = {
  fabLabel: "Hall Feedback",
  modalTitle: "Help Shape the Hall",
  modalSubtitle: "Built by firefighters. Improved every shift.",
  placeholder: "What should we improve, fix, or add?",
  emailLabel: "Email (optional)",
  emailPlaceholder: "you@station.com",
  submit: "Submit",
  cancel: "Cancel",
  footerBeta: "FirehallMeals Beta",
  footerTagline: "Built by firefighters. Improved every shift.",
  footerLink: "Hall Feedback",
  generatorSmoked:
    "Meal picker hit a snag. Try again or send feedback.",
  generatorSmokedAction: "send feedback",
  successToast: "Got it — the hall hears you.",
} as const;

export const GENERATOR_SMOKED_ERROR = HALL_FEEDBACK_COPY.generatorSmoked;
