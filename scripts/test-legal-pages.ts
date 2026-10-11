#!/usr/bin/env tsx
/**
 * Validates the PAID LAUNCH LEGAL & COMMERCIAL SURFACES changes:
 * - /privacy and /terms SEO metadata + routing wiring
 * - the 14-day no-card Pro reverse trial is consistent: plan card CTA,
 *   plans-page billing note and Terms agree, paid checkout adds no Stripe
 *   trial, and the old 7-day trial copy is gone — this is a text/source-content
 *   regression guard, not a network test (no real Stripe keys are used
 *   anywhere in this repo's test suite).
 * - Firehall Meals Pro pricing is $5.99/mo · $39.99/yr, founding $29.99 first year
 * - plans-display.ts firefighter_plus features only list shipped
 *   capabilities (advanced_search, ingredient_preferences, meal_memory)
 * - footer/plans/account pages link Privacy + Terms
 * - the refund policy is resolved (no "OWNER DECISION REQUIRED" placeholder),
 *   states non-refundable-by-default with a consumer-rights qualification,
 *   and never promises prorated/guaranteed/automatic refunds
 * - the effective date is a real date on both pages, not an owner placeholder
 * - the legal operator (1000119168 Ontario Inc.) and governing law (Ontario,
 *   Canada) are now resolved, owner-confirmed facts — no invented address is
 *   published (a legal-notice email is used instead), and zero
 *   "OWNER INPUT REQUIRED" / "OWNER DECISION REQUIRED" placeholders remain
 *   anywhere in either page
 * - Lights & Sirens Co. is credited only as the parent/brand, never asserted
 *   as the legal entity/operator itself
 * - Privacy + Terms account-deletion copy discloses that deleting an account
 *   also cancels an active Stripe-backed subscription, with no automatic refund
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { buildPrivacySeo, buildTermsSeo } from "../shared/seo/metadata.js";
import {
  FOUNDING_OFFER_DISPLAY,
  PLAN_PRESENTATIONS,
  proPriceSummary,
  resolveBillingOption,
} from "../client/src/lib/plans-display.ts";
import { PRO_TRIAL_DAYS } from "../shared/billing/types.js";

function readSource(relPath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relPath), "utf8");
}

/** Collapses whitespace/newlines so multi-line JSX text can be matched with simple word-based regexes. */
function flatten(source: string): string {
  return source.replace(/\s+/g, " ");
}

function main(): void {
  // --- SEO metadata ---
  const privacySeo = buildPrivacySeo();
  assert.equal(privacySeo.canonicalPath, "/privacy");
  assert.ok(privacySeo.title.includes("Privacy"));
  assert.ok(privacySeo.description.length > 0 && privacySeo.description.length <= 160);

  const termsSeo = buildTermsSeo();
  assert.equal(termsSeo.canonicalPath, "/terms");
  assert.ok(termsSeo.title.includes("Terms"));
  assert.ok(termsSeo.description.length > 0 && termsSeo.description.length <= 160);

  // --- App routing wiring ---
  const appTsx = readSource("client/src/App.tsx");
  assert.ok(/import\("@\/pages\/privacy-page"\)/.test(appTsx), "App.tsx must lazy-import the Privacy page");
  assert.ok(/import\("@\/pages\/terms-page"\)/.test(appTsx), "App.tsx must lazy-import the Terms page");
  assert.ok(/<Route path="\/privacy" component={PrivacyPage} \/>/.test(appTsx), "App.tsx must register /privacy");
  assert.ok(/<Route path="\/terms" component={TermsPage} \/>/.test(appTsx), "App.tsx must register /terms");

  // --- App shell exclusion (legal pages are plain marketing pages) ---
  const appNav = readSource("client/src/lib/app-nav.ts");
  const shellExcludedBlock = appNav.slice(
    appNav.indexOf("const SHELL_EXCLUDED_PREFIXES"),
    appNav.indexOf("];", appNav.indexOf("const SHELL_EXCLUDED_PREFIXES")),
  );
  assert.ok(shellExcludedBlock.includes('"/privacy"'), "SHELL_EXCLUDED_PREFIXES must include /privacy");
  assert.ok(shellExcludedBlock.includes('"/terms"'), "SHELL_EXCLUDED_PREFIXES must include /terms");

  // --- Sitemap includes the legal pages ---
  const sitemapSrc = readSource("server/seo/sitemap.ts");
  assert.ok(sitemapSrc.includes('"/privacy"'), "sitemap must include /privacy");
  assert.ok(sitemapSrc.includes('"/terms"'), "sitemap must include /terms");

  // --- Privacy/Terms page content sanity (no fabricated legal facts) ---
  const privacyPage = readSource("client/src/pages/privacy-page.tsx");
  assert.ok(privacyPage.includes("support@firehallmeals.com"), "Privacy page must use the real support email");
  // Legal entity, address, effective date, and governing law are now ALL
  // owner-confirmed — zero owner placeholders may remain anywhere.
  assert.ok(
    !/OWNER INPUT REQUIRED|OWNER DECISION REQUIRED/i.test(privacyPage),
    "Privacy page must not contain any unresolved owner placeholder",
  );
  assert.ok(
    privacyPage.includes("1000119168 Ontario Inc."),
    "Privacy page must name the confirmed legal operator",
  );
  assert.ok(
    privacyPage.includes("lightsandsirensco@gmail.com"),
    "Privacy page must use the confirmed legal-notice contact (no address is published)",
  );
  assert.ok(
    /const EFFECTIVE_DATE = "[A-Z][a-z]+ \d{1,2}, \d{4}"/.test(privacyPage),
    "Privacy page must set a real EFFECTIVE_DATE constant, not a placeholder",
  );
  assert.ok(
    /Effective date: \{EFFECTIVE_DATE\}/.test(privacyPage),
    "Privacy page must render the resolved effective date, not owner-input JSX",
  );
  assert.ok(
    !/we never share (your )?data|we guarantee (complete|absolute|total) security/i.test(privacyPage),
    "Privacy page must not make absolute data-sharing/security guarantees",
  );
  // Account deletion copy must stay consistent with the Stripe
  // account-deletion billing fix: cancels the subscription, no auto-refund.
  const flatPrivacyPage = flatten(privacyPage);
  assert.ok(
    /deleting your account also cancels that subscription/i.test(flatPrivacyPage),
    "Privacy page account-deletion section must disclose Stripe subscription cancellation",
  );
  assert.ok(
    /does not, by itself, generate an automatic refund/i.test(flatPrivacyPage),
    "Privacy page must not imply account deletion automatically generates a refund",
  );

  const termsPage = readSource("client/src/pages/terms-page.tsx");
  const flatTermsPage = flatten(termsPage);
  assert.ok(termsPage.includes("$5.99 USD per month"), "Terms page must state monthly price");
  assert.ok(!termsPage.includes("$4.99"), "Terms page must not keep the old $4.99 monthly price");
  assert.ok(termsPage.includes("$39.99 USD per year"), "Terms page must state annual price");
  assert.ok(
    /first annual subscription is \$29\.99 USD\s+for the first year only/.test(termsPage) &&
      /renews at the standard \$39\.99 USD per year/.test(termsPage),
    "Terms page must disclose the founding offer as first-year-only, renewing at the standard annual price",
  );
  // Refund policy is now a resolved, owner-confirmed policy — no placeholder left.
  assert.ok(
    !/OWNER DECISION REQUIRED/i.test(termsPage),
    "Terms page refund policy must be resolved, not left as a placeholder",
  );
  assert.ok(/non-refundable/i.test(flatTermsPage), "Terms page must state the non-refundable-by-default policy");
  assert.ok(
    /consumer-protection law|consumer right/i.test(flatTermsPage),
    "Terms page refund policy must include a consumer-rights qualification",
  );
  assert.ok(
    // Note: "automatic refund" itself IS allowed to appear as part of a
    // *denial* ("does not ... generate an automatic refund") — only a
    // positive promise of one is banned, which these patterns target.
    !/prorated refund|guaranteed refund|30-day guarantee|7-day guarantee|money-back guarantee|receive an automatic refund|automatic refund (will|is) (issued|provided)/i.test(
      flatTermsPage,
    ),
    "Terms page must not promise prorated/guaranteed/automatic refunds or arbitrary refund windows",
  );
  // Legal entity, governing law, and effective date are now ALL
  // owner-confirmed — zero owner placeholders may remain anywhere.
  assert.ok(
    !/OWNER INPUT REQUIRED|OWNER DECISION REQUIRED/i.test(termsPage),
    "Terms page must not contain any unresolved owner placeholder",
  );
  assert.ok(
    termsPage.includes("1000119168 Ontario Inc."),
    "Terms page must name the confirmed legal operator",
  );
  assert.ok(
    termsPage.includes("lightsandsirensco@gmail.com"),
    "Terms page must use the confirmed legal-notice contact (no address is published)",
  );
  assert.ok(
    /Ontario, Canada/.test(termsPage) && /governed by the laws of the Province of Ontario/i.test(flatTermsPage),
    "Terms page governing-law section must state the confirmed jurisdiction (Ontario, Canada)",
  );
  // No physical business address should be published — only the confirmed
  // legal-notice email stands in for it.
  assert.ok(
    !/business address:? *\d/i.test(flatTermsPage),
    "Terms page must not publish an invented street address",
  );
  assert.ok(
    /const EFFECTIVE_DATE = "[A-Z][a-z]+ \d{1,2}, \d{4}"/.test(termsPage),
    "Terms page must set a real EFFECTIVE_DATE constant, not a placeholder",
  );
  assert.ok(
    /Effective date: \{EFFECTIVE_DATE\}/.test(termsPage),
    "Terms page must render the resolved effective date, not owner-input JSX",
  );
  // Both pages must use the exact same effective date string.
  const privacyDateMatch = privacyPage.match(/const EFFECTIVE_DATE = "([^"]+)"/);
  const termsDateMatch = termsPage.match(/const EFFECTIVE_DATE = "([^"]+)"/);
  assert.ok(privacyDateMatch && termsDateMatch, "both pages must define EFFECTIVE_DATE");
  assert.equal(
    privacyDateMatch![1],
    termsDateMatch![1],
    "Privacy and Terms must use one consistent effective date",
  );
  assert.ok(!/7-day free trial/i.test(termsPage), "Terms page must not advertise the removed 7-day trial");
  assert.ok(!/no\s+free\s+trial/i.test(termsPage), "Terms page must not deny the 14-day Pro trial");
  assert.ok(/one 14-day free trial/i.test(flatTermsPage), "Terms page must disclose the once-per-account 14-day trial");
  assert.ok(/No payment card is\s+required/i.test(flatTermsPage), "Terms page must say the trial needs no card");
  assert.ok(
    /returns to the free plan automatically, nothing is charged, and none of your\s+data is deleted/i.test(flatTermsPage),
    "Terms page must say the trial ends on its own with no charge and no data loss",
  );
  assert.ok(
    /paid subscription bills immediately/i.test(flatTermsPage),
    "Terms page must say paid subscriptions bill immediately (no Stripe trial)",
  );
  assert.ok(
    /deleting your account also cancels that subscription/i.test(flatTermsPage),
    "Terms page account-deletion section must disclose Stripe subscription cancellation",
  );
  // Do not assume Lights & Sirens Co. is the legal entity — it may only be
  // credited as the parent/brand, never asserted as the legal operator.
  assert.ok(
    !/Lights\s*&\s*Sirens Co\. is (the legal|a corporation|a company|the operator)/i.test(flatTermsPage),
    "Terms page must not assert Lights & Sirens Co. as the legal entity/operator",
  );

  // --- 14-day no-card reverse trial: one length everywhere; paid checkout has no Stripe trial ---
  assert.equal(PRO_TRIAL_DAYS, 14, "Pro trial must be 14 days — Terms copy is written for 14");
  const stripeClientSrc = readSource("server/billing/stripe-client.ts");
  assert.ok(!stripeClientSrc.includes("STRIPE_TRIAL_PERIOD_DAYS"), "stripe-client.ts must not export a second trial constant");

  const billingRoutesSrc = readSource("server/billing/routes.ts");
  assert.ok(
    !/trial_period_days\s*:/.test(billingRoutesSrc),
    "checkout must not add a Stripe trial — the no-card reverse trial is the only trial",
  );

  const planCardSrc = readSource("client/src/components/billing/plan-card.tsx");
  assert.ok(!/7-day free trial/i.test(planCardSrc), "PlanCard must not advertise a 7-day free trial");
  assert.ok(!/Start 7-day free trial/i.test(planCardSrc));
  assert.ok(planCardSrc.includes("PRO_TRIAL_CTA"), "PlanCard's live Pro CTA must use the shared trial CTA");

  const plansDisplaySrc = readSource("client/src/lib/plans-display.ts");
  assert.ok(!/free trial/i.test(plansDisplaySrc), "plans-display.ts must not mention a free trial");

  // --- Pricing is $5.99/mo, $39.99/yr, founding $29.99 first year — and the
  // annual math (monthly equivalent + savings badge) is independently
  // recomputed here with hand-typed dollars and compared against what
  // plans-display.ts actually renders — never trust a displayed percentage
  // without verifying the arithmetic behind it.
  const proBillingOptions = PLAN_PRESENTATIONS.firefighter_plus.billingOptions ?? [];
  const monthlyOption = proBillingOptions.find((o) => o.id === "monthly");
  const annualOption = proBillingOptions.find((o) => o.id === "annual");
  assert.equal(monthlyOption?.price, "$5.99", "Pro monthly price must be $5.99");
  assert.equal(monthlyOption?.period, "/month");
  assert.equal(annualOption?.price, "$39.99", "Pro annual price must be $39.99");
  assert.equal(annualOption?.period, "/year");

  const MONTHLY_USD = 5.99;
  const ANNUAL_USD = 39.99;
  const FOUNDING_USD = 29.99;
  const expectedEquivalentLabel = `$${(ANNUAL_USD / 12).toFixed(2)}/month billed annually`;
  const expectedSavingsPercent = Math.round(
    ((MONTHLY_USD * 12 - ANNUAL_USD) / (MONTHLY_USD * 12)) * 100,
  );
  assert.equal(expectedSavingsPercent, 44, "sanity: $5.99 x 12 = $71.88 vs $39.99 should be ~44% savings");
  assert.equal(
    annualOption?.equivalentLabel,
    expectedEquivalentLabel,
    "annual monthly-equivalent line must match the real math ($3.33/month billed annually)",
  );
  assert.equal(expectedEquivalentLabel, "$3.33/month billed annually");
  assert.equal(
    annualOption?.savingsLabel,
    `Save ${expectedSavingsPercent}%`,
    "annual savings badge must match the real math (Save 44%)",
  );
  // Monthly must never show a savings badge — savings only ever apply to Annual.
  assert.equal(monthlyOption?.savingsLabel, undefined, "monthly option must not show a savings badge");

  // Founding offer: only the Annual option changes, and only when eligible.
  const foundingSavingsPercent = Math.round(((MONTHLY_USD * 12 - FOUNDING_USD) / (MONTHLY_USD * 12)) * 100);
  assert.equal(foundingSavingsPercent, 58, "sanity: $29.99 vs $71.88 should be ~58% first-year savings");
  const foundingAnnual = resolveBillingOption(annualOption!, true);
  assert.equal(foundingAnnual.price, "$29.99");
  assert.equal(foundingAnnual.period, "/first year");
  assert.equal(foundingAnnual.savingsLabel, `Save ${foundingSavingsPercent}% first year`);
  assert.equal(foundingAnnual.equivalentLabel, `$${(FOUNDING_USD / 12).toFixed(2)}/month for the first year`);
  assert.equal(FOUNDING_OFFER_DISPLAY.renewalNote, "$29.99 for your first year, then $39.99/year.");
  assert.deepEqual(resolveBillingOption(annualOption!, false), annualOption, "no founding display when not eligible");
  assert.deepEqual(resolveBillingOption(monthlyOption!, true), monthlyOption, "founding never changes Monthly");
  assert.equal(proPriceSummary(false), "$5.99/month or $39.99/year");
  assert.equal(proPriceSummary(true), "$5.99/month, or $29.99 for your first year (then $39.99/year)");

  // --- Plan architecture: exactly Free (guest + personal) vs Pro on /plans ---
  assert.equal(PLAN_PRESENTATIONS.guest.title, "Free");
  assert.equal(PLAN_PRESENTATIONS.personal.title, "Free");
  assert.equal(PLAN_PRESENTATIONS.firefighter_plus.title, "Firehall Meals Pro");

  // --- No aspirational/unshipped Pro claims in the CUSTOMER-FACING copy ---
  // (checks only `{ label: "..." }` feature-list strings, not code comments)
  const featureLabels = [...plansDisplaySrc.matchAll(/\{\s*label:\s*"([^"]+)"/g)].map((m) => m[1]);
  assert.ok(featureLabels.length > 0, "expected to find PlanFeatureItem labels in plans-display.ts");
  const UNSHIPPED_CLAIMS = [
    "ai-powered",
    "algorithmic meal intelligence",
    "machine-learning",
    "meal planning",
    "smarter shopping",
    "personalized recommendations",
    "offline recipes",
    "meal calendar",
  ];
  for (const label of featureLabels) {
    for (const claim of UNSHIPPED_CLAIMS) {
      assert.ok(
        !label.toLowerCase().includes(claim),
        `plans-display.ts feature label must not advertise unshipped capability "${claim}": "${label}"`,
      );
    }
  }
  // Real shipped Pro capabilities must still be represented.
  assert.ok(featureLabels.some((l) => /advanced meal matching/i.test(l)));
  assert.ok(featureLabels.some((l) => /foods to avoid/i.test(l)));
  assert.ok(featureLabels.some((l) => /meal memory/i.test(l)));

  // --- Footer links Privacy/Terms/Support in both variants ---
  const footerSrc = readSource("client/src/components/site-footer.tsx");
  assert.ok(footerSrc.includes('href="/privacy"'), "Footer must link /privacy");
  assert.ok(footerSrc.includes('href="/terms"'), "Footer must link /terms");
  assert.ok(footerSrc.includes("support@firehallmeals.com"), "Footer must surface a real support contact");

  // --- Plans + Account pages link Privacy/Terms ---
  const plansPageSrc = readSource("client/src/pages/plans-page.tsx");
  assert.ok(plansPageSrc.includes('href="/privacy"'));
  assert.ok(plansPageSrc.includes('href="/terms"'));
  assert.ok(!/no\s+free\s+trial/i.test(plansPageSrc), "Plans page must not deny the 14-day Pro trial");
  const flatPlansPage = plansPageSrc.replace(/\s+/g, " ");
  assert.ok(
    /free for \{PRO_TRIAL_DAYS\} days, once — no card needed/.test(flatPlansPage),
    "Plans page billing note must disclose the once-per-account, no-card PRO_TRIAL_DAYS trial",
  );
  assert.ok(/paid Pro subscription bills immediately/.test(flatPlansPage), "Plans page must say paid Pro bills immediately");

  const accountPageSrc = readSource("client/src/pages/account-page.tsx");
  assert.ok(accountPageSrc.includes('href="/privacy"'));
  assert.ok(accountPageSrc.includes('href="/terms"'));

  console.log("[test-legal-pages] OK");
}

main();
