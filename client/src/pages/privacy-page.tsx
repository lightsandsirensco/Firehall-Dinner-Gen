import { useMemo, type ReactNode } from "react";
import { Link } from "wouter";
import { Flame } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SeoBreadcrumbs } from "@/components/seo/breadcrumbs";
import { usePageSeo } from "@/lib/seo/use-page-seo";
import { getSiteOrigin } from "@/lib/seo/site-origin";
import { buildPrivacySeo } from "@shared/seo/metadata";
import { buildBreadcrumbListSchema, buildOrganizationSchema, buildWebSiteSchema } from "@shared/seo/schema";
import { getSavedCount } from "@/lib/saved-meals";

const SUPPORT_MAILTO = "mailto:support@firehallmeals.com?subject=Privacy%20question";

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

export default function PrivacyPage() {
  const favCount = useMemo(() => getSavedCount(), []);
  const origin = getSiteOrigin();
  const seoConfig = useMemo(() => buildPrivacySeo(), []);
  const jsonLd = useMemo(
    () => [
      buildOrganizationSchema(origin),
      buildWebSiteSchema(origin),
      buildBreadcrumbListSchema(origin, [
        { name: "Home", path: "/" },
        { name: "Privacy Policy", path: "/privacy" },
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
            { name: "Privacy Policy", path: "/privacy" },
          ]}
          className="mb-4"
        />

        <div className="flex items-center gap-2 text-muted-foreground">
          <Flame className="w-4 h-4 text-primary" aria-hidden />
          <span className="text-xs uppercase tracking-widest">Legal</span>
        </div>

        <h1 className="mt-3 font-heading tracking-tight text-3xl sm:text-4xl">Privacy Policy</h1>
        <p className="mt-2 text-muted-foreground">
          Effective date: <OwnerInput>effective date</OwnerInput>
        </p>
        <p className="mt-4 text-base text-muted-foreground leading-relaxed max-w-2xl">
          This policy explains what Firehall Meals actually collects, how it's used, which
          outside services we rely on, and how to delete your data. It reflects the product as
          built today — not aspirational promises.
        </p>

        <div className="mt-8 space-y-6">
          <Section id="who-we-are" title="1. Who operates Firehall Meals">
            <p>
              Firehall Meals is a product built and operated by the team behind{" "}
              <span className="font-medium text-foreground">Lights &amp; Sirens Co.</span> The
              exact registered legal entity name, business address, and any applicable business
              registration details are <OwnerInput>legal entity, address, registration</OwnerInput>{" "}
              and will be added here once confirmed.
            </p>
            <p>
              Questions about this policy can be sent to{" "}
              <a href={SUPPORT_MAILTO} className="text-primary hover:underline">
                support@firehallmeals.com
              </a>
              .
            </p>
          </Section>

          <Section id="accounts" title="2. Account information">
            <p>
              Creating a Firehall Meals account requires only an email address. We sign you in
              using a one-time "magic link" sent to that email — we do not store passwords.
            </p>
            <p>We store, tied to your account:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Your email address and any display name/profile details you add.</li>
              <li>
                Saved recipes, your Firehall Meals Pro "Foods to Avoid" and dietary preferences
                (if set), and shift-reminder settings.
              </li>
              <li>
                Your device-local/synced meal-picking timeline ("Meal History" on the Me tab) —
                free for every signed-in user.
              </li>
              <li>
                For Firehall Meals Pro subscribers: a durable log of recipes you've explicitly
                marked "Cooked," used to keep the Generator from repeating recent meals across
                your devices.
              </li>
              <li>
                Your hall membership link, if you've joined or created a Hall (a shared crew
                workspace). Hall content (shared shopping lists, votes, canteen notes) is visible
                to other members of that Hall — it is never public.
              </li>
              <li>Your subscription/plan status, if you have one.</li>
            </ul>
          </Section>

          <Section id="payments" title="3. Payments and subscriptions">
            <p>
              Firehall Meals Pro is billed through <span className="font-medium text-foreground">Stripe</span>.
              Stripe hosts the checkout page and customer billing portal, and processes your
              payment method directly — Firehall Meals never receives or stores your full card
              number.
            </p>
            <p>
              We store a Stripe customer ID, subscription ID, plan, and subscription status (e.g.
              active, past due, cancelled) so the app knows what you're entitled to. Stripe's own
              privacy practices govern the payment data it processes; see Stripe's privacy policy
              for details.
            </p>
          </Section>

          <Section id="analytics" title="4. Analytics">
            <p>
              We use <span className="font-medium text-foreground">Google Analytics 4 (GA4)</span> to
              understand how the site is used (page views, feature clicks, funnel drop-off). GA4
              assigns your browser a visitor/session identifier via cookies or local storage.
            </p>
            <p>
              If you're signed in, we also send GA4 a one-way SHA-256 hash of your email address
              as its <code className="text-xs">user_id</code> field, so activity across sessions
              and devices can be linked in our analytics. A hash is not reversible on its own, but
              because the same email always produces the same hash, this is still a persistent
              identifier tied to you — we do not describe this as anonymous.
            </p>
            <p>
              We also record our own internal product-analytics events (page views, feature usage,
              paywall views) keyed to a session/visitor identifier, not your account ID or email.
              These events help us understand product usage in aggregate and are not exported as a
              per-user profile.
            </p>
          </Section>

          <Section id="marketing-email" title="5. Marketing email vs. transactional email">
            <p>
              We use <span className="font-medium text-foreground">Klaviyo</span> to send marketing
              emails (e.g. new recipe drops) to people who explicitly opt in via an unchecked
              consent checkbox at signup, recipe email, or shopping-list email capture points. You
              can unsubscribe from marketing email at any time using the link in those emails.
            </p>
            <p>
              Separately, we send transactional email — sign-in magic links, shift reminders you
              requested, and account-related notices — through{" "}
              <span className="font-medium text-foreground">Resend</span> (or SMTP as a fallback).
              These are not marketing subscriptions and are not affected by your marketing opt-in
              status; they exist to operate the features you're actively using.
            </p>
          </Section>

          <Section id="ai-content" title="6. AI / content-generation providers">
            <p>
              Firehall Meals' recipe generator is primarily deterministic (rule- and
              template-based). In limited fallback cases, it may use an AI content provider (e.g.
              OpenAI) to help produce recipe text or catalog imagery. That fallback only receives
              meal parameters you selected (crew size, protein, dietary filters) — not your name,
              email, or account identity.
            </p>
            <p>
              We separately use AI image-generation tooling internally to help produce recipe
              photography for our catalog. This is an internal content pipeline and does not
              process your personal account data.
            </p>
          </Section>

          <Section id="cookies" title="7. Cookies and local storage">
            <p>
              We use a session cookie to keep you signed in and a CSRF-protection cookie to
              secure form submissions. We also use your browser's local storage to remember
              things like saved meals, recently viewed recipes, your measurement-unit preference,
              and onboarding progress on your device — this local data is not sent to us unless a
              feature (like syncing saved meals) explicitly uploads it to your account.
            </p>
          </Section>

          <Section id="retention" title="8. Data retention">
            <p>
              We keep your account data for as long as your account exists. We do not currently
              apply a fixed automatic expiration to individual records (e.g. old meal-history
              entries) beyond what's described in Account Deletion below — if that changes, this
              policy will be updated.
            </p>
          </Section>

          <Section id="deletion" title="9. Account deletion">
            <p>
              You can permanently delete your account from Account settings. Deleting your account
              removes: your profile and preferences, saved recipes, shift-reminder history, your
              subscription/entitlement record, your cloud-sync data, your Firehall Meals Pro cooked-meal
              history, your Hall membership link, and your matching marketing-lead record in our
              own database. Your account row itself is deleted.
            </p>
            <p>
              What deletion does <span className="font-medium text-foreground">not</span> currently
              do, so we can be precise about it:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                Shared Hall content you authored (canteen notes, shortage reports, dues history)
                stays attached to the Hall so other members' shared records stay intact — it is
                not publicly identifiable to you outside that Hall.
              </li>
              <li>
                Our internal analytics events are keyed to a session/visitor identifier, not your
                account, so there is nothing account-linked to delete there.
              </li>
              <li>
                If you subscribed to marketing email, your Klaviyo marketing profile is{" "}
                <span className="font-medium text-foreground">not</span> automatically deleted as
                part of account deletion today. Contact{" "}
                <a href={SUPPORT_MAILTO} className="text-primary hover:underline">
                  support@firehallmeals.com
                </a>{" "}
                to request removal from our marketing list separately.
              </li>
              <li>
                Stripe retains its own transaction/billing records per its own retention
                obligations; we don't control or delete those on Stripe's side.
              </li>
            </ul>
          </Section>

          <Section id="hall-data" title="10. Hall (crew) data">
            <p>
              If you join or create a Hall, information you contribute there (shopping lists,
              votes, canteen notes, shared meal history) is visible to other members of that Hall.
              It is never made public or shown outside that Hall's membership.
            </p>
          </Section>

          <Section id="security" title="11. Data security">
            <p>
              We use standard safeguards — encrypted transport (HTTPS), session cookies with
              CSRF protection, and access controls that scope every API request to the
              authenticated user. No method of storage or transmission is 100% secure, and we
              can't guarantee absolute security.
            </p>
          </Section>

          <Section id="childrens-privacy" title="12. Children's privacy">
            <p>
              Firehall Meals is intended for general audiences and is not directed at children. We
              do not knowingly collect personal information from children.
            </p>
          </Section>

          <Section id="changes" title="13. Changes to this policy">
            <p>
              If this policy changes in a material way, we'll update the effective date above.
              Continued use of Firehall Meals after a change means you accept the updated policy.
            </p>
          </Section>

          <Section id="contact" title="14. Contact">
            <p>
              Questions, requests, or account-deletion follow-ups:{" "}
              <a href={SUPPORT_MAILTO} className="text-primary hover:underline">
                support@firehallmeals.com
              </a>
              .
            </p>
          </Section>
        </div>

        <p className="mt-10 text-sm text-muted-foreground">
          See also our{" "}
          <Link href="/terms" className="text-primary hover:underline font-medium">
            Terms of Service
          </Link>
          .
        </p>
      </main>

      <SiteFooter variant="full" />
    </div>
  );
}
