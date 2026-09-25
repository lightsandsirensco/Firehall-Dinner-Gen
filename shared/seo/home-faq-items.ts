import type { FaqItem } from "./schema.js";

/**
 * Firefighter-focused FAQ — home ("Questions from the Crew"), /faq (full
 * list), /about (extended with ABOUT_FAQ_EXTRA), and FAQPage schema on all
 * three (client + server injection). Single source of truth — do not fork
 * a second FAQ list; add/edit here.
 *
 * Role on the homepage: a short, human answer to a real search question,
 * then — where a Firehall Meals page already covers that topic in depth —
 * a contextual link into it (see `link` below, rendered as "See {label} →"
 * by every consumer). The homepage isn't trying to rank for every
 * firefighter-meal keyword itself; it's a gateway into /firefighter-meals,
 * /firehouse-meals, /fire-station-meals, and the other topic-hub pages that
 * do that work. Answers intentionally do NOT restate the link's page name —
 * the link line supplies that once.
 */
export const HOME_FAQ_ITEMS: FaqItem[] = [
  {
    question: "What does Firehall Meals do for me as a firefighter?",
    answer:
      "Pick a shift dinner in seconds, save the ones you like, and get a shopping list scaled to your actual crew size. Every recipe has Cook Mode steps, nutrition info, and dietary filters built in, and the Classics Wheel picks something when nobody can decide. Sign in and your saved meals sync across devices.",
  },
  {
    question: "Do I need to join a hall to use Firehall Meals?",
    answer:
      "No. You can browse recipes, run the Generator, spin the Classics Wheel, and save favorites without linking a hall. Shared dinner votes, group grocery lists, and crew meal history are part of Hall Operations, which is still in private beta — join the waitlist for early access when it opens to your station.",
  },
  {
    question: "What are some good meals for firefighters?",
    answer:
      "Chili, chicken parm, smash burgers, pulled pork and taco bars are hard to beat — they scale for a crew, hold up if dinner gets delayed, and don't need fine-dining skills to pull off. That's the short list; there's a full rotation sorted by quick, high-protein, healthy and classic picks.",
    link: { href: "/firefighter-meals", label: "firefighter meals" },
  },
  {
    question: "What are classic firehouse meals every crew should know?",
    answer:
      "Chicken parm, chili, smash burgers, taco night, pulled pork and beef dip are firehouse staples for a reason — they scale easily, reheat fine, and nobody complains when they hit the table again. Rotate them through a normal week and nobody's hunting for a specialty ingredient.",
    link: { href: "/firehouse-meals", label: "firehouse meals" },
  },
  {
    question: "What are some cheap meals for a firehouse crew?",
    answer:
      "Chili, taco bars, pasta bakes, rice bowls and sheet-pan fajitas stretch a grocery budget the furthest — one protein, one starch, and a simple side feeds a lot of people. Most halls land somewhere around $10–15 a plate depending on the protein, less if you batch it and buy in bulk.",
    link: { href: "/fire-station-meals", label: "fire station meals" },
  },
  {
    question: "What are healthy meals for firefighters on long shifts?",
    answer:
      "High-protein sheet pans, salmon bowls, turkey chili and chicken fajita trays hit the balance of actually filling you up without tasting like punishment food. The goal on a long shift is protein and steady energy, not a diet plate nobody finishes.",
    link: { href: "/healthy-firefighter-meals", label: "healthy firefighter meals" },
  },
  {
    question: "What are good firehouse meals when dinner keeps getting interrupted?",
    answer:
      "Chili, braises, slow-cooker meals and sheet-pan dinners hold up best — they simmer, wait in a low oven, or reheat without turning to mush. Skip anything that needs last-second plating or precise timing on a night when the tones might drop mid-prep.",
    link: { href: "/fire-station-meals", label: "fire station meals" },
  },
  {
    question: "What are good firehouse breakfast recipes after a night shift?",
    answer:
      "Burrito bars, egg bakes, French toast casseroles and big skillets are the move — everyone's tired, so batch formats beat made-to-order every time. Set out toppings and let people build their own plate instead of running a short-order line.",
    link: { href: "/firefighter-breakfast-recipes", label: "firefighter breakfast recipes" },
  },
  {
    question: "How do firefighters handle different dietary needs on the crew?",
    answer:
      "Build-your-own formats solve most of it — taco bars, potato bars, rice bowls and sheet-pan lines let each person pick their own toppings and portions instead of cooking three separate dinners. One base protein plus a few sides usually covers vegetarians, gluten-free eaters, and picky rookies at the same table.",
    link: { href: "/firehouse-recipes", label: "firehouse recipes" },
  },
  {
    question: "What should a rookie cook for the crew?",
    answer:
      "Start with something forgiving — meatloaf, chicken parm, sheet-pan fajitas, or an egg bake. They have clear steps, wide timing windows, and don't fall apart if you're a few minutes off. Firehall Meals scales the portions for you, so the only thing left to figure out is the cooking itself.",
    link: { href: "/firefighter-recipes", label: "firefighter recipes" },
  },
  {
    question: "How much food do you need for a firehouse crew?",
    answer:
      "A good rule of thumb is one full recipe batch for eight to twelve people rather than trying to double something written for four — the ratios shift more than you'd expect. Set your crew size on any Firehall Meals recipe and the ingredients and shopping list adjust automatically.",
    link: { href: "/crew-meals", label: "crew meals" },
  },
  {
    question: "How is Firehall Meals different from a regular recipe site?",
    answer:
      "Regular recipe sites assume a quiet kitchen and one plate. Firehall Meals is built around crew portions, honest cook times, and Cook Mode steps that survive getting pulled away mid-prep. Use it solo today — shared hall planning is rolling out through the Hall Operations private beta. Built by firefighters, tested on real shifts.",
  },
];
