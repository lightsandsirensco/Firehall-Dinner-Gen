/**
 * External contacts for /admin/signups: Firehall Meals contacts that exist only
 * in Klaviyo. GET-only against Klaviyo and read-only against Postgres — nothing
 * here imports, subscribes, or edits consent.
 *
 * The Klaviyo account is shared with Lights & Sirens Co. A profile counts as a
 * Firehall contact only with Firehall evidence: membership of the Firehall leads
 * list, properties our app writes, or a Firehall-only metric event. Klaviyo's own
 * consent record is reported as-is and never merged into Postgres consent.
 */
import { KLAVIYO_BASE, LIST_NAME, klaviyoGetJson, validateKlaviyoConfig } from "../klaviyo.js";
import { csvCell, loadEmailDirectory, paginate } from "./email-directory.js";
import type {
  ExternalContactFilter,
  ExternalContactListResponse,
  ExternalContactRow,
  ExternalContactSummary,
  FirehallEvidence,
  KlaviyoEmailConsent,
} from "../../shared/admin-users/types.js";

/** Properties set only by upsertKlaviyoProfile(). */
const FIREHALL_APP_PROPERTIES = ["account_status", "plan", "signup_date", "crew_size"];
/** Metrics sent only by this app (server/klaviyo.ts). */
export const FIREHALL_METRICS = ["Recipe Generated", "Shopping List Requested", "Lead Magnet Downloaded", "Homepage Subscriber"];
/** Properties written by the Shopify integration (Lights & Sirens Co. store). */
const LIGHTS_SIRENS_PROPERTIES = ["Shopify Tags", "Accepts Marketing"];

const CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_PAGES = 50;

export interface KlaviyoProfileLite {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  created: string | null;
  updated: string | null;
  properties: Record<string, unknown>;
  email_consent: KlaviyoEmailConsent;
  email_consent_method: string | null;
  email_consented_at: string | null;
  suppressed: boolean;
}

export interface KlaviyoSnapshot {
  fetched_at: string;
  firehall_list_found: boolean;
  event_evidence_available: boolean;
  profiles: KlaviyoProfileLite[];
  firehall_list_member_ids: Set<string>;
  firehall_event_profile_ids: Set<string>;
}

const normalizeEmail = (raw: unknown): string => (typeof raw === "string" ? raw.trim().toLowerCase() : "");
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

// ---------------------------------------------------------------------------
// Classification (pure)
// ---------------------------------------------------------------------------

export function classifyKlaviyoContacts(
  snapshot: KlaviyoSnapshot,
  postgresEmails: Set<string>,
): { rows: ExternalContactRow[]; summary: ExternalContactSummary } {
  const summary: ExternalContactSummary = {
    klaviyo_profiles: snapshot.profiles.length,
    already_in_postgres: 0,
    firehall_klaviyo_only: 0,
    firehall_klaviyo_only_subscribed: 0,
    excluded_lights_sirens: 0,
    excluded_unattributed: 0,
    no_email: 0,
    duplicate_profiles: 0,
  };
  const rows: ExternalContactRow[] = [];
  const seen = new Set<string>();

  for (const p of snapshot.profiles) {
    const email = normalizeEmail(p.email);
    if (!email || !email.includes("@")) {
      summary.no_email++;
      continue;
    }
    if (postgresEmails.has(email)) {
      summary.already_in_postgres++;
      continue;
    }
    if (seen.has(email)) {
      summary.duplicate_profiles++;
      continue;
    }
    seen.add(email);

    const evidence: FirehallEvidence[] = [];
    if (snapshot.firehall_list_member_ids.has(p.id)) evidence.push("firehall_list");
    if (FIREHALL_APP_PROPERTIES.some((k) => k in p.properties)) evidence.push("firehall_app_properties");
    if (snapshot.firehall_event_profile_ids.has(p.id)) evidence.push("firehall_events");
    const lightsSirens = LIGHTS_SIRENS_PROPERTIES.some((k) => k in p.properties);

    if (evidence.length === 0) {
      if (lightsSirens) summary.excluded_lights_sirens++;
      else summary.excluded_unattributed++;
      continue;
    }

    summary.firehall_klaviyo_only++;
    if (p.email_consent === "SUBSCRIBED" && !p.suppressed) summary.firehall_klaviyo_only_subscribed++;
    const name = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
    rows.push({
      email,
      klaviyo_profile_id: p.id,
      name: name || null,
      first_seen: p.created,
      last_seen: p.updated ?? p.created,
      evidence,
      also_lights_sirens: lightsSirens,
      klaviyo_email_consent: p.email_consent,
      klaviyo_consent_method: p.email_consent_method,
      klaviyo_consented_at: p.email_consented_at,
      klaviyo_suppressed: p.suppressed,
    });
  }
  return { rows, summary };
}

// ---------------------------------------------------------------------------
// Klaviyo fetch (GET only)
// ---------------------------------------------------------------------------

async function getAllPages(firstUrl: string, label: string): Promise<{ data: any[]; included: any[] }> {
  const data: any[] = [];
  const included: any[] = [];
  let url: string | null = firstUrl;
  for (let i = 0; url && i < MAX_PAGES; i++) {
    const page = await klaviyoGetJson(url, label);
    data.push(...(page?.data ?? []));
    included.push(...(page?.included ?? []));
    url = page?.links?.next ?? null;
  }
  if (url) throw new Error(`Klaviyo ${label} exceeded ${MAX_PAGES} pages`);
  return { data, included };
}

function toProfileLite(raw: any): KlaviyoProfileLite {
  const a = raw?.attributes ?? {};
  const marketing = a.subscriptions?.email?.marketing ?? {};
  const consent = str(marketing.consent);
  return {
    id: String(raw.id),
    email: str(a.email),
    first_name: str(a.first_name),
    last_name: str(a.last_name),
    created: str(a.created),
    updated: str(a.updated),
    properties: a.properties && typeof a.properties === "object" ? a.properties : {},
    email_consent: consent === "SUBSCRIBED" || consent === "UNSUBSCRIBED" || consent === "NEVER_SUBSCRIBED" ? consent : null,
    email_consent_method: str(marketing.method_detail) ?? str(marketing.method),
    email_consented_at: str(marketing.consent_timestamp),
    suppressed: Array.isArray(marketing.suppression) && marketing.suppression.length > 0,
  };
}

export async function fetchKlaviyoSnapshot(): Promise<KlaviyoSnapshot> {
  const profilesUrl = new URL(`${KLAVIYO_BASE}/profiles/`);
  profilesUrl.searchParams.set("page[size]", "100");
  profilesUrl.searchParams.set("additional-fields[profile]", "subscriptions");
  profilesUrl.searchParams.set("fields[profile]", "email,first_name,last_name,created,updated,properties,subscriptions");

  const listsUrl = new URL(`${KLAVIYO_BASE}/lists/`);
  listsUrl.searchParams.set("filter", `equals(name,"${LIST_NAME}")`);

  const [profiles, lists] = await Promise.all([
    getAllPages(profilesUrl.toString(), "externalContacts.profiles"),
    klaviyoGetJson(listsUrl.toString(), "externalContacts.list"),
  ]);

  const listId: string | null = lists?.data?.[0]?.id ?? null;
  const listMembers = new Set<string>();
  if (listId) {
    const membersUrl = new URL(`${KLAVIYO_BASE}/lists/${listId}/profiles/`);
    membersUrl.searchParams.set("page[size]", "100");
    membersUrl.searchParams.set("fields[profile]", "email");
    for (const m of (await getAllPages(membersUrl.toString(), "externalContacts.listMembers")).data) listMembers.add(String(m.id));
  }

  // Needs metrics:read + events:read on the key; without them profiles that only
  // have Firehall event history stay "unattributed" rather than being guessed.
  const eventProfiles = new Set<string>();
  let eventEvidenceAvailable = true;
  try {
    const metrics = await getAllPages(`${KLAVIYO_BASE}/metrics/`, "externalContacts.metrics");
    const metricIds = metrics.data.filter((m) => FIREHALL_METRICS.includes(m?.attributes?.name)).map((m) => String(m.id));
    for (const metricId of metricIds) {
      const eventsUrl = new URL(`${KLAVIYO_BASE}/events/`);
      eventsUrl.searchParams.set("filter", `equals(metric_id,"${metricId}")`);
      eventsUrl.searchParams.set("fields[event]", "datetime");
      eventsUrl.searchParams.set("include", "profile");
      eventsUrl.searchParams.set("fields[profile]", "email");
      const events = await getAllPages(eventsUrl.toString(), "externalContacts.events");
      for (const e of events.data) {
        const id = e?.relationships?.profile?.data?.id;
        if (id) eventProfiles.add(String(id));
      }
      for (const inc of events.included) if (inc?.type === "profile" && inc.id) eventProfiles.add(String(inc.id));
    }
  } catch {
    eventEvidenceAvailable = false;
    eventProfiles.clear();
  }

  return {
    fetched_at: new Date().toISOString(),
    firehall_list_found: Boolean(listId),
    event_evidence_available: eventEvidenceAvailable,
    profiles: profiles.data.map(toProfileLite),
    firehall_list_member_ids: listMembers,
    firehall_event_profile_ids: eventProfiles,
  };
}

// ---------------------------------------------------------------------------
// Query
// ---------------------------------------------------------------------------

let cache: { at: number; snapshot: KlaviyoSnapshot } | null = null;
let fetcher: () => Promise<KlaviyoSnapshot> = fetchKlaviyoSnapshot;

/** Test hook: swap the Klaviyo fetcher and clear the cache. */
export function setKlaviyoSnapshotFetcherForTests(fn: (() => Promise<KlaviyoSnapshot>) | null): void {
  fetcher = fn ?? fetchKlaviyoSnapshot;
  cache = null;
}

function rowMatchesFilter(r: ExternalContactRow, filter: ExternalContactFilter): boolean {
  switch (filter) {
    case "klaviyo_subscribed":
      return r.klaviyo_email_consent === "SUBSCRIBED" && !r.klaviyo_suppressed;
    case "not_klaviyo_subscribed":
      return !(r.klaviyo_email_consent === "SUBSCRIBED" && !r.klaviyo_suppressed);
    case "also_lights_sirens":
      return r.also_lights_sirens;
    default:
      return true;
  }
}

export async function queryExternalContacts(opts: {
  filter?: ExternalContactFilter;
  q?: string;
  page?: number;
  page_size?: number;
  all?: boolean;
  refresh?: boolean;
}): Promise<ExternalContactListResponse> {
  const filter = opts.filter ?? "all";
  const q = (opts.q ?? "").trim().toLowerCase();
  const directory = await loadEmailDirectory();
  const postgresEmails = new Set(directory.map((r) => r.email));
  const empty = {
    contacts: [],
    total: 0,
    page: 1,
    page_size: 0,
    filter,
    query: q || null,
    postgres_unique_emails: postgresEmails.size,
    summary: null,
    firehall_list_found: false,
    event_evidence_available: false,
    fetched_at: null,
  };

  if (!fetcherIsStubbed() && !validateKlaviyoConfig().ok) {
    return { ...empty, available: false, unavailable_reason: "KLAVIYO_API_KEY is not configured" };
  }
  let snapshot: KlaviyoSnapshot;
  try {
    if (opts.refresh || !cache || Date.now() - cache.at > CACHE_TTL_MS) {
      cache = { at: Date.now(), snapshot: await fetcher() };
    }
    snapshot = cache.snapshot;
  } catch (err) {
    return { ...empty, available: false, unavailable_reason: err instanceof Error ? err.message : "Klaviyo unavailable" };
  }

  const { rows, summary } = classifyKlaviyoContacts(snapshot, postgresEmails);
  const matched = rows
    .filter((r) => rowMatchesFilter(r, filter))
    .filter((r) => !q || r.email.includes(q) || (r.name ?? "").toLowerCase().includes(q))
    .sort((a, b) => (b.last_seen ?? "").localeCompare(a.last_seen ?? "") || a.email.localeCompare(b.email));

  const base = {
    available: true,
    unavailable_reason: null,
    fetched_at: snapshot.fetched_at,
    firehall_list_found: snapshot.firehall_list_found,
    event_evidence_available: snapshot.event_evidence_available,
    filter,
    query: q || null,
    postgres_unique_emails: postgresEmails.size,
    summary,
  };
  if (opts.all) return { ...base, contacts: matched, total: matched.length, page: 1, page_size: matched.length };
  const { slice, page, pageSize } = paginate(matched, opts.page ?? 1, opts.page_size ?? 50);
  return { ...base, contacts: slice, total: matched.length, page, page_size: pageSize };
}

function fetcherIsStubbed(): boolean {
  return fetcher !== fetchKlaviyoSnapshot;
}

export function externalContactsCsv(rows: ExternalContactRow[]): string {
  const header = [
    "email", "record_type", "klaviyo_profile_id", "name", "first_seen", "last_seen", "firehall_evidence",
    "also_lights_sirens", "klaviyo_email_consent", "klaviyo_consent_method", "klaviyo_consented_at", "klaviyo_suppressed",
  ];
  const lines = rows.map((r) => [
    r.email, "external_klaviyo_only", r.klaviyo_profile_id, r.name, r.first_seen, r.last_seen, r.evidence.join(" | "),
    r.also_lights_sirens ? "yes" : "no", r.klaviyo_email_consent ?? "", r.klaviyo_consent_method, r.klaviyo_consented_at,
    r.klaviyo_suppressed ? "yes" : "no",
  ]);
  return [header, ...lines].map((l) => l.map(csvCell).join(",")).join("\n") + "\n";
}
