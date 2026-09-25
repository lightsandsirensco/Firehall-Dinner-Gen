#!/usr/bin/env tsx
/**
 * Validates the HOMEPAGE "QUESTIONS FROM THE CREW" SEO + copy + internal
 * linking tune-up:
 * - single source of truth (home / /faq / /about / server injection all
 *   read HOME_FAQ_ITEMS — no forked FAQ content)
 * - FAQPage structured data stays in sync with visible content (schema is
 *   built directly from the same array — this guards against a future
 *   refactor silently forking them)
 * - copy quality: word count in range, no AI-FAQ filler phrases, no
 *   fabricated popularity/statistics claims, no "click here" anchors
 * - internal links: every `link.href` resolves to a real, known route
 *   (an SEO landing page slug actually registered in App.tsx), at most one
 *   link per FAQ, anchor label is descriptive (not "click here")
 * - /about's extra FAQ entries don't duplicate a HOME_FAQ_ITEMS question
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { HOME_FAQ_ITEMS } from "../shared/seo/home-faq-items.ts";
import { buildFaqPageSchema } from "../shared/seo/schema.ts";
import { allSeoLandingPagePaths } from "../shared/seo/landing-pages-data.ts";

function readSource(relPath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relPath), "utf8");
}

const BANNED_PHRASES = [
  "when it comes to",
  "whether you're",
  "whether you are",
  "a great option is",
  "consider",
  "it's important to",
  "it is important to",
  "the key is",
  "this makes it ideal",
  "look no further",
  "not only",
  "ultimately",
  "at the end of the day",
  "click here",
];

const UNSUPPORTED_CLAIM_PATTERNS = [
  /\bthe #1\b/i,
  /\bmost popular meal\b/i,
  /\bmost firefighters\b/i,
  /\bfirefighters overwhelmingly\b/i,
  /\bstudies show\b/i,
  /\baccording to\b/i,
];

// Known real routes an internal FAQ link is allowed to point at — every
// SEO landing page slug registered in landing-pages-data.ts (and therefore
// routed in App.tsx), plus a small set of other real, stable app routes.
const KNOWN_EXTRA_ROUTES = new Set(["/", "/generator", "/explore", "/wheel", "/breakfast", "/faq", "/about"]);

function main(): void {
  const KNOWN_ROUTES = new Set([...allSeoLandingPagePaths(), ...KNOWN_EXTRA_ROUTES]);

  assert.ok(
    HOME_FAQ_ITEMS.length >= 8 && HOME_FAQ_ITEMS.length <= 12,
    `expected ~8-12 FAQ items, got ${HOME_FAQ_ITEMS.length}`,
  );

  const seenQuestions = new Set<string>();
  let linkedCount = 0;

  for (const item of HOME_FAQ_ITEMS) {
    assert.ok(item.question.trim().endsWith("?"), `question should read like a real question: "${item.question}"`);
    assert.ok(!seenQuestions.has(item.question), `duplicate question: "${item.question}"`);
    seenQuestions.add(item.question);

    const wordCount = item.answer.trim().split(/\s+/).length;
    assert.ok(
      wordCount >= 25 && wordCount <= 100,
      `answer for "${item.question}" is ${wordCount} words (expected roughly 40-90, allowing some slack): "${item.answer}"`,
    );

    const lowerAnswer = item.answer.toLowerCase();
    for (const phrase of BANNED_PHRASES) {
      assert.ok(
        !lowerAnswer.includes(phrase),
        `answer for "${item.question}" contains banned AI-FAQ phrase "${phrase}"`,
      );
    }
    for (const pattern of UNSUPPORTED_CLAIM_PATTERNS) {
      assert.ok(
        !pattern.test(item.answer),
        `answer for "${item.question}" contains an unsupported popularity/statistics claim (matched ${pattern})`,
      );
    }

    // Answer text must not literally restate the question as its opening —
    // e.g. must not start with "What are" mirroring the question verbatim.
    const questionOpener = item.question.replace(/\?$/, "").trim().toLowerCase();
    assert.ok(
      !lowerAnswer.startsWith(questionOpener),
      `answer for "${item.question}" restates the question instead of answering immediately`,
    );

    if (item.link) {
      linkedCount++;
      assert.ok(
        KNOWN_ROUTES.has(item.link.href),
        `FAQ link href "${item.link.href}" (for "${item.question}") is not a known registered route`,
      );
      assert.notEqual(item.link.label.toLowerCase(), "click here", "link anchor text must be descriptive, not 'click here'");
      assert.ok(item.link.label.trim().length > 0, "link label must not be empty");
      // The answer prose should not also restate the link's own label right
      // before the link renders — that would read as a duplicate mention
      // ("...our firefighter meals hub... See firefighter meals →").
      assert.ok(
        !lowerAnswer.includes(item.link.label.toLowerCase()),
        `answer for "${item.question}" repeats its own link label ("${item.link.label}") in the prose — the link line already supplies it`,
      );
    }
  }

  // At least a few product-only FAQs (no link) should remain — the FAQ
  // should not become 100% SEO-gateway with zero product context.
  const unlinkedCount = HOME_FAQ_ITEMS.length - linkedCount;
  assert.ok(unlinkedCount >= 2, "expected at least 2 product FAQs without an internal link");
  assert.ok(linkedCount >= 5, "expected at least 5 FAQs with a contextual internal link (SEO gateway role)");

  // --- Structured data stays synchronized with visible content ---
  const schema = buildFaqPageSchema(HOME_FAQ_ITEMS);
  assert.equal(schema.mainEntity.length, HOME_FAQ_ITEMS.length);
  HOME_FAQ_ITEMS.forEach((item, i) => {
    assert.equal(schema.mainEntity[i].name, item.question);
    assert.equal(schema.mainEntity[i].acceptedAnswer.text, item.answer);
  });

  // --- Single source of truth: home / faq / about / server injection all
  // import HOME_FAQ_ITEMS rather than forking their own FAQ content ---
  const homeFaqSection = readSource("client/src/components/home/home-faq-section.tsx");
  assert.ok(/HOME_FAQ_ITEMS/.test(homeFaqSection), "home-faq-section.tsx must render HOME_FAQ_ITEMS");

  const faqPage = readSource("client/src/pages/faq.tsx");
  assert.ok(/HOME_FAQ_ITEMS/.test(faqPage), "/faq page must render HOME_FAQ_ITEMS");

  const aboutPage = readSource("client/src/pages/about.tsx");
  assert.ok(/HOME_FAQ_ITEMS/.test(aboutPage), "/about page must reuse HOME_FAQ_ITEMS (plus its own extras)");

  const useHomeSeo = readSource("client/src/lib/seo/use-home-seo.ts");
  assert.ok(
    /buildFaqPageSchema\(HOME_FAQ_ITEMS\)/.test(useHomeSeo),
    "useHomeSeo must build FAQPage schema from HOME_FAQ_ITEMS",
  );

  const useFaqSeo = readSource("client/src/lib/seo/use-faq-seo.ts");
  assert.ok(
    /buildFaqPageSchema\(HOME_FAQ_ITEMS\)/.test(useFaqSeo),
    "useFaqSeo must build FAQPage schema from HOME_FAQ_ITEMS",
  );

  const serverInjection = readSource("server/seo/generic-page-injection.ts");
  assert.ok(
    (serverInjection.match(/buildFaqPageSchema\(HOME_FAQ_ITEMS\)/g) ?? []).length >= 2,
    "server-side injector must reuse HOME_FAQ_ITEMS for both '/' and '/faq' FAQPage schema",
  );

  // --- /about's extra FAQ entries must not duplicate a home FAQ question ---
  const aboutFaqExtraMatch = aboutPage.match(/ABOUT_FAQ_EXTRA[\s\S]*?=\s*\[([\s\S]*?)\n\];/);
  assert.ok(aboutFaqExtraMatch, "could not locate ABOUT_FAQ_EXTRA in about.tsx");
  const extraBlock = aboutFaqExtraMatch![1];
  for (const q of seenQuestions) {
    assert.ok(
      !extraBlock.includes(q),
      `ABOUT_FAQ_EXTRA duplicates a HOME_FAQ_ITEMS question: "${q}"`,
    );
  }

  console.log(
    `[test-home-faq] OK — ${HOME_FAQ_ITEMS.length} FAQ items (${linkedCount} linked, ${unlinkedCount} product-only), schema in sync, single source of truth confirmed.`,
  );
}

main();
