import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
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
import {
  ShiftReminderSettingsFields,
  useSyncedShiftReminderSettings,
} from "@/components/auth/shift-reminder-settings-fields";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth/context";
import { useToast } from "@/hooks/use-toast";
import { trackProfileUpdated } from "@/lib/analytics";

interface EditHallCrewSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditHallCrewSheet({ open, onOpenChange }: EditHallCrewSheetProps) {
  const { profile, preferences, refresh } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const [department, setDepartment] = useState("");
  const [hallName, setHallName] = useState("");
  const [shiftLabel, setShiftLabel] = useState("");
  const [crewSize, setCrewSize] = useState("");
  const [shiftSettings, setShiftSettings] = useSyncedShiftReminderSettings(preferences);

  useEffect(() => {
    if (!open) return;
    setDepartment(profile?.department ?? "");
    setHallName(profile?.hall_name ?? "");
    setShiftLabel(profile?.shift_label ?? "");
    setCrewSize(profile?.crew_size != null ? String(profile.crew_size) : "");
  }, [open, profile]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const crew = crewSize.trim() ? Number(crewSize) : null;
      await apiRequest("PATCH", "/api/auth/profile", {
        department: department.trim() || null,
        hall_name: hallName.trim() || null,
        shift_label: shiftLabel.trim() || null,
        crew_size: crew && Number.isFinite(crew) ? crew : null,
        shift_reminders_enabled: shiftSettings.shift_reminders_enabled,
        shift_days: shiftSettings.shift_days,
        shift_reminder_time: shiftSettings.shift_reminder_time,
        shift_reminder_timezone: shiftSettings.shift_reminder_timezone,
      });
      await refresh();
      trackProfileUpdated();
      toast({ title: "Hall & crew updated", variant: "success" });
      onOpenChange(false);
    } catch {
      toast({ title: "Could not save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92dvh] overflow-y-auto rounded-t-2xl sm:mx-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Edit hall &amp; crew</SheetTitle>
          <SheetDescription>Your default station and crew context.</SheetDescription>
        </SheetHeader>

        <form
          className="space-y-5 py-4"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSave();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="edit-department">Department / service name</Label>
            <Input
              id="edit-department"
              placeholder="Toronto Fire Services"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-hall-name">Hall / station name</Label>
            <Input
              id="edit-hall-name"
              placeholder="Station 214"
              value={hallName}
              onChange={(e) => setHallName(e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-shift">Shift / crew name</Label>
              <Input
                id="edit-shift"
                placeholder="A Shift"
                value={shiftLabel}
                onChange={(e) => setShiftLabel(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-crew-size">Default crew size</Label>
              <Input
                id="edit-crew-size"
                type="number"
                inputMode="numeric"
                min={1}
                max={200}
                placeholder="8"
                value={crewSize}
                onChange={(e) => setCrewSize(e.target.value)}
              />
            </div>
          </div>

          <div className="border-t border-border/30 pt-4">
            <ShiftReminderSettingsFields value={shiftSettings} onChange={setShiftSettings} />
          </div>

          <SheetFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="min-h-11">
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="min-h-11">
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
