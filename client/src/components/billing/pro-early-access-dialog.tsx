import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchWithCsrf } from "@/lib/csrf-fetch";
import { trackProWaitlistJoined } from "@/lib/analytics";
import type { ProWaitlistJoinResponse, ProWaitlistStatusResponse } from "@shared/schema";
import { SUPPORT_EMAIL } from "@shared/support-contact";

type Phase = "checking" | "form" | "saving" | "done" | "error";

/**
 * Pro early-access signup. Signed-out visitors enter an email; signed-in
 * users confirm their account email. Success is shown only after the server
 * confirms the Postgres write — never from a click or browser storage.
 */
export function ProEarlyAccessDialog({
  open,
  onOpenChange,
  source,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Analytics/attribution key, e.g. "plans_page" or "paywall:high_protein". */
  source: string;
}) {
  const [phase, setPhase] = useState<Phase>("checking");
  const [status, setStatus] = useState<ProWaitlistStatusResponse | null>(null);
  const [email, setEmail] = useState("");
  const [newsletter, setNewsletter] = useState(false);
  const [result, setResult] = useState<ProWaitlistJoinResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setPhase("checking");
    setResult(null);
    setError("");
    setNewsletter(false);
    let cancelled = false;
    fetch("/api/pro-waitlist/status", { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        return (await res.json()) as ProWaitlistStatusResponse;
      })
      .then((data) => {
        if (cancelled) return;
        setStatus(data);
        setPhase(data.joined ? "done" : "form");
      })
      .catch(() => {
        if (cancelled) return;
        setStatus(null);
        setPhase("form");
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const signedIn = Boolean(status?.signed_in && status.account_email);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (phase === "saving") return;
    if (!signedIn && !email.trim()) return;
    setPhase("saving");
    setError("");
    try {
      const res = await fetchWithCsrf("/api/pro-waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(signedIn ? {} : { email: email.trim() }),
          source,
          newsletter_opt_in: newsletter,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.status) {
        setError(data?.message || "Couldn't save your spot right now. Please try again.");
        setPhase("error");
        return;
      }
      const joined = data as ProWaitlistJoinResponse;
      setResult(joined);
      setPhase("done");
      trackProWaitlistJoined({
        source,
        logged_in: signedIn,
        newsletter_opt_in: newsletter,
        already_joined: joined.status === "already_joined",
      });
    } catch {
      setError("Network error. Check your connection and try again.");
      setPhase("error");
    }
  };

  const alreadyOnList = result?.status === "already_joined" || (!result && status?.joined);
  const doneEmail = result?.email ?? status?.account_email ?? "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="pro-early-access-dialog">
        <DialogHeader className="text-left">
          <DialogTitle>Get early access to Firehall Meals Pro</DialogTitle>
          <DialogDescription>
            Pro isn&apos;t open yet. Join the early-access list and we&apos;ll email you once when it launches — nothing
            is charged.
          </DialogDescription>
        </DialogHeader>

        {phase === "checking" ? (
          <div className="flex justify-center py-6" aria-live="polite">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-label="Checking your status" />
          </div>
        ) : phase === "done" ? (
          <div className="space-y-3 py-2" aria-live="polite" data-testid="pro-early-access-done">
            <p className="flex items-start gap-2 text-sm text-foreground">
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--success))]" aria-hidden />
              <span>
                {alreadyOnList ? "You're already on the Pro early-access list" : "You're on the Pro early-access list"}
                {doneEmail ? (
                  <>
                    {" "}
                    as <span className="font-medium">{doneEmail}</span>
                  </>
                ) : null}
                . We&apos;ll email you when Pro launches.
              </span>
            </p>
            {result?.newsletter === "subscribed" ? (
              <p className="text-xs text-muted-foreground">You&apos;re also signed up for recipe emails.</p>
            ) : null}
            <Button className="w-full" variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4 py-1">
            {signedIn ? (
              <p className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm" data-testid="pro-early-access-account-email">
                We&apos;ll notify <span className="font-medium">{status?.account_email}</span>
              </p>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="pro-early-access-email">Email</Label>
                <Input
                  id="pro-early-access-email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@firehall.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={phase === "saving"}
                  data-testid="input-pro-early-access-email"
                />
              </div>
            )}

            <div className="flex items-start gap-2">
              <Checkbox
                id="pro-early-access-newsletter"
                checked={newsletter}
                onCheckedChange={(v) => setNewsletter(v === true)}
                disabled={phase === "saving"}
                data-testid="checkbox-pro-early-access-newsletter"
              />
              <Label htmlFor="pro-early-access-newsletter" className="text-xs font-normal leading-snug text-muted-foreground">
                Also send me Firehall Meals recipe ideas and updates (optional). Unsubscribe anytime.
              </Label>
            </div>

            {phase === "error" ? (
              <p className="text-sm text-destructive" role="alert" data-testid="pro-early-access-error">
                {error}
              </p>
            ) : null}

            <Button
              type="submit"
              className="w-full"
              disabled={phase === "saving" || (!signedIn && !email.trim())}
              data-testid="button-pro-early-access-submit"
            >
              {phase === "saving" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : "Join the Pro early-access list"}
            </Button>
            <p className="text-[11px] leading-snug text-muted-foreground">
              Pro launch updates only, from {SUPPORT_EMAIL}. Joining doesn&apos;t sign you up for the recipe
              newsletter unless you tick the box above.
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
