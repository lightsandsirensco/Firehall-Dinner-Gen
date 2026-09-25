import { useMemo, type ReactNode } from "react";
import { Link } from "wouter";
import { Flame } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SeoBreadcrumbs } from "@/components/seo/breadcrumbs";
import { usePageSeo } from "@/lib/seo/use-page-seo";
import { getSiteOrigin } from "@/lib/seo/site-origin";
import { buildTermsSeo } from "@shared/seo/metadata";
import { buildBreadcrumbListSchema, buildOrganizationSchema, buildWebSiteSchema } from "@shared/seo/schema";
import { getSavedCount } from "@/lib/saved-meals";

const SUPPORT_MAILTO = "mailto:support@firehallmeals.com?subject=Terms%20question";

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="rounded-2xl border border-border/30 bg-card p-6 sm:p-8 space-y-3 scroll-mt-24"
      aria-labelledby={`${id}-heading`}
    >
      <h2 id={`${id}-heading`} className="font-heading text-xl sm:text-2xl">
        {title}
      </h2>
      <div className="text-sm sm:text-base text-muted-foreground leading-relaxed space-y-3">
        {children}
      </div>
    </section>
  );
}

function OwnerInput({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block rounded bg-amber-500/15 px-1.5 py-0.5 text-[13px] font-semibold text-amber-700 dark:text-amber-400">
      OWNER INPUT REQUIRED — {children}
    </span>
  );
}

// Effective date is set once at the top of this file so Privacy and Terms
// stay in sync — update both together if this ever changes.
const EFFECTIVE_DATE = "September 25, 2026";

export default function TermsPage() {
  const favCount = useMemo(() => getSavedCount(), []);
  const origin = getSiteOrigin();
  const seoConfig = useMemo(() => buildTermsSeo(), []);
  const jsonLd = useMemo(
    () => [
      buildOrganizationSchema(origin),
      buildWebSiteSchema(origin),
      buildBreadcrumbListSchema(origin, [
        { name: "Home", path: "/" },
        { name: "Terms of Service", path: "/terms" },
      ]),
    ],
    [origin],
  );
  usePageSeo(seoConfig, jsonLd);

  return (
    <div className="page-shell min-h-screen min-h-[100dvh] bg-background flex flex-col">
      <SiteHeader activePage="explore" favCount={favCount} />

      <main className="max-w-[900px] mx-auto px-page py-10 sm:py-14 flex-1" id="main-content">
        <SeoBreadcrumbs
          items={[
            { name: "Home", path: "/" },
            { name: "Terms of Service", path: "/terms" },
          ]}
          className="mb-4"
        />

        <div className="flex items-center gap-2 text-muted-foreground">
          <Flame className="w-4 h-4 text-primary" aria-hidden />
          <span className="text-xs uppercase tracking-widest">Legal</span>
        </div>

        <h1 className="mt-3 font-heading tracking-tight text-3xl sm:text-4xl">Terms of Service</h1>
        <p className="mt-2 text-muted-foreground">Effective date: {EFFECTIVE_DATE}</p>
        <p className="mt-4 text-base text-muted-foreground leading-relaxed max-w-2xl">
          These terms govern your use of Firehall Meals, including Firehall Meals Pro paid
          subscriptions. By using the site, you agree to them.
        </p>

        <div className="mt-8 space-y-6">
          <Section id="operator" title="1. Who you're contracting with">
            <p>
              Firehall Meals is offered by the team behind Lights &amp; Sirens Co. The exact
              registered legal entity name and business address are{" "}
              <OwnerInput>legal entity, address</OwnerInput> and will be added here once
              confirmed.
            </p>
          </Section>

          <Section id="eligibility" title="2. Eligibility and accounts">
            <p>
              You must be able to form a binding contract to use Firehall Meals. You're
              responsible for keeping access to your sign-in email secure, and for activity that
              happens under your account.
            </p>
          </Section>

          <Section id="acceptable-use" title="3. Acceptable use">
            <p>
              Don't misuse the service — no scraping the catalog at scale, no attempting to bypass
              entitlement/paywall checks, no abusive or unlawful use of Hall collaboration
              features (shared shopping lists, votes, canteen notes) shared with other crew
              members.
            </p>
          </Section>

          <Section id="recipes-content" title="4. Recipes and content">
            <p>
              Recipes, nutrition estimates, and cooking guidance on Firehall Meals are provided for
              general informational and meal-planning purposes.
            </p>
            <p>
              <span className="font-medium text-foreground">Nutrition values are estimates</span>,
              calculated from typical ingredient data — not a lab analysis of the specific
              products you use. Actual values will vary based on brands, substitutions, and
              portioning.
            </p>
            <p>
              <span className="font-medium text-foreground">
                Dietary filters and the Firehall Meals Pro "Foods to Avoid" tool are preference and
                discovery aids — they do not guarantee allergen safety.
              </span>{" "}
              They are not a substitute for reading ingredient labels, checking for
              cross-contact, and using your own judgment, especially for food allergies or
              medical dietary needs. You are responsible for verifying ingredients, making safe
              substitutions, and safe food handling/preparation when cooking any recipe on this
              site.
            </p>
          </Section>

          <Section id="pro-subscription" title="5. Firehall Meals Pro subscriptions">
            <p>Firehall Meals Pro is a paid, recurring subscription with two billing options:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>$4.99 USD per month, billed monthly.</li>
              <li>$39.99 USD per year, billed annually.</li>
            </ul>
            <p>
              Subscriptions bill immediately upon successful checkout — there is no free trial
              period. Payment is processed by Stripe; by subscribing you also agree to Stripe's
              terms governing the payment method you provide.
            </p>
            <p>
              Subscriptions automatically renew at the end of each billing period until
              cancelled. We may change subscription pricing going forward; if we do, we'll make
              reasonable efforts to notify active subscribers before a price change takes effect
              on their next renewal.
            </p>
          </Section>

          <Section id="cancellation" title="6. Cancellation">
            <p>
              You can cancel Firehall Meals Pro at any time from Account → Manage Billing, which
              opens the Stripe Customer Portal. Cancellation takes effect at the end of your
              current paid billing period — you keep Pro access through the period you already
              paid for, and it will not renew afterward.
            </p>
            <p>
              Cancelling Firehall Meals Pro does not delete your Firehall Meals account or your
              saved account data (recipes, preferences, meal history). Your account simply
              returns to the free plan.
            </p>
          </Section>

          <Section id="refunds" title="7. Refunds">
            <p>
              Subscription payments to Firehall Meals Pro are generally non-refundable once
              charged. You can cancel at any time to prevent the next renewal — see Cancellation
              above. Deleting your account does not, by itself, entitle you to a refund for the
              current billing period.
            </p>
            <p>
              Where required by applicable consumer-protection law, or where we determine it's
              appropriate, we may provide a refund at our discretion. Nothing in this policy limits
              any refund, cancellation, or other consumer right that applicable law does not allow
              us to waive or restrict.
            </p>
            <p>
              Questions about a specific charge:{" "}
              <a href={SUPPORT_MAILTO} className="text-primary hover:underline">
                support@firehallmeals.com
              </a>
              .
            </p>
          </Section>

          <Section id="free-vs-paid" title="8. Free vs. paid functionality">
            <p>
              Core features — the meal generator, the Classics Wheel, browsing the recipe catalog,
              saving meals, and Hall crew collaboration — are free. Firehall Meals Pro adds:
              advanced meal matching (nutrition-target search), the "Foods to Avoid" ingredient
              exclusion tool, and durable cross-device meal memory that helps the generator avoid
              recently repeated meals. We only describe features here that are actually shipped in
              the product today.
            </p>
          </Section>

          <Section id="availability" title="9. Service availability">
            <p>
              We aim to keep Firehall Meals available and reliable, but we don't guarantee
              uninterrupted access. Features may change, be added, or be removed over time.
            </p>
          </Section>

          <Section id="ip" title="10. Intellectual property">
            <p>
              Firehall Meals' branding, site design, and original recipe content are owned by us
              or our licensors. You may use the service for personal, non-commercial meal
              planning and cooking. You may not copy, resell, or redistribute the catalog in bulk.
            </p>
          </Section>

          <Section id="third-party-services" title="11. Third-party services">
            <p>
              Firehall Meals relies on third-party services to operate, including Stripe
              (payments), Klaviyo (marketing email), Resend/SMTP (transactional email), and Google
              Analytics (site analytics). Use of Firehall Meals is also subject to those
              providers' own terms where you interact with them directly (e.g. entering a card
              number on Stripe's checkout page).
            </p>
          </Section>

          <Section id="disclaimers" title="12. Disclaimers">
            <p>
              Firehall Meals is provided "as is" and "as available." We disclaim warranties of
              any kind to the fullest extent permitted by law, including as to accuracy of
              nutrition estimates, fitness for a particular purpose, and uninterrupted
              availability.
            </p>
          </Section>

          <Section id="liability" title="13. Limitation of liability">
            <p>
              To the fullest extent permitted by law, Firehall Meals is not liable for indirect,
              incidental, or consequential damages arising from your use of the service,
              including harm arising from food preparation, ingredient substitutions, or
              allergen exposure — you remain responsible for safe food handling.
            </p>
          </Section>

          <Section id="termination" title="14. Termination / account deletion">
            <p>
              You can delete your account at any time from Account settings; see our{" "}
              <Link href="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </Link>{" "}
              for exactly what that removes. If you have an active Firehall Meals Pro subscription
              billed through Stripe, deleting your account also cancels that subscription
              immediately so you won't be billed again — this does not generate an automatic
              refund for the current billing period (see Refunds above). We may suspend or
              terminate accounts that violate these terms.
            </p>
          </Section>

          <Section id="governing-law" title="15. Governing law">
            <p>
              <OwnerInput>governing law / jurisdiction</OwnerInput> — the governing law and venue
              for disputes have not yet been specified and will be added once confirmed by the
              business operator.
            </p>
          </Section>

          <Section id="changes-to-terms" title="16. Changes to these terms">
            <p>
              If we make material changes to these terms, we'll update the effective date above.
              Continuing to use Firehall Meals after a change means you accept the updated terms.
            </p>
          </Section>

          <Section id="contact" title="17. Contact">
            <p>
              Questions about these terms:{" "}
              <a href={SUPPORT_MAILTO} className="text-primary hover:underline">
                support@firehallmeals.com
              </a>
              .
            </p>
          </Section>
        </div>

        <p className="mt-10 text-sm text-muted-foreground">
          See also our{" "}
          <Link href="/privacy" className="text-primary hover:underline font-medium">
            Privacy Policy
          </Link>
          .
        </p>
      </main>

      <SiteFooter variant="full" />
    </div>
  );
}
