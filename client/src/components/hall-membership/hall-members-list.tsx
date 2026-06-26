import { useState } from "react";

import { Loader2, UserMinus } from "lucide-react";

import { Button } from "@/components/ui/button";

import {

  Select,

  SelectContent,

  SelectItem,

  SelectTrigger,

  SelectValue,

} from "@/components/ui/select";

import { apiRequest } from "@/lib/queryClient";

import { useToast } from "@/hooks/use-toast";

import type { HallMemberRecord, HallRole, HallShiftRecord } from "@shared/hall-membership/types";

import { HALL_ROLES } from "@shared/hall-membership/types";

import { cn } from "@/lib/utils";



interface HallMembersListProps {

  hallId: string;

  members: HallMemberRecord[];

  shifts: HallShiftRecord[];

  myUserId: string;

  canManage: boolean;

  onChanged?: () => void;

  className?: string;

}



const ROLE_LABELS: Record<HallRole, string> = {

  captain: "Captain",

  canteen_manager: "Canteen Manager",

  member: "Member",

};



export function HallMembersList({

  hallId,

  members,

  shifts,

  myUserId,

  canManage,

  onChanged,

  className,

}: HallMembersListProps) {

  const { toast } = useToast();

  const [busyId, setBusyId] = useState<string | null>(null);

  const enabledShifts = shifts.filter((shift) => shift.enabled);



  const updateRole = async (userId: string, role: HallRole) => {

    setBusyId(userId);

    try {

      await apiRequest("PATCH", `/api/halls/${encodeURIComponent(hallId)}/members/${encodeURIComponent(userId)}`, {

        role,

      });

      toast({ title: "Role updated" });

      onChanged?.();

    } catch {

      toast({ title: "Could not update role", variant: "destructive" });

    } finally {

      setBusyId(null);

    }

  };



  const updateShift = async (userId: string, shiftId: string | null) => {

    setBusyId(userId);

    try {

      await apiRequest(

        "PATCH",

        `/api/halls/${encodeURIComponent(hallId)}/members/${encodeURIComponent(userId)}/shift`,

        { shift_id: shiftId },

      );

      toast({ title: "Shift updated" });

      onChanged?.();

    } catch {

      toast({ title: "Could not update shift", variant: "destructive" });

    } finally {

      setBusyId(null);

    }

  };



  const removeMember = async (userId: string) => {

    setBusyId(userId);

    try {

      await apiRequest("DELETE", `/api/halls/${encodeURIComponent(hallId)}/members/${encodeURIComponent(userId)}`);

      toast({ title: "Member removed" });

      onChanged?.();

    } catch {

      toast({ title: "Could not remove member", variant: "destructive" });

    } finally {

      setBusyId(null);

    }

  };



  return (

    <ul className={cn("space-y-2", className)}>

      {members.map((member) => {

        const isSelf = member.user_id === myUserId;

        const label = member.display_name || member.email || "Crew member";

        const canEditShift = isSelf || canManage;

        return (

          <li

            key={member.user_id}

            className="flex flex-wrap items-center gap-2 justify-between rounded-xl border border-border/40 px-4 py-3"

          >

            <div className="min-w-0">

              <p className="text-sm font-medium truncate">

                {label}

                {isSelf && <span className="text-muted-foreground font-normal"> (you)</span>}

              </p>

              <p className="text-xs text-muted-foreground capitalize">

                {ROLE_LABELS[member.role]}

                {member.shift_name ? ` · ${member.shift_name}` : ""}

              </p>

            </div>

            <div className="flex items-center gap-2 flex-wrap justify-end">

              {canEditShift && enabledShifts.length > 0 && (

                <Select

                  value={member.shift_id ?? "none"}

                  onValueChange={(value) =>

                    void updateShift(member.user_id, value === "none" ? null : value)

                  }

                  disabled={busyId === member.user_id}

                >

                  <SelectTrigger className="w-[150px] h-9">

                    <SelectValue placeholder="Shift" />

                  </SelectTrigger>

                  <SelectContent>

                    <SelectItem value="none">No shift</SelectItem>

                    {enabledShifts.map((shift) => (

                      <SelectItem key={shift.shift_id} value={shift.shift_id}>

                        {shift.name}

                      </SelectItem>

                    ))}

                  </SelectContent>

                </Select>

              )}

              {canManage && !isSelf && (

                <>

                  <Select

                    value={member.role}

                    onValueChange={(value) => void updateRole(member.user_id, value as HallRole)}

                    disabled={busyId === member.user_id}

                  >

                    <SelectTrigger className="w-[160px] h-9">

                      <SelectValue />

                    </SelectTrigger>

                    <SelectContent>

                      {HALL_ROLES.map((role) => (

                        <SelectItem key={role} value={role}>

                          {ROLE_LABELS[role]}

                        </SelectItem>

                      ))}

                    </SelectContent>

                  </Select>

                  <Button

                    type="button"

                    variant="ghost"

                    size="icon"

                    className="h-9 w-9"

                    disabled={busyId === member.user_id}

                    onClick={() => void removeMember(member.user_id)}

                    aria-label={`Remove ${label}`}

                  >

                    {busyId === member.user_id ? (

                      <Loader2 className="w-4 h-4 animate-spin" />

                    ) : (

                      <UserMinus className="w-4 h-4" />

                    )}

                  </Button>

                </>

              )}

            </div>

          </li>

        );

      })}

    </ul>

  );

}


