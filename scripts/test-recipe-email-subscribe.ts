#!/usr/bin/env tsx
/**
 * Email Recipe signup end to end against PGlite, a fake Klaviyo and a fake mail
 * transport (nothing leaves the process): consent gating, consent evidence,
 * unsubscribe/suppression respect, no duplicate welcome subscription, recipe
 * accuracy at crew size, unsubscribe links, and account/saved-recipe safety.
 */
import { testPg } from "./lib/pglite-test-db.js";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import express from "express";
import cookieParser from "cookie-parser";
import { attachAuthUser } from "../server/auth/auth-middleware.js";
import { createAuthSession, getUserById, upsertEmailUser } from "../server/auth/auth-store.js";
import { recordConsentOptIn, recordUnsubscribe } from "../server/marketing-consent/store.js";
import { registerRecipeEmailRoutes } from "../server/recipe-email/routes.js";
import { processKlaviyoRetryQueue } from "../server/klaviyo.js";
import { setMailTransportForTests, type SiteEmail } from "../server/email/mailer.js";
import { releaseSqliteTimersForTests } from "../server/sqlite.js";
import { initCacheStore } from "../server/cache-store.js";
import { loadCanonicalCatalogPage } from "../server/meal-catalog/canonical-page.js";
import { generateResponseFromCanonicalPage } from "../server/meal-catalog/hydrate-golden-generate.js";
import { applyCrewPortionFloors } from "../server/firehall-voice.js";
import { parseAmountToQtyUnit } from "../shared/golden-100/recipe-quality/crew-scale.js";
import { formatClientIngredientQty, formatRecipeIngredientName } from "../shared/measurements/index.js";
import {
  RECIPE_EMAIL_CONSENT_VERSION,
  recipeEmailDisclosureText,
} from "../shared/marketing/recipe-email-consent.js";

// ---- Fake Klaviyo + mail. Any other outbound host fails the test.
const realFetch = globalThis.fetch;
let klaviyoDown = false;
const klaviyoProfiles = new Map<string, { consent: string; suppression?: Array<{ reason: string }> }>();
const klaviyoCalls: Array<{ method: string; path: string; body: any }> = [];
globalThis.fetch = (async (input: any, init?: any) => {
  const url = new URL(typeof input === "string" ? input : input.url);
  if (url.hostname === "127.0.0.1") return realFetch(input, init);
  assert.equal(url.hostname, "a.klaviyo.com", `unexpected outbound request to ${url.hostname}`);
  const body = init?.body ? JSON.parse(String(init.body)) : null;
  klaviyoCalls.push({ method: init?.method ?? "GET", path: url.pathname, body });
  const json = (status: number, data: unknown) =>
    new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
  if (klaviyoDown) return json(503, { errors: [{ title: "Unavailable", detail: "down" }] });
  if (url.pathname === "/api/lists/") return json(200, { data: [{ id: "NEWSLETTER1" }] });
  if (url.pathname === "/api/profiles/") {
    const email = /equals\(email,"(.+)"\)/.exec(url.searchParams.get("filter") ?? "")?.[1] ?? "";
    const p = klaviyoProfiles.get(email);
    return json(200, { data: p ? [{ attributes: { subscriptions: { email: { marketing: { consent: p.consent, suppression: p.suppression ?? [] } } } } }] : [] });
  }
  return json(202, { data: {} });
}) as typeof fetch;
process.env.KLAVIYO_API_KEY = "pk_test_fake_never_sent";
process.env.PUBLIC_SITE_URL = "https://firehallmeals.test";

const sent: SiteEmail[] = [];
let mailFails = false;
setMailTransportForTests(async (mail) => {
  if (mailFails) throw new Error("fake provider down");
  sent.push(mail);
  return "test";
});

const subscribeJobs = (email: string) =>
  klaviyoCalls.filter(
    (c) => c.path === "/api/profile-subscription-bulk-create-jobs/" && c.body?.data?.attributes?.profiles?.data?.[0]?.attributes?.email === email,
  ).length;
const unsubscribeJobs = (email: string) =>
  klaviyoCalls.filter(
    (c) => c.path === "/api/profile-subscription-bulk-delete-jobs/" && c.body?.data?.attributes?.profiles?.data?.[0]?.attributes?.email === email,
  ).length;
const consentRow = async (email: string) =>
  (await testPg.query(`SELECT * FROM user_marketing_consent WHERE email = $1`, [email])).rows[0] as any;
const events = async (email: string) =>
  (await testPg.query(`SELECT * FROM marketing_consent_events WHERE email = $1 ORDER BY captured_at, id`, [email])).rows as any[];
const settle = () => new Promise((r) => setTimeout(r, 150));

/** The recipe exactly as Pick Tonight shows it (same functions the client uses). */
function pickTonightPayload(slug: string, crew: number) {
  const page = loadCanonicalCatalogPage(slug)!;
  const { recipe } = generateResponseFromCanonicalPage(page, { protein: "chicken", mealFormat: "bowl" }, crew);
  const served = applyCrewPortionFloors(recipe.ingredients, crew);
  return {
    recipe_title: page.title,
    recipe_slug: slug,
    crew_size: crew,
    page_path: "/generator",
    ingredients: served.map((i) => {
      const { qty, unit } = parseAmountToQtyUnit(i.amount);
      const q = formatClientIngredientQty(qty, unit, "us");
      const name = formatRecipeIngredientName(i.item);
      return q ? `${name} — ${q}` : name;
    }),
    steps: recipe.steps.map((s) => (s.heading ? `${s.heading}: ${s.body}` : s.body)),
    pro_tips: recipe.pro_tips ?? [],
  };
}

async function main(): Promise<void> {
  await initCacheStore();
  const app = express();
  app.set("trust proxy", true);
  app.use(express.json({ limit: "256kb" }));
  app.use(cookieParser());
  app.use(attachAuthUser);
  registerRecipeEmailRoutes(app);
  const server = app.listen(0);
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  let ip = 1;
  const post = (body: Record<string, unknown>) =>
    fetch(`${base}/api/email-recipe`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": "t", Cookie: "csrf_token=t", "X-Forwarded-For": `10.0.0.${ip++}` },
      body: JSON.stringify(body),
    });
  const cajun = pickTonightPayload("cajun-chicken-rice-bowl", 6);
  const signup = (email: string, extra: Record<string, unknown> = {}) =>
    post({ email, ...cajun, marketing_consent: true, consent_version: RECIPE_EMAIL_CONSENT_VERSION, ...extra });

  try {
    // 1. CSRF and consent gating: nothing stored, sent or synced without an explicit tick.
    assert.equal((await fetch(`${base}/api/email-recipe`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })).status, 403);
    const noConsent = await post({ email: "nope@fh.test", ...cajun, consent_version: RECIPE_EMAIL_CONSENT_VERSION });
    assert.equal(noConsent.status, 400);
    assert.equal((await noConsent.json()).code, "consent_required");
    assert.equal((await post({ email: "nope@fh.test", ...cajun, marketing_consent: false, consent_version: RECIPE_EMAIL_CONSENT_VERSION })).status, 400);
    assert.equal((await signup("nope@fh.test", { consent_version: "old" })).status, 409, "stale disclosure wording is refused");
    assert.equal(await consentRow("nope@fh.test"), undefined);
    assert.equal((await events("nope@fh.test")).length, 0);
    assert.equal(sent.length, 0);
    assert.equal(klaviyoCalls.length, 0);

    // 2. New subscriber: evidence saved, recipe sent accurately, one Klaviyo subscription.
    const ok = await signup("Alice@FH.test ");
    assert.equal(ok.status, 200);
    assert.deepEqual(await ok.json(), { status: "sent", subscription: "new", message: "Recipe sent. Check your inbox." });
    const row = await consentRow("alice@fh.test");
    assert.equal(row.marketing_consent, 1);
    assert.equal(row.consent_source, "email_recipe");
    assert.ok(row.consent_captured_at && !row.unsubscribed_at && row.unsubscribe_token);
    const [ev] = await events("alice@fh.test");
    assert.equal(ev.status, "granted");
    assert.equal(ev.source, "email_recipe");
    assert.equal(ev.disclosure_version, RECIPE_EMAIL_CONSENT_VERSION);
    assert.equal(ev.disclosure_text, recipeEmailDisclosureText(), "exact disclosure wording stored");
    assert.ok(ev.disclosure_text.includes("[checkbox, unchecked by default]"));
    assert.equal(JSON.parse(ev.context_json).crew_size, 6);
    assert.ok(ev.captured_at);

    assert.equal(sent.length, 1);
    const mail = sent[0]!;
    assert.equal(mail.to, "alice@fh.test");
    assert.equal(mail.subject, "Your recipe: Cajun Chicken and Rice");
    assert.ok(mail.text.includes("Quantities for a crew of 6."));
    for (const line of cajun.ingredients) assert.ok(mail.text.includes(`- ${line}`), `email missing ingredient "${line}"`);
    cajun.steps.forEach((s, i) => assert.ok(mail.text.includes(`${i + 1}. ${s}`), `email missing step ${i + 1}`));
    for (const want of ["— 3 lb", "— 2¼ cups", "— 1 bottle"]) assert.ok(mail.text.includes(want), `crew-6 quantity ${want}`);
    assert.ok(!/\d\.\d/.test(cajun.ingredients.join(" ")), "no decimal quantities");
    assert.equal(cajun.ingredients.length, 18);
    const unsubUrl = `https://firehallmeals.test/unsubscribe?t=${encodeURIComponent(row.unsubscribe_token)}`;
    assert.ok(mail.text.includes(unsubUrl) && mail.html.includes(unsubUrl.replace(/&/g, "&amp;")));
    assert.match(mail.headers?.["List-Unsubscribe"] ?? "", /\/api\/marketing\/unsubscribe\?t=/);
    assert.equal(mail.headers?.["List-Unsubscribe-Post"], "List-Unsubscribe=One-Click");
    assert.ok(mail.text.includes("https://firehallmeals.test/generator"));
    await settle();
    assert.equal(subscribeJobs("alice@fh.test"), 1, "one marketing subscription");

    // 3. Same person again: recipe sent, no second subscription (no duplicate welcome), original consent kept.
    const again = await signup("alice@fh.test");
    assert.equal((await again.json()).subscription, "existing");
    await settle();
    assert.equal(sent.length, 2);
    assert.equal(subscribeJobs("alice@fh.test"), 1, "already subscribed: not re-added to the welcome list");
    const row2 = await consentRow("alice@fh.test");
    assert.equal(new Date(row2.consent_captured_at).getTime(), new Date(row.consent_captured_at).getTime());
    assert.equal(row2.unsubscribe_token, row.unsubscribe_token);
    assert.equal((await events("alice@fh.test")).length, 2, "each consent action is logged");

    // 4. Already subscribed in Klaviyo only (e.g. homepage form): no new subscription.
    klaviyoProfiles.set("kim@fh.test", { consent: "SUBSCRIBED" });
    assert.equal((await (await signup("kim@fh.test")).json()).subscription, "existing");
    await settle();
    assert.equal(subscribeJobs("kim@fh.test"), 0);

    // 5. Respect prior unsubscribes and suppressions: nothing sent, nothing changed.
    await recordConsentOptIn({ email: "gone@fh.test", source: "homepage" });
    await recordUnsubscribe("gone@fh.test", "klaviyo:unsubscribed");
    klaviyoProfiles.set("bounced@fh.test", { consent: "NEVER_SUBSCRIBED", suppression: [{ reason: "HARD_BOUNCE" }] });
    klaviyoProfiles.set("unsubk@fh.test", { consent: "UNSUBSCRIBED" });
    const sentBefore = sent.length;
    for (const email of ["gone@fh.test", "bounced@fh.test", "unsubk@fh.test"]) {
      const r = await signup(email);
      assert.equal(r.status, 409, email);
      assert.equal((await r.json()).code, "cannot_send");
      assert.equal(subscribeJobs(email), 0);
    }
    assert.equal(sent.length, sentBefore);
    assert.ok((await consentRow("gone@fh.test")).unsubscribed_at, "unsubscribe left intact");
    assert.equal(await consentRow("bounced@fh.test"), undefined);
    assert.equal((await events("gone@fh.test")).filter((e) => e.status === "granted").length, 0);

    // 6. Klaviyo unreachable: fail closed before recording anything.
    klaviyoDown = true;
    assert.equal((await signup("down@fh.test")).status, 503);
    klaviyoDown = false;
    assert.equal(await consentRow("down@fh.test"), undefined);

    // 7. Mail provider failure is reported, not hidden.
    mailFails = true;
    const failed = await signup("mailfail@fh.test");
    mailFails = false;
    assert.equal(failed.status, 502);
    await settle();
    assert.equal(subscribeJobs("mailfail@fh.test"), 0, "no welcome series when the promised recipe didn't go out");

    // 8. HTML injection is escaped.
    await signup("xss@fh.test", { recipe_title: `<img src=x onerror=alert(1)>`, steps: ["<script>alert(1)</script>"] });
    const xss = sent[sent.length - 1]!;
    assert.ok(!xss.html.includes("<script>") && !xss.html.includes("<img src=x"));

    // 9. Unsubscribe: GET only confirms; POST unsubscribes; account and saved recipes untouched.
    const { user } = await upsertEmailUser("alice@fh.test");
    await testPg.query(`INSERT INTO user_saved_recipes (user_id, recipe_key, recipe_json) VALUES ($1, 'cajun', '{}')`, [user.user_id]);
    const token = row.unsubscribe_token as string;
    const page = await fetch(`${base}/unsubscribe?t=${encodeURIComponent(token)}`);
    assert.equal(page.status, 200);
    assert.ok((await page.text()).includes("<form method=\"post\""));
    assert.equal((await consentRow("alice@fh.test")).marketing_consent, 1, "GET (link scanners) must not unsubscribe");

    const unsub = await fetch(`${base}/api/marketing/unsubscribe?t=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "List-Unsubscribe=One-Click",
    });
    assert.equal(unsub.status, 200);
    assert.ok((await unsub.text()).includes("You're unsubscribed"));
    const after = await consentRow("alice@fh.test");
    assert.equal(after.marketing_consent, 0);
    assert.ok(after.unsubscribed_at);
    assert.equal(after.klaviyo_unsubscribe_pending, 0);
    assert.equal(unsubscribeJobs("alice@fh.test"), 1, "unsubscribe pushed to Klaviyo");
    const withdrawn = (await events("alice@fh.test")).filter((e) => e.status === "withdrawn");
    assert.equal(withdrawn.length, 1);
    assert.equal(withdrawn[0].source, "email_link");
    assert.ok(await getUserById(user.user_id), "account still exists");
    assert.ok(await createAuthSession(user.user_id, false), "can still sign in");
    assert.equal((await testPg.query(`SELECT count(*)::int AS n FROM user_saved_recipes WHERE user_id = $1`, [user.user_id])).rows[0].n, 1);
    // Repeat click is harmless; unknown token is rejected.
    await fetch(`${base}/api/marketing/unsubscribe?t=${encodeURIComponent(token)}`, { method: "POST" });
    assert.equal((await events("alice@fh.test")).filter((e) => e.status === "withdrawn").length, 1);
    assert.equal((await fetch(`${base}/api/marketing/unsubscribe?t=bogus`, { method: "POST" })).status, 404);
    // The unsubscribed address can't be re-subscribed through this form.
    assert.equal((await signup("alice@fh.test")).status, 409);

    // 10. Klaviyo down during unsubscribe: local unsubscribe holds and the worker pushes it later.
    const kimToken = (await consentRow("kim@fh.test")).unsubscribe_token;
    klaviyoDown = true;
    assert.equal((await fetch(`${base}/api/marketing/unsubscribe?t=${encodeURIComponent(kimToken)}`, { method: "POST" })).status, 200);
    klaviyoDown = false;
    assert.equal((await consentRow("kim@fh.test")).klaviyo_unsubscribe_pending, 1);
    await processKlaviyoRetryQueue();
    assert.equal((await consentRow("kim@fh.test")).klaviyo_unsubscribe_pending, 0);
    assert.equal(unsubscribeJobs("kim@fh.test"), 2, "one failed attempt while down, one successful retry");
  } finally {
    server.close();
    setMailTransportForTests(null);
  }

  console.log("recipe-email-subscribe: all checks passed");
}

main()
  .then(() => {
    releaseSqliteTimersForTests();
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
