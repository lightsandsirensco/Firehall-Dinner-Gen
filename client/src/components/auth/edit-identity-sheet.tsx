import { useEffect, useRef, useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth/context";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { trackProfileUpdated } from "@/lib/analytics";
import { normalizeUsername, USERNAME_PATTERN } from "@shared/auth/constants";

interface EditIdentitySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid";

export function EditIdentitySheet({ open, onOpenChange }: EditIdentitySheetProps) {
  const { profile, refresh } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [username, setUsername] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const checkSeq = useRef(0);

  useEffect(() => {
    if (!open) return;
    setDisplayName(profile?.display_name ?? "");
    setFirstName(profile?.first_name ?? "");
    setLastName(profile?.last_name ?? "");
    setPhotoUrl(profile?.profile_photo_url ?? "");
    setUsername(profile?.username ?? "");
    setCity(profile?.city ?? "");
    setProvince(profile?.province_state ?? "");
    setPostalCode(profile?.postal_code ?? "");
    setCountry(profile?.country ?? "");
    setUsernameStatus("idle");
  }, [open, profile]);

  useEffect(() => {
    const original = profile?.username ?? "";
    const next = normalizeUsername(username);
    if (!username.trim()) {
      setUsernameStatus("idle");
      return;
    }
    if (!USERNAME_PATTERN.test(next)) {
      setUsernameStatus("invalid");
      return;
    }
    if (next === original) {
      setUsernameStatus("idle");
      return;
    }
    setUsernameStatus("checking");
    const seq = ++checkSeq.current;
    const timer = setTimeout(async () => {
      try {
        const res = await apiRequest("GET", `/api/auth/username-available?u=${encodeURIComponent(next)}`);
        const body = (await res.json()) as { available?: boolean };
        if (checkSeq.current !== seq) return;
        setUsernameStatus(body.available ? "available" : "taken");
      } catch {
        if (checkSeq.current === seq) setUsernameStatus("idle");
      }
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  const usernameInvalid = usernameStatus === "taken" || usernameStatus === "invalid";

  const handleSave = async () => {
    if (usernameInvalid) return;
    setSaving(true);
    try {
      await apiRequest("PATCH", "/api/auth/profile", {
        display_name: displayName.trim() || null,
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        profile_photo_url: photoUrl.trim() || null,
        username: normalizeUsername(username) || null,
        city: city.trim() || null,
        province_state: province.trim() || null,
        postal_code: postalCode.trim() || null,
        country: country.trim() || null,
      });
      await refresh();
      trackProfileUpdated();
      toast({ title: "Profile updated", variant: "success" });
      onOpenChange(false);
    } catch (err) {
      const message =
        err instanceof Error && err.message.includes("409")
          ? "That username is already taken."
          : "Could not save profile";
      toast({ title: message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92dvh] overflow-y-auto rounded-t-2xl sm:mx-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Edit your identity</SheetTitle>
          <SheetDescription>How you show up across Firehall Meals.</SheetDescription>
        </SheetHeader>

        <form
          className="space-y-5 py-4"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSave();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="edit-display-name">Display name</Label>
            <Input id="edit-display-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-username">Username</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                @
              </span>
              <Input
                id="edit-username"
                className="pl-6 pr-8"
                value={username}
                maxLength={24}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                placeholder="firstname"
                data-testid="input-username"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
                {usernameStatus === "checking" && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden />
                )}
                {usernameStatus === "available" && <Check className="h-4 w-4 text-primary" aria-hidden />}
                {usernameInvalid && <X className="h-4 w-4 text-destructive" aria-hidden />}
              </span>
            </div>
            <p
              className={cn(
                "text-xs",
                usernameStatus === "taken" && "text-destructive",
                usernameStatus === "invalid" && "text-destructive",
                usernameStatus === "available" && "text-primary",
              )}
            >
              {usernameStatus === "taken" && "That username is already taken."}
              {usernameStatus === "invalid" &&
                "3–24 lowercase letters, numbers, or underscores."}
              {usernameStatus === "available" && "Username is available."}
              {usernameStatus === "idle" &&
                "Not a public profile yet — used to personalize your account."}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-first-name">First name</Label>
              <Input id="edit-first-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-last-name">Last name (optional)</Label>
              <Input id="edit-last-name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-email">Email</Label>
            <Input id="edit-email" value={profile?.email ?? ""} disabled className="bg-muted/40" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-photo-url">Profile photo URL (optional)</Label>
            <Input
              id="edit-photo-url"
              type="url"
              placeholder="https://..."
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
            />
          </div>

          <div className="space-y-2 border-t border-border/30 pt-4">
            <Label className="text-sm">Location</Label>
            <p className="text-xs text-muted-foreground">
              City and region only — never a street address. Powers local grocery deals in the future.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} aria-label="City" />
              <Input
                placeholder="Province / State"
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                aria-label="Province or state"
              />
              <Input
                placeholder="Postal / ZIP code"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                aria-label="Postal or ZIP code"
              />
              <Input
                placeholder="Country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                aria-label="Country"
              />
            </div>
          </div>

          <SheetFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="min-h-11">
              Cancel
            </Button>
            <Button type="submit" disabled={saving || usernameInvalid} className="min-h-11">
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}