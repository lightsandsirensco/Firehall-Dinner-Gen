import { useState } from "react";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";

import { apiRequest } from "@/lib/queryClient";

import { useToast } from "@/hooks/use-toast";

import { trackHallCreated } from "@/lib/analytics";

import { PROFILE_APPLIANCE_OPTIONS } from "@shared/auth/constants";

import { cn } from "@/lib/utils";

import {

  defaultShiftInputs,

  HallShiftsEditor,

} from "@/components/hall-membership/hall-shifts-editor";

import type { HallShiftInput } from "@shared/hall-identity/shifts";



interface CreateHallFormProps {

  onCreated?: (hallId: string) => void;

  className?: string;

}



export function CreateHallForm({ onCreated, className }: CreateHallFormProps) {

  const { toast } = useToast();

  const [busy, setBusy] = useState(false);

  const [hallName, setHallName] = useState("");

  const [stationNumber, setStationNumber] = useState("");

  const [department, setDepartment] = useState("");

  const [city, setCity] = useState("");

  const [provinceState, setProvinceState] = useState("");

  const [crewSize, setCrewSize] = useState("");

  const [shifts, setShifts] = useState<HallShiftInput[]>(defaultShiftInputs());

  const [appliances, setAppliances] = useState<string[]>(["stove", "oven"]);



  const toggleAppliance = (value: string) => {

    setAppliances((prev) =>

      prev.includes(value) ? prev.filter((a) => a !== value) : [...prev, value],

    );

  };



  const handleSubmit = async (e: React.FormEvent) => {

    e.preventDefault();

    if (!hallName.trim()) return;

    setBusy(true);

    try {

      const res = await apiRequest("POST", "/api/halls", {

        hall_name: hallName.trim(),

        station_number: stationNumber.trim() || null,

        department: department.trim() || null,

        city: city.trim() || null,

        province_state: provinceState.trim() || null,

        crew_size: Number(crewSize) || null,

        shifts,

        appliances,

      });

      const body = await res.json();

      trackHallCreated(body.hall.hall_id);

      toast({ title: "Hall created", description: `Join code: ${body.hall.join_code}` });

      onCreated?.(body.hall.hall_id);

    } catch {

      toast({ title: "Could not create hall", variant: "destructive" });

    } finally {

      setBusy(false);

    }

  };



  return (

    <form onSubmit={(e) => void handleSubmit(e)} className={cn("space-y-4", className)}>

      <div className="space-y-2">

        <Label htmlFor="create-hall-name">Hall name</Label>

        <Input

          id="create-hall-name"

          placeholder="Your hall name"

          value={hallName}

          onChange={(e) => setHallName(e.target.value)}

          required

        />

      </div>

      <div className="grid gap-4 sm:grid-cols-2">

        <div className="space-y-2">

          <Label htmlFor="create-station">Station number</Label>

          <Input

            id="create-station"

            placeholder="e.g. 312"

            value={stationNumber}

            onChange={(e) => setStationNumber(e.target.value)}

          />

        </div>

        <div className="space-y-2">

          <Label htmlFor="create-department">Department name</Label>

          <Input

            id="create-department"

            placeholder="Your fire department"

            value={department}

            onChange={(e) => setDepartment(e.target.value)}

          />

        </div>

      </div>

      <div className="grid gap-4 sm:grid-cols-2">

        <div className="space-y-2">

          <Label htmlFor="create-city">City</Label>

          <Input

            id="create-city"

            placeholder="Springfield"

            value={city}

            onChange={(e) => setCity(e.target.value)}

          />

        </div>

        <div className="space-y-2">

          <Label htmlFor="create-province">Province / State</Label>

          <Input

            id="create-province"

            placeholder="Ontario"

            value={provinceState}

            onChange={(e) => setProvinceState(e.target.value)}

          />

        </div>

      </div>

      <div className="space-y-2">

        <Label htmlFor="create-crew">Number of firefighters</Label>

        <Input

          id="create-crew"

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

      <Button type="submit" disabled={busy || !hallName.trim()}>

        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create hall"}

      </Button>

    </form>

  );

}


