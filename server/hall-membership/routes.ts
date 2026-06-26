import type { Express, Request, Response } from "express";
import { requireCsrf } from "../csrf.js";
import { logError } from "../logger.js";
import { insertAnalyticsEvents } from "../analytics/analytics-store.js";
import { requireAuth, type AuthedRequest } from "../auth/auth-middleware.js";
import {
  createHall,
  createHallInvite,
  getHallDetail,
  getJoinPreview,
  initHallMembershipStore,
  joinHall,
  listHallInvites,
  listUserHallSummaries,
  removeHallMember,
  revokeHallInvite,
  updateHall,
  updateMember,
  updateMemberRole,
  updateMemberShift,
} from "./store.js";
import {
  createHallSchema,
  createInviteSchema,
  joinHallSchema,
  legacyCreateHallSchema,
  updateHallSchema,
  updateMemberRoleSchema,
  updateMemberSchema,
  updateMemberShiftSchema,
} from "../../shared/hall-membership/schema.js";

let storeReady = false;

async function ensureStore(): Promise<void> {
  if (!storeReady) {
    await initHallMembershipStore();
    storeReady = true;
  }
}

function trackHallEvent(
  req: Request,
  eventType:
    | "hall_created"
    | "hall_updated"
    | "shift_created"
    | "hall_joined"
    | "hall_invite_sent"
    | "hall_invite_accepted",
  metadata?: Record<string, string | number | boolean>,
): void {
  try {
    const sessionId = (req as AuthedRequest)._sessionId;
    insertAnalyticsEvents([{ event_type: eventType, route: "/halls", metadata }], sessionId);
  } catch {
    /* optional */
  }
}

export function registerHallMembershipRoutes(app: Express): void {
  app.get("/api/halls/join/preview", async (req: Request, res: Response) => {
    try {
      await ensureStore();
      const preview = getJoinPreview({
        invite_token: String(req.query.token ?? "") || undefined,
        invite_code: String(req.query.code ?? "") || undefined,
        join_code: String(req.query.join_code ?? "") || undefined,
      });
      if (!preview) {
        return res.status(404).json({ message: "Invite or hall not found" });
      }
      return res.json(preview);
    } catch (err) {
      logError("hall", "join preview failed", err);
      return res.status(500).json({ message: "Failed to load invite preview" });
    }
  });

  app.get("/api/halls/mine", requireAuth, async (req: AuthedRequest, res: Response) => {
    try {
      await ensureStore();
      return res.json({ halls: listUserHallSummaries(req._authUserId!) });
    } catch (err) {
      logError("hall", "list mine failed", err);
      return res.status(500).json({ message: "Failed to load halls" });
    }
  });

  app.post("/api/halls", requireCsrf, requireAuth, async (req: AuthedRequest, res: Response) => {
    try {
      await ensureStore();
      const parsed = createHallSchema.safeParse(req.body);
      const legacy = !parsed.success ? legacyCreateHallSchema.safeParse(req.body) : null;

      if (!parsed.success && !legacy?.success) {
        return res.status(400).json({ message: "Invalid hall data" });
      }

      const input = parsed.success
        ? parsed.data
        : { hall_name: legacy?.data?.name ?? "Linked Hall" };

      const detail = createHall(req._authUserId!, input);
      trackHallEvent(req, "hall_created", {
        hall_id: detail.hall.hall_id,
        has_station: Boolean(detail.hall.station_number),
      });
      for (const shift of detail.shifts) {
        trackHallEvent(req, "shift_created", {
          hall_id: detail.hall.hall_id,
          shift_id: shift.shift_id,
          shift_key: shift.shift_key,
        });
      }

      return res.status(201).json(detail);
    } catch (err) {
      logError("hall", "create failed", err);
      return res.status(500).json({ message: "Failed to create hall" });
    }
  });

  app.post("/api/halls/join", requireCsrf, requireAuth, async (req: AuthedRequest, res: Response) => {
    try {
      await ensureStore();
      const parsed = joinHallSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid join request" });
      }

      const result = joinHall(req._authUserId!, parsed.data);
      if (!result.ok) {
        const status =
          result.reason === "invite_expired" || result.reason === "invite_exhausted" ? 410 : 404;
        return res.status(status).json({ message: result.reason });
      }

      trackHallEvent(req, "hall_joined", {
        hall_id: result.hall.hall_id,
        via: result.via,
      });
      if (result.invite_id) {
        trackHallEvent(req, "hall_invite_accepted", {
          hall_id: result.hall.hall_id,
          invite_id: result.invite_id,
        });
      }

      return res.json({ hall: result.hall, via: result.via });
    } catch (err) {
      logError("hall", "join failed", err);
      return res.status(500).json({ message: "Failed to join hall" });
    }
  });

  app.get("/api/halls/:hallId", requireAuth, async (req: AuthedRequest, res: Response) => {
    try {
      await ensureStore();
      const hallId = String(req.params.hallId ?? "");
      const detail = getHallDetail(hallId, req._authUserId!);
      if (!detail) {
        return res.status(404).json({ message: "Hall not found" });
      }
      return res.json(detail);
    } catch (err) {
      logError("hall", "detail failed", err);
      return res.status(500).json({ message: "Failed to load hall" });
    }
  });

  app.patch("/api/halls/:hallId", requireCsrf, requireAuth, async (req: AuthedRequest, res: Response) => {
    try {
      await ensureStore();
      const hallId = String(req.params.hallId ?? "");
      const parsed = updateHallSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid linked hall settings" });
      }

      const hall = updateHall(hallId, req._authUserId!, parsed.data);
      if (!hall) {
        return res.status(403).json({ message: "Cannot update linked hall settings" });
      }

      trackHallEvent(req, "hall_updated", {
        hall_id: hallId,
        fields: Object.keys(parsed.data).join(","),
      });

      const detail = getHallDetail(hallId, req._authUserId!);
      return res.json(detail);
    } catch (err) {
      logError("hall", "update failed", err);
      return res.status(500).json({ message: "Failed to update hall" });
    }
  });

  app.post(
    "/api/halls/:hallId/invites",
    requireCsrf,
    requireAuth,
    async (req: AuthedRequest, res: Response) => {
      try {
        await ensureStore();
        const hallId = String(req.params.hallId ?? "");
        const parsed = createInviteSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({ message: "Invalid invite request" });
        }

        const invite = createHallInvite(hallId, req._authUserId!, parsed.data.method, {
          max_uses: parsed.data.max_uses,
          expires_in_hours: parsed.data.expires_in_hours,
        });
        if (!invite) {
          return res.status(403).json({ message: "Cannot create invite" });
        }

        trackHallEvent(req, "hall_invite_sent", {
          hall_id: hallId,
          method: invite.method,
        });

        return res.status(201).json({ invite });
      } catch (err) {
        logError("hall", "invite create failed", err);
        return res.status(500).json({ message: "Failed to create invite" });
      }
    },
  );

  app.get("/api/halls/:hallId/invites", requireAuth, async (req: AuthedRequest, res: Response) => {
    try {
      await ensureStore();
      const hallId = String(req.params.hallId ?? "");
      const invites = listHallInvites(hallId, req._authUserId!);
      return res.json({ invites });
    } catch (err) {
      logError("hall", "invite list failed", err);
      return res.status(500).json({ message: "Failed to list invites" });
    }
  });

  app.delete(
    "/api/halls/:hallId/invites/:inviteId",
    requireCsrf,
    requireAuth,
    async (req: AuthedRequest, res: Response) => {
      try {
        await ensureStore();
        const hallId = String(req.params.hallId ?? "");
        const inviteId = String(req.params.inviteId ?? "");
        const ok = revokeHallInvite(hallId, req._authUserId!, inviteId);
        if (!ok) {
          return res.status(403).json({ message: "Cannot revoke invite" });
        }
        return res.json({ ok: true });
      } catch (err) {
        logError("hall", "invite revoke failed", err);
        return res.status(500).json({ message: "Failed to revoke invite" });
      }
    },
  );

  app.patch(
    "/api/halls/:hallId/members/:userId",
    requireCsrf,
    requireAuth,
    async (req: AuthedRequest, res: Response) => {
      try {
        await ensureStore();
        const hallId = String(req.params.hallId ?? "");
        const targetUserId = String(req.params.userId ?? "");
        const parsed = updateMemberSchema.safeParse(req.body);
        const legacy = !parsed.success ? updateMemberRoleSchema.safeParse(req.body) : null;

        if (!parsed.success && !legacy?.success) {
          return res.status(400).json({ message: "Invalid member update" });
        }

        let ok = false;
        if (parsed.success) {
          ok = updateMember(hallId, req._authUserId!, targetUserId, parsed.data);
        } else if (legacy?.success) {
          ok = updateMemberRole(hallId, req._authUserId!, targetUserId, legacy.data.role);
        }

        if (!ok) {
          return res.status(403).json({ message: "Cannot update member" });
        }

        const detail = getHallDetail(hallId, req._authUserId!);
        return res.json(detail);
      } catch (err) {
        logError("hall", "member update failed", err);
        return res.status(500).json({ message: "Failed to update member" });
      }
    },
  );

  app.patch(
    "/api/halls/:hallId/members/:userId/shift",
    requireCsrf,
    requireAuth,
    async (req: AuthedRequest, res: Response) => {
      try {
        await ensureStore();
        const hallId = String(req.params.hallId ?? "");
        const targetUserId = String(req.params.userId ?? "");
        const parsed = updateMemberShiftSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({ message: "Invalid shift assignment" });
        }

        const ok = updateMemberShift(
          hallId,
          req._authUserId!,
          targetUserId,
          parsed.data.shift_id,
        );
        if (!ok) {
          return res.status(403).json({ message: "Cannot update member shift" });
        }

        const detail = getHallDetail(hallId, req._authUserId!);
        return res.json(detail);
      } catch (err) {
        logError("hall", "member shift failed", err);
        return res.status(500).json({ message: "Failed to update member shift" });
      }
    },
  );

  app.delete(
    "/api/halls/:hallId/members/:userId",
    requireCsrf,
    requireAuth,
    async (req: AuthedRequest, res: Response) => {
      try {
        await ensureStore();
        const hallId = String(req.params.hallId ?? "");
        const targetUserId = String(req.params.userId ?? "");
        const ok = removeHallMember(hallId, req._authUserId!, targetUserId);
        if (!ok) {
          return res.status(403).json({ message: "Cannot remove member" });
        }

        const detail = getHallDetail(hallId, req._authUserId!);
        return res.json(detail);
      } catch (err) {
        logError("hall", "member remove failed", err);
        return res.status(500).json({ message: "Failed to remove member" });
      }
    },
  );

  /** Legacy join by hall ID in path */
  app.post(
    "/api/halls/:hallId/join",
    requireCsrf,
    requireAuth,
    async (req: AuthedRequest, res: Response) => {
      try {
        await ensureStore();
        const hallId = String(req.params.hallId ?? "");
        const result = joinHall(req._authUserId!, { hall_id: hallId });
        if (!result.ok) {
          return res.status(404).json({ message: "Hall not found" });
        }
        trackHallEvent(req, "hall_joined", { hall_id: hallId, via: "hall_id" });
        return res.json({ hall: result.hall });
      } catch (err) {
        logError("hall", "legacy join failed", err);
        return res.status(500).json({ message: "Failed to join hall" });
      }
    },
  );
}
