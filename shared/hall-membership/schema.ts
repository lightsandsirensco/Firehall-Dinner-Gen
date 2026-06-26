import { z } from "zod";

import { HALL_INVITE_METHODS, HALL_ROLES } from "./types.js";

import { HALL_SHIFT_KEYS } from "../hall-identity/shifts.js";



const shiftInputSchema = z.object({

  shift_key: z.enum(HALL_SHIFT_KEYS),

  name: z.string().min(1).max(80),

  enabled: z.boolean(),

});



export const createHallSchema = z.object({

  hall_name: z.string().min(2).max(120),

  station_number: z.string().max(40).optional().nullable(),

  department: z.string().max(120).optional().nullable(),

  city: z.string().max(120).optional().nullable(),

  province_state: z.string().max(80).optional().nullable(),

  postal_code: z.string().trim().max(12).optional().nullable(),

  crew_size: z.number().int().min(1).max(200).optional().nullable(),

  /** @deprecated use shifts */

  shift_names: z.array(z.string().max(80)).max(12).optional(),

  shifts: z.array(shiftInputSchema).length(4).optional(),

  appliances: z.array(z.string().max(64)).max(20).optional(),

  hall_photo_url: z.string().url().max(500).optional().nullable(),

  motto: z.string().max(160).optional().nullable(),

});



/** @deprecated use createHallSchema — kept for backward compat */

export const legacyCreateHallSchema = z.object({

  name: z.string().min(2).max(120),

});



export const updateHallSchema = z.object({

  hall_name: z.string().min(2).max(120).optional(),

  station_number: z.string().max(40).optional().nullable(),

  department: z.string().max(120).optional().nullable(),

  city: z.string().max(120).optional().nullable(),

  province_state: z.string().max(80).optional().nullable(),

  postal_code: z.string().trim().max(12).optional().nullable(),

  crew_size: z.number().int().min(1).max(200).optional().nullable(),

  /** @deprecated use shifts */

  shift_names: z.array(z.string().max(80)).max(12).optional(),

  shifts: z.array(shiftInputSchema).length(4).optional(),

  appliances: z.array(z.string().max(64)).max(20).optional(),

  hall_photo_url: z.string().url().max(500).optional().nullable(),

  motto: z.string().max(160).optional().nullable(),

});



export const joinHallSchema = z

  .object({

    hall_id: z.string().min(4).max(32).optional(),

    join_code: z.string().min(4).max(16).optional(),

    invite_token: z.string().min(8).max(64).optional(),

    invite_code: z.string().min(4).max(16).optional(),

  })

  .refine(

    (v) => Boolean(v.hall_id || v.join_code || v.invite_token || v.invite_code),

    { message: "Provide hall_id, join_code, invite_token, or invite_code" },

  );



export const createInviteSchema = z.object({

  method: z.enum(HALL_INVITE_METHODS),

  max_uses: z.number().int().min(1).max(100).optional().nullable(),

  expires_in_hours: z.number().int().min(1).max(168).optional(),

});



export const updateMemberRoleSchema = z.object({

  role: z.enum(HALL_ROLES),

});



export const updateMemberSchema = z.object({

  role: z.enum(HALL_ROLES).optional(),

  shift_id: z.string().min(4).max(40).nullable().optional(),

});



export const updateMemberShiftSchema = z.object({

  shift_id: z.string().min(4).max(40).nullable(),

});


