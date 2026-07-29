import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ShiftReminderSettingsFields,
  useSyncedShiftReminderSettings,
} from "@/components/auth/shift-reminder-settings-fields";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth/context";
import { useToast } from "@/hooks/use-toast";
import { trackProfileUpdated, trackPersonalOnboardingStepCompleted } from "@/lib/analytics";
import {
  markProfileBuilt,
  onboardingSignalsFromAuth,
} from "@/lib/onboarding/state";
import {
  PROFILE_APPLIANCE_OPTIONS,
  PROFILE_DIETARY_OPTIONS,
  PROFILE_PROTEIN_OPTIONS,
} from "@shared/auth/constants";

function ChipToggle({
  label,
  selected,
  onToggle,
}: {
  label: string;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition-colors min-h-9",
        selected
          ? "border-primary bg-primary/15 text-foreground"
          : "border-border/60 text-muted-foreground hover:border-border",
      )}
    >
      {label.replace(/_/g, " ")}
    </button>
  );
}

export function AccountProfileForm({ onboarding = false, onOnboardingSaved }: { onboarding?: boolean; onOnboardingSaved?: () => void }) {
  const { profile, preferences, refresh, user, halls } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [department, setDepartment] = useState("");
  const [hallName, setHallName] = useState("");
  const [shiftLabel, setShiftLabel] = useState("");
  const [crewSize, setCrewSize] = useState("");
  const [proteins, setProteins] = useState<string[]>([]);
  const [dietary, setDietary] = useState<string[]>([]);
  const [appliances, setAppliances] = useState<string[]>([]);
  const [shiftSettings, setShiftSettings] = useSyncedShiftReminderSettings(preferences);

  useEffect(() => {
    setFirstName(profile?.first_name ?? "");
    setLastName(profile?.last_name ?? "");
    setDisplayName(profile?.display_name ?? "");
    setPhotoUrl(profile?.profile_photo_url ?? "");
    setDepartment(profile?.department ?? "");
    setHallName(profile?.hall_name ?? "");
    setShiftLabel(profile?.shift_label ?? "");
    setCrewSize(profile?.crew_size != null ? String(profile.crew_size) : "");
    setProteins(preferences?.preferred_proteins ?? []);
    setDietary(preferences?.dietary_restrictions ?? []);
    setAppliances(preferences?.appliance_preferences ?? []);
  }, [profile, preferences]);

  const toggleItem = (list: string[], value: string, setter: (v: string[]) => void) => {
    setter(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const crew = crewSize.trim() ? Number(crewSize) : null;
      await apiRequest("PATCH", "/api/auth/profile", {
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        display_name: displayName.trim() || null,
        profile_photo_url: photoUrl.trim() || null,
        department: department.trim() || null,
        hall_name: hallName.trim() || null,
        shift_label: shiftLabel.trim() || null,
        crew_size: crew && Number.isFinite(crew) ? crew : null,
        preferred_proteins: proteins,
        dietary_restrictions: dietary,
        appliance_preferences: appliances,
        shift_reminders_enabled: shiftSettings.shift_reminders_enabled,
        shift_days: shiftSettings.shift_days,
        shift_reminder_time: shiftSettings.shift_reminder_time,
        shift_reminder_timezone: shiftSettings.shift_reminder_timezone,
      });
      await refresh();
      trackProfileUpdated();
      if (onboarding && user?.user_id) {
        const signals = onboardingSignalsFromAuth(halls, {
          display_name: displayName.trim() || null,
          first_name: firstName.trim() || null,
        });
        markProfileBuilt(user.user_id, signals);
        trackPersonalOnboardingStepCompleted("profile");
        onOnboardingSaved?.();
      }
      toast({ title: onboarding ? "Profile saved — one more step" : "Profile saved", variant: "success" });
    } catch {
      toast({
        title: "Could not save profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        void handleSave();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="first-name">First name</Label>
          <Input id="first-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="last-name">Last name (optional)</Label>
          <Input id="last-name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="display-name">Display name</Label>
        <Input id="display-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" value={profile?.email ?? ""} disabled className="bg-muted/40" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="photo-url">Profile photo URL (optional)</Label>
        <Input
          id="photo-url"
          type="url"
          placeholder="https://..."
          value={photoUrl}
          onChange={(e) => setPhotoUrl(e.target.value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="department">Department (optional)</Label>
          <Input id="department" value={department} onChange={(e) => setDepartment(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="hall-name">Hall name (optional)</Label>
          <Input id="hall-name" value={hallName} onChange={(e) => setHallName(e.target.value)} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="shift">Shift (optional)</Label>
          <Input
            id="shift"
            placeholder="A Shift"
            value={shiftLabel}
            onChange={(e) => setShiftLabel(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="crew-size">Crew size (optional)</Label>
          <Input
            id="crew-size"
            type="number"
            min={1}
            max={200}
            value={crewSize}
            onChange={(e) => setCrewSize(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Preferred proteins</Label>
        <div className="flex flex-wrap gap-2">
          {PROFILE_PROTEIN_OPTIONS.map((p) => (
            <ChipToggle
              key={p}
              label={p}
              selected={proteins.includes(p)}
              onToggle={() => toggleItem(proteins, p, setProteins)}
            />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Dietary restrictions</Label>
        <div className="flex flex-wrap gap-2">
          {PROFILE_DIETARY_OPTIONS.map((d) => (
            <ChipToggle
              key={d}
              label={d}
              selected={dietary.includes(d)}
              onToggle={() => toggleItem(dietary, d, setDietary)}
            />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Appliance preferences</Label>
        <div className="flex flex-wrap gap-2">
          {PROFILE_APPLIANCE_OPTIONS.map((a) => (
            <ChipToggle
              key={a}
              label={a}
              selected={appliances.includes(a)}
              onToggle={() => toggleItem(appliances, a, setAppliances)}
            />
          ))}
        </div>
      </div>

      <ShiftReminderSettingsFields value={shiftSettings} onChange={setShiftSettings} />

      <Button type="submit" disabled={saving} className="w-full sm:w-auto">
        {saving ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Saving…
          </>
        ) : (
          "Save profile"
        )}
      </Button>
    </form>
  );
}
