#!/usr/bin/env tsx
/**
 * Validates the PAID LAUNCH LEGAL & COMMERCIAL SURFACES changes:
 * - /privacy and /terms SEO metadata + routing wiring
 * - the 7-day free trial is fully removed (Stripe checkout config, plan
 *   card copy, plans-display copy) — this is a text/source-content
 *   regression guard, not a network test (no real Stripe keys are used
 *   anywhere in this repo's test suite).
 * - Firehall Meals Pro pricing stays $4.99/mo · $39.99/yr
 * - plans-display.ts firefighter_plus features only list shipped
 *   capabilities (advanced_search, ingredient_preferences, meal_memory)
 * - footer/plans/account pages link Privacy + Terms
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { buildPrivacySeo, buildTermsSeo } from "../shared/seo/metadata.js";
import { PLAN_PRESENTATIONS } from "../client/src/lib/plans-display.ts";

function readSource(relPath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relPath), "utf8");
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
  assert.ok(privacyPage.includes("OWNER INPUT REQUIRED"), "Privacy page must flag unresolved owner facts, not invent them");
  assert.ok(
    !/we never share (your )?data|we guarantee (complete|absolute|total) security/i.test(privacyPage),
    "Privacy page must not make absolute data-sharing/security guarantees",
  );

  const termsPage = readSource("client/src/pages/terms-page.tsx");
  assert.ok(termsPage.includes("$4.99"), "Terms page must state monthly price");
  assert.ok(termsPage.includes("$39.99"), "Terms page must state annual price");
  assert.ok(termsPage.includes("OWNER DECISION REQUIRED"), "Terms page must flag the unresolved refund policy");
  assert.ok(termsPage.includes("OWNER INPUT REQUIRED"), "Terms page must flag unresolved governing law/entity facts");
  assert.ok(!/7-day free trial/i.test(termsPage), "Terms page must not advertise the removed trial");
  assert.ok(/no\s+free\s+trial/i.test(termsPage), "Terms page must explicitly state there is no trial");

  // --- Trial removal: source-level regression guard ---
  const stripeClientSrc = readSource("server/billing/stripe-client.ts");
  assert.ok(!stripeClientSrc.includes("STRIPE_TRIAL_PERIOD_DAYS"), "stripe-client.ts must not export a trial period constant");

  const billingRoutesSrc = readSource("server/billing/routes.ts");
  assert.ok(
    !/trial_period_days\s*:/.test(billingRoutesSrc),
    "checkout.sessions.create must not set a trial_period_days field",
  );
  assert.ok(!billingRoutesSrc.includes("STRIPE_TRIAL_PERIOD_DAYS"), "routes.ts must not import the removed trial constant");

  const planCardSrc = readSource("client/src/components/billing/plan-card.tsx");
  assert.ok(!/7-day free trial/i.test(planCardSrc), "PlanCard must not advertise a 7-day free trial");
  assert.ok(!/Start 7-day free trial/i.test(planCardSrc));

  const plansDisplaySrc = readSource("client/src/lib/plans-display.ts");
  assert.ok(!/free trial/i.test(plansDisplaySrc), "plans-display.ts must not mention a free trial");

  // --- Pricing stays $4.99/mo, $39.99/yr, and the annual math (monthly
  // equivalent + savings badge) is independently recomputed here and
  // compared against what plans-display.ts actually renders — never trust
  // a displayed percentage without verifying the arithmetic behind it.
  const proBillingOptions = PLAN_PRESENTATIONS.firefighter_plus.billingOptions ?? [];
  const monthlyOption = proBillingOptions.find((o) => o.id === "monthly");
  const annualOption = proBillingOptions.find((o) => o.id === "annual");
  assert.equal(monthlyOption?.price, "$4.99", "Pro monthly price must be $4.99");
  assert.equal(monthlyOption?.period, "/month");
  assert.equal(annualOption?.price, "$39.99", "Pro annual price must be $39.99");
  assert.equal(annualOption?.period, "/year");

  const MONTHLY_USD = 4.99;
  const ANNUAL_USD = 39.99;
  const expectedEquivalentLabel = `$${(ANNUAL_USD / 12).toFixed(2)}/month billed annually`;
  const expectedSavingsPercent = Math.round(
    ((MONTHLY_USD * 12 - ANNUAL_USD) / (MONTHLY_USD * 12)) * 100,
  );
  assert.equal(expectedSavingsPercent, 33, "sanity: $4.99 x 12 vs $39.99 should be ~33% savings");
  assert.equal(
    annualOption?.equivalentLabel,
    expectedEquivalentLabel,
    "annual monthly-equivalent line must match the real math ($3.33/month billed annually)",
  );
  assert.equal(
    annualOption?.savingsLabel,
    `Save ${expectedSavingsPercent}%`,
    "annual savings badge must match the real math (Save 33%)",
  );
  // Monthly must never show a savings badge — savings only ever apply to Annual.
  assert.equal(monthlyOption?.savingsLabel, undefined, "monthly option must not show a savings badge");

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
  assert.ok(/no\s+free\s+trial/i.test(plansPageSrc), "Plans page must state billing is immediate, no trial");

  const accountPageSrc = readSource("client/src/pages/account-page.tsx");
  assert.ok(accountPageSrc.includes('href="/privacy"'));
  assert.ok(accountPageSrc.includes('href="/terms"'));

  console.log("[test-legal-pages] OK");
}

main();
