#!/usr/bin/env tsx
/**
 * Stripe LIVE-mode go-live readiness check — Firehall Meals Pro.
 *
 * READ-ONLY against Stripe: only `retrieve`/`list` calls. Never creates a
 * Checkout Session, never charges a card, never touches
 * billing_global_flags.payments_enabled, never prints a secret value (only
 * booleans/ids/URLs, which are not secrets).
 *
 * Run this IN THE PRODUCTION ENVIRONMENT (where the real STRIPE_* env vars
 * live) before flipping payments_enabled on. Reuses the exact same
 * price-contract validator the checkout route itself uses
 * (server/billing/stripe-client.ts) — this script does not re-implement or
 * redesign any billing logic, it only calls it early and reports the result.
 *
 * Exit code 0  → every required check passed (warnings may still exist —
 *                read them).
 * Exit code 1  → at least one hard failure — DO NOT enable payments.
 *
 * Usage:
 *   npm run verify:stripe-live
 */
import Stripe from "stripe";
import { loadProjectEnv } from "../server/lib/load-project-env.js";
import { EXPECTED_PRICE_SPECS, priceMatchesExpectedSpec, getStripeClient } from "../server/billing/stripe-client.js";

loadProjectEnv();

const REQUIRED_WEBHOOK_URL = "https://www.firehallmeals.com/api/billing/stripe-webhook";
const REQUIRED_SITE_URL = "https://www.firehallmeals.com";
const REQUIRED_EVENTS = [
  "checkout.session.completed",
  "customer.subscription.updated",
  "customer.subscription.deleted",
] as const;
const EXPECTED_PRODUCT_NAME = "Firehall Meals Pro";

const failures: string[] = [];
const warnings: string[] = [];

function fail(msg: string): void {
  failures.push(msg);
  console.error(`\u2717 ${msg}`);
}
function ok(msg: string): void {
  console.log(`\u2713 ${msg}`);
}
function warn(msg: string): void {
  warnings.push(msg);
  console.warn(`! ${msg}`);
}

function printSummaryAndExit(): never {
  console.log("\n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");
  console.log(`${failures.length} failure(s), ${warnings.length} warning(s).`);
  if (failures.length > 0) {
    console.log(
      "\nSTOP \u2014 do not set billing_global_flags.payments_enabled = true until every failure above is resolved.",
    );
    process.exit(1);
  }
  console.log(
    "\nAll automated checks passed. Review the warning(s) above (if any), then it is safe to flip " +
      "billing_global_flags.payments_enabled = true via the Admin \u2192 Billing console (Stripe checkout toggle).",
  );
  process.exit(0);
}

async function main(): Promise<void> {
  console.log("\u2500\u2500 STEP 1: Environment \u2500\u2500");

  const secretKey = process.env.STRIPE_SECRET_KEY?.trim() || "";
  if (!secretKey) {
    fail("STRIPE_SECRET_KEY is not set.");
  } else if (!secretKey.startsWith("sk_live_")) {
    fail(
      "STRIPE_SECRET_KEY does not start with sk_live_ — this script only runs against LIVE mode and refuses to " +
        "proceed with a test key.",
    );
  } else {
    ok("STRIPE_SECRET_KEY is present and live-mode (sk_live_...).");
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim() || "";
  if (!webhookSecret) {
    fail("STRIPE_WEBHOOK_SECRET is not set.");
  } else if (!webhookSecret.startsWith("whsec_")) {
    fail("STRIPE_WEBHOOK_SECRET does not look like a Stripe signing secret (expected whsec_...).");
  } else {
    ok("STRIPE_WEBHOOK_SECRET is present.");
  }

  const priceMonthly = process.env.STRIPE_PRICE_ID_MONTHLY?.trim() || "";
  const priceAnnual = process.env.STRIPE_PRICE_ID_ANNUAL?.trim() || "";
  if (!priceMonthly) fail("STRIPE_PRICE_ID_MONTHLY is not set.");
  if (!priceAnnual) fail("STRIPE_PRICE_ID_ANNUAL is not set.");
  if (priceMonthly && priceAnnual && priceMonthly === priceAnnual) {
    fail("STRIPE_PRICE_ID_MONTHLY and STRIPE_PRICE_ID_ANNUAL are identical — they must be two different prices.");
  }

  const siteUrl = (process.env.PUBLIC_SITE_URL?.trim() || "").replace(/\/+$/, "");
  if (siteUrl !== REQUIRED_SITE_URL) {
    fail(`PUBLIC_SITE_URL is "${siteUrl || "(unset)"}" \u2014 expected exactly "${REQUIRED_SITE_URL}".`);
  } else {
    ok(`PUBLIC_SITE_URL is exactly ${REQUIRED_SITE_URL}.`);
  }

  if (failures.length > 0) {
    console.log("\nStopping before any Stripe network calls \u2014 fix the environment variables above first.");
    printSummaryAndExit();
  }

  const stripe: Stripe = getStripeClient();

  console.log("\n\u2500\u2500 STEP 2: Live Prices \u2500\u2500");
  for (const period of ["monthly", "annual"] as const) {
    const priceId = period === "monthly" ? priceMonthly : priceAnnual;
    try {
      const price = await stripe.prices.retrieve(priceId, { expand: ["product"] });
      if (!price.livemode) {
        fail(`${period} price ${priceId} is a TEST-mode price, not live \u2014 do not use a test Price ID with live keys.`);
        continue;
      }
      const result = priceMatchesExpectedSpec(price, period);
      if (!result.ok) {
        fail(`${period} price ${priceId} does not match the expected contract: ${result.reason}`);
        continue;
      }
      const product = price.product;
      const productName = typeof product === "object" && product && "name" in product ? product.name : null;
      if (productName && productName !== EXPECTED_PRODUCT_NAME) {
        warn(`${period} price ${priceId} product name is "${productName}", expected "${EXPECTED_PRODUCT_NAME}".`);
      }
      const spec = EXPECTED_PRICE_SPECS[period];
      ok(
        `${period} price ${priceId} is LIVE: $${(spec.unitAmountCents / 100).toFixed(2)} ${spec.currency.toUpperCase()} ` +
          `recurring ${spec.intervalCount}x${spec.interval}.`,
      );
    } catch (err) {
      fail(`Could not retrieve ${period} price ${priceId} in LIVE mode: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log("\n\u2500\u2500 STEP 3: Live Webhook \u2500\u2500");
  try {
    const endpoints = await stripe.webhookEndpoints.list({ limit: 100 });
    const match = endpoints.data.find((e) => e.url === REQUIRED_WEBHOOK_URL);
    if (!match) {
      fail(`No live webhook endpoint found for ${REQUIRED_WEBHOOK_URL}.`);
    } else {
      if (match.status !== "enabled") {
        fail(`Webhook endpoint ${match.id} status is "${match.status}", expected "enabled".`);
      } else {
        ok(`Live webhook endpoint ${match.id} found and enabled for ${REQUIRED_WEBHOOK_URL}.`);
      }
      const subscribed = new Set(match.enabled_events);
      const missing = REQUIRED_EVENTS.filter((e) => !subscribed.has("*") && !subscribed.has(e));
      if (missing.length > 0) {
        fail(`Webhook endpoint ${match.id} is missing required event(s): ${missing.join(", ")}.`);
      } else {
        ok(`Webhook endpoint subscribes to all required events (${REQUIRED_EVENTS.join(", ")}).`);
      }
      warn(
        `Stripe never returns a signing secret via the API after creation, so this script cannot cryptographically ` +
          `prove STRIPE_WEBHOOK_SECRET belongs to endpoint ${match.id}. Confirm by eye that the secret currently set ` +
          `in production was copied from THIS endpoint's "Signing secret" reveal in the Stripe Dashboard (Live mode).`,
      );
    }
  } catch (err) {
    fail(`Could not list live webhook endpoints: ${err instanceof Error ? err.message : String(err)}`);
  }

  console.log("\n\u2500\u2500 STEP 4: Customer Portal \u2500\u2500");
  try {
    const configs = await stripe.billingPortal.configurations.list({ limit: 100 });
    const active = configs.data.find((c) => c.is_default) ?? configs.data[0];
    if (!active) {
      fail("No Stripe Customer Portal configuration found in Live Mode.");
    } else {
      const f = active.features;
      if (!f.subscription_cancel?.enabled) fail("Customer Portal: subscription cancellation is NOT enabled.");
      else ok("Customer Portal: subscription cancellation enabled.");

      if (!f.invoice_history?.enabled) fail("Customer Portal: invoice history is NOT enabled.");
      else ok("Customer Portal: invoice history enabled.");

      if (!f.payment_method_update?.enabled) fail("Customer Portal: payment method update is NOT enabled.");
      else ok("Customer Portal: payment method update enabled.");

      if (f.subscription_update?.enabled) {
        warn(
          "Customer Portal: plan-switching (subscription_update) is enabled \u2014 Firehall Meals Pro is currently " +
            "sold as a single plan; confirm this is intentional, not scope creep.",
        );
      }
    }
  } catch (err) {
    fail(`Could not read live Customer Portal configuration: ${err instanceof Error ? err.message : String(err)}`);
  }

  printSummaryAndExit();
}

main().catch((err) => {
  console.error("Unexpected error running live readiness check:", err instanceof Error ? err.message : err);
  process.exit(1);
});
