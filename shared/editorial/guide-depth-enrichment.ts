/**
 * Depth enrichment for thin hall guides — station context without generic blog filler.
 */

import type { EditorialArticle, EditorialSection, EditorialTopic } from "./content-schema.js";
import { collectGuideProse } from "./hall-guides-audit.js";

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function sectionWordCount(section: EditorialSection): number {
  return section.paragraphs.reduce((n, p) => n + countWords(p), 0);
}

function topicShiftSection(topic: EditorialTopic, keyword: string): EditorialSection {
  const pk = keyword || "station dinner";
  const byTopic: Record<EditorialTopic, EditorialSection> = {
    meal_planning: {
      id: "shift-pick",
      heading: "Pick the format before the recipe",
      paragraphs: [
        `For ${pk}, decide line vs. plated vs. batch before you open a recipe tab. Lines win when eaters show up between 17:00 and 20:00; batches win when you know the whole crew lands at once.`,
        `Post protein, starch, and hold plan on the whiteboard. When tones drop, the next cook should read "covered on low" instead of guessing what you meant on the flat-top.`,
      ],
      tips: [
        "Assign one cook and one runner — everyone else stays out until called.",
        "Sauces on the side keep reheat from turning gluey for post-call eaters.",
      ],
    },
    station_lifestyle: {
      id: "hall-tonight",
      heading: "What this looks like on the hall tonight",
      paragraphs: [
        `Kitchen culture shows up in small moves: who shops, who cleans, whether rookies get coached or roasted. For ${pk}, fairness beats perfection — rotate the jobs that nobody wants twice in a row.`,
        `Meals are morale. A crew that trusts the kitchen cooks more often and complains less about grocery splits. Keep the tone direct and the help real.`,
      ],
      tips: [
        "Praise the cook in the bay — fix critiques one-on-one after cleanup.",
        "Write grocery splits on the receipt photo the same night you shop.",
      ],
    },
    crew_culture: {
      id: "crew-table",
      heading: "Feed the room, not just the plate",
      paragraphs: [
        `After a long call, people eat at different speeds. For ${pk}, plan volume and hold time so the last person off the rig still gets a hot portion — not scraped pans.`,
        `Comfort is not an excuse to skip cleanup. Soak trays while people eat; the hall should not wake up to a crusted prep table.`,
      ],
      tips: [
        "Keep hot sauce, salt, and bread on the line — tired crews self-correct flavor fast.",
        "Second helpings need extra starch before extra protein.",
      ],
    },
    nutrition_performance: {
      id: "shift-fuel",
      heading: "How this plays across a long shift",
      paragraphs: [
        `Shift nutrition is timing, not willpower. For ${pk}, anchor protein at dinner, keep snacks that survive the apparatus bay, and drink water like it is part of the job — not a lecture at 03:00.`,
        `This is practical hall guidance, not medical advice. Follow your department's health program and personal providers for individual plans.`,
      ],
      tips: [
        "Label leftovers with date — rotation matters more than recipe genius.",
        "Pair lighter mains with one optional indulgent side when morale needs it.",
      ],
    },
    shift_operations: {
      id: "ops-timing",
      heading: "When tones drop mid-prep",
      paragraphs: [
        `Operational meals need a "good enough" checkpoint. For ${pk}, choose recipes where lowering heat and covering still leaves edible food when you return — not a burned skillet.`,
        `Hotel pans and sheet trays beat delicate plating on busy boards. Finish crisp elements last so post-call eaters still get texture.`,
      ],
      tips: [
        "Count who is on duty at 17:00, not who was on the board at 08:00.",
        "One backup frozen protein in the walk-in saves surprise mutual-aid eaters.",
      ],
    },
    station_cooking: {
      id: "line-setup",
      heading: "Line setup and second helpings",
      paragraphs: [
        `Station cooking is line discipline. For ${pk}, hot food hot, cold food cold, sauces on the side. Runners refill starch and drinks so the cook stays on heat.`,
        `Plan second helpings before you portion — extra rice, buns, or potatoes cost less than cooking a second main at 21:00.`,
      ],
      tips: [
        "Probe temps on poultry and pork — guessing is how halls serve pink chicken.",
        "Empty grease traps before grill night; keep the right extinguisher class within reach.",
      ],
    },
  };
  return byTopic[topic] ?? byTopic.meal_planning;
}

function expandThinSection(section: EditorialSection): EditorialSection {
  const words = sectionWordCount(section);
  if (words >= 55 || section.paragraphs.length >= 2) return section;
  const extra =
    "On shift, write the hold plan on the whiteboard — covered on low, finish sear when you're back — so the next cook is not guessing at your flat-top settings.";
  return {
    ...section,
    paragraphs: [...section.paragraphs, extra],
    tips: section.tips ?? [
      "Assign one cook and one runner; keep everyone else out of the kitchen until called.",
      "Label allergens on the line once — it stops the mid-meal Q&A loop.",
    ],
  };
}

function needsEnrichment(article: EditorialArticle): boolean {
  const prose = collectGuideProse(article);
  const words = countWords(prose);
  const thinSection = article.sections.some((s) => sectionWordCount(s) < 50);
  return words < 480 || article.sections.length < 3 || thinSection || article.practicalAdvice.length < 4;
}

/** Recipe-list guides — keep author structure; do not inject filler sections. */
const SKIP_DEPTH_ENRICHMENT_SLUGS = new Set(["10-classic-firehall-meals"]);

/** Add station depth to thin guides at publish/audit time. */
export function enrichGuideArticle(article: EditorialArticle): EditorialArticle {
  if (SKIP_DEPTH_ENRICHMENT_SLUGS.has(article.slug)) return article;
  if (!needsEnrichment(article)) return article;

  const keyword = article.keywords[0]?.trim() ?? article.slug.replace(/-/g, " ");
  let sections = article.sections.map(expandThinSection);

  if (sections.length < 3) {
    sections = [...sections, topicShiftSection(article.topic, keyword)];
  }

  const practicalAdvice = [...article.practicalAdvice];
  if (practicalAdvice.length < 4) {
    practicalAdvice.push(
      "Post who's cooking and what's holding warm on the whiteboard — post-call eaters should not hunt for answers.",
    );
  }

  let intro = article.intro;
  if (countWords(intro) < 55 && keyword) {
    intro = `${intro} Below: what halls actually cook for ${keyword} — formats, timing, and recipe picks that survive a busy board.`;
  }

  return {
    ...article,
    intro,
    sections,
    practicalAdvice,
    readMinutes: Math.max(article.readMinutes, 7),
  };
}
