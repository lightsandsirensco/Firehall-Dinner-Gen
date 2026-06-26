import { useEffect, useState } from "react";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";

import { apiRequest } from "@/lib/queryClient";

import { useToast } from "@/hooks/use-toast";

import type { HallMemberRecord, HallRecord } from "@shared/hall-membership/types";

import { PROFILE_APPLIANCE_OPTIONS } from "@shared/auth/constants";

import { HALL_IDENTITY } from "@/lib/brand-copy";
import { cn } from "@/lib/utils";

import { HallShiftsEditor } from "@/components/hall-membership/hall-shifts-editor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { assignCanteenManager } from "@/lib/hall-canteen/api";
import { resolveCanteenManagerDisplayName } from "@shared/hall-identity/display";

import type { HallShiftInput } from "@shared/hall-identity/shifts";



interface HallSettingsFormProps {

  hallId: string;

  hall: HallRecord;

  members?: HallMemberRecord[];

  canEdit: boolean;

  onUpdated?: () => void;

  className?: string;

}



function shiftsFromHall(hall: HallRecord): HallShiftInput[] {

  if (hall.shifts.length === 4) {

    return hall.shifts.map((shift) => ({

      shift_key: shift.shift_key,

      name: shift.name,

      enabled: shift.enabled,

    }));

  }

  return hall.shift_names.map((name, index) => ({

    shift_key: (["a", "b", "c", "d"] as const)[index] ?? "a",

    name,

    enabled: true,

  }));

}



export function HallSettingsForm({

  hallId,

  hall,

  members = [],

  canEdit,

  onUpdated,

  className,

}: HallSettingsFormProps) {

  const { toast } = useToast();

  const [busy, setBusy] = useState(false);

  const [hallName, setHallName] = useState(hall.hall_name);

  const [stationNumber, setStationNumber] = useState(hall.station_number ?? "");

  const [department, setDepartment] = useState(hall.department ?? "");

  const [city, setCity] = useState(hall.city ?? "");

  const [provinceState, setProvinceState] = useState(hall.province_state ?? "");
  const [postalCode, setPostalCode] = useState(hall.postal_code ?? "");
  const [hallPhotoUrl, setHallPhotoUrl] = useState(hall.hall_photo_url ?? "");
  const [motto, setMotto] = useState(hall.motto ?? "");

  const [crewSize, setCrewSize] = useState(hall.crew_size != null ? String(hall.crew_size) : "");

  const [shifts, setShifts] = useState<HallShiftInput[]>(shiftsFromHall(hall));

  const [appliances, setAppliances] = useState<string[]>(hall.appliances);



  useEffect(() => {

    setHallName(hall.hall_name);

    setStationNumber(hall.station_number ?? "");

    setDepartment(hall.department ?? "");

    setCity(hall.city ?? "");

    setProvinceState(hall.province_state ?? "");
    setPostalCode(hall.postal_code ?? "");
    setHallPhotoUrl(hall.hall_photo_url ?? "");
    setMotto(hall.motto ?? "");

    setCrewSize(hall.crew_size != null ? String(hall.crew_size) : "");

    setShifts(shiftsFromHall(hall));

    setAppliances(hall.appliances);

  }, [hall]);



  if (!canEdit) {

    const location = [hall.city, hall.province_state, hall.postal_code].filter(Boolean).join(", ");
    const managerName = resolveCanteenManagerDisplayName(
      hall.canteen_manager_display_name,
      hall.canteen_manager_user_id,
      members,
    );

    return (

      <dl className={cn("grid gap-3 text-sm", className)}>

        <div>

          <dt className="text-muted-foreground">Station</dt>

          <dd>{hall.station_number || HALL_IDENTITY.stationNotSet}</dd>

        </div>

        <div>

          <dt className="text-muted-foreground">Department name</dt>

          <dd>{hall.department || HALL_IDENTITY.departmentNotSet}</dd>

        </div>

        <div>

          <dt className="text-muted-foreground">City</dt>

          <dd>{hall.city || HALL_IDENTITY.cityNotSet}</dd>

        </div>

        <div>

          <dt className="text-muted-foreground">Location</dt>

          <dd>{location || "—"}</dd>

        </div>

        <div>

          <dt className="text-muted-foreground">{HALL_IDENTITY.canteenManager}</dt>

          <dd>{managerName || HALL_IDENTITY.unassignedManager}</dd>

        </div>

        <div>

          <dt className="text-muted-foreground">Hall motto</dt>

          <dd>{hall.motto || "—"}</dd>

        </div>

        <div>

          <dt className="text-muted-foreground">Firefighters</dt>

          <dd>{hall.crew_size ?? "—"}</dd>

        </div>

        <div>

          <dt className="text-muted-foreground">Shifts</dt>

          <dd>{hall.shift_names.join(", ") || "—"}</dd>

        </div>

        <div>

          <dt className="text-muted-foreground">Apparatus</dt>

          <dd className="capitalize">{hall.appliances.map((a) => a.replace(/_/g, " ")).join(", ") || "—"}</dd>

        </div>

      </dl>

    );

  }



  const toggleAppliance = (value: string) => {

    setAppliances((prev) =>

      prev.includes(value) ? prev.filter((a) => a !== value) : [...prev, value],

    );

  };



  const handleManagerChange = async (value: string) => {
    setBusy(true);
    try {
      if (value === "none") {
        const current =
          members.find((m) => m.user_id === hall.canteen_manager_user_id) ??
          members.find((m) => m.role === "canteen_manager");
        if (current) {
          await apiRequest(
            "PATCH",
            `/api/halls/${encodeURIComponent(hallId)}/members/${encodeURIComponent(current.user_id)}`,
            { role: "member" },
          );
        }
      } else {
        await assignCanteenManager(hallId, value);
      }
      toast({ title: "Canteen manager updated" });
      onUpdated?.();
    } catch {
      toast({ title: "Could not update canteen manager", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {

    e.preventDefault();

    setBusy(true);

    try {

      await apiRequest("PATCH", `/api/halls/${encodeURIComponent(hallId)}`, {

        hall_name: hallName.trim(),

        station_number: stationNumber.trim() || null,

        department: department.trim() || null,

        city: city.trim() || null,

        province_state: provinceState.trim() || null,

        postal_code: postalCode.trim().toUpperCase() || null,

        hall_photo_url: hallPhotoUrl.trim() || null,

        motto: motto.trim() || null,

        crew_size: crewSize.trim() ? Number(crewSize) : null,

        shifts,

        appliances,

      });

      toast({ title: "Linked hall settings saved" });

      onUpdated?.();

    } catch {

      toast({ title: "Could not save settings", variant: "destructive" });

    } finally {

      setBusy(false);

    }

  };



  return (

    <form onSubmit={(e) => void handleSave(e)} className={cn("space-y-4", className)}>

      <div className="space-y-2">

        <Label htmlFor="settings-hall-name">Hall name</Label>

        <Input id="settings-hall-name" value={hallName} onChange={(e) => setHallName(e.target.value)} />

      </div>

      <div className="grid gap-4 sm:grid-cols-2">

        <div className="space-y-2">

          <Label htmlFor="settings-station">Station number</Label>

          <Input

            id="settings-station"

            value={stationNumber}

            onChange={(e) => setStationNumber(e.target.value)}

          />

        </div>

        <div className="space-y-2">

          <Label htmlFor="settings-department">Department name</Label>

          <Input

            id="settings-department"

            value={department}

            onChange={(e) => setDepartment(e.target.value)}

          />

        </div>

      </div>

      <div className="grid gap-4 sm:grid-cols-2">

        <div className="space-y-2">

          <Label htmlFor="settings-city">City</Label>

          <Input id="settings-city" value={city} onChange={(e) => setCity(e.target.value)} />

        </div>

        <div className="space-y-2">

          <Label htmlFor="settings-province">Province / State</Label>

          <Input

            id="settings-province"

            value={provinceState}

            onChange={(e) => setProvinceState(e.target.value)}

          />

        </div>

      </div>

      <div className="space-y-2">
        <Label htmlFor="settings-postal">Postal code</Label>
        <Input
          id="settings-postal"
          value={postalCode}
          onChange={(e) => setPostalCode(e.target.value.toUpperCase())}
          placeholder="A1A 1A1"
          autoComplete="postal-code"
        />
        <p className="text-xs text-muted-foreground">
          Used for local grocery flyer deals (Hall Pro).
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="settings-photo">{HALL_IDENTITY.hallPhoto}</Label>
        <Input
          id="settings-photo"
          value={hallPhotoUrl}
          onChange={(e) => setHallPhotoUrl(e.target.value)}
          placeholder="https://…"
        />
        <p className="text-xs text-muted-foreground">{HALL_IDENTITY.hallPhotoHint}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="settings-motto">{HALL_IDENTITY.motto}</Label>
        <Input
          id="settings-motto"
          value={motto}
          onChange={(e) => setMotto(e.target.value)}
          placeholder={HALL_IDENTITY.mottoPlaceholder}
          maxLength={160}
        />
        <p className="text-xs text-muted-foreground">{HALL_IDENTITY.mottoHint}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="settings-canteen-manager">{HALL_IDENTITY.canteenManagerLabel}</Label>
        <Select
          value={hall.canteen_manager_user_id ?? "none"}
          onValueChange={(value) => void handleManagerChange(value)}
          disabled={busy}
        >
          <SelectTrigger id="settings-canteen-manager" className="min-h-[44px]">
            <SelectValue placeholder={HALL_IDENTITY.canteenManagerNone} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{HALL_IDENTITY.canteenManagerNone}</SelectItem>
            {members.map((member) => (
              <SelectItem key={member.user_id} value={member.user_id}>
                {member.display_name?.trim() || member.email?.split("@")[0] || "Crew member"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">{HALL_IDENTITY.canteenManagerHint}</p>
      </div>

      <div className="space-y-2">

        <Label htmlFor="settings-crew">Number of firefighters</Label>

        <Input

          id="settings-crew"

          type="number"

          min={1}

          max={200}

          value={crewSize}

          onChange={(e) => setCrewSize(e.target.value)}

        />

      </div>

      <HallShiftsEditor shifts={shifts} onChange={setShifts} />

      <div className="space-y-2">

        <Label>Apparatus (optional)</Label>

        <div className="flex flex-wrap gap-2">

          {PROFILE_APPLIANCE_OPTIONS.map((a) => (

            <button

              key={a}

              type="button"

              onClick={() => toggleAppliance(a)}

              className={cn(

                "rounded-full border px-3 py-1 text-xs capitalize",

                appliances.includes(a)

                  ? "border-primary bg-primary/15"

                  : "border-border/60 text-muted-foreground",

              )}

            >

              {a.replace(/_/g, " ")}

            </button>

          ))}

        </div>

      </div>

      <Button type="submit" disabled={busy}>

        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save settings"}

      </Button>

    </form>

  );

}


