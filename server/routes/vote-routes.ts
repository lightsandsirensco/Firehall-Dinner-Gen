import type { Express, Request, Response } from "express";
import { hallVoteCreateSchema, type GenerateResponse } from "@shared/schema";
import type { VoteOptionInput } from "@shared/schema";
import { buildMinimalGenerateResponse } from "@shared/minimal-generate-response";
import {
  createHallVote,
  getHallVote,
  castBallot,
  closeHallVote,
  hashVoterFingerprint,
} from "../hall-vote-store";
import { checkRateLimit, hashIp } from "../cache-store";
import { requireCsrf } from "../csrf.js";
import { getClientIp } from "../client-ip.js";
import { logError } from "../logger";
import { routeParam } from "./param.js";

export function registerVoteRoutes(app: Express): void {
  app.post("/api/hall-vote", requireCsrf, async (req: Request, res: Response) => {
    try {
      const sessionId = (req as { _sessionId?: string })._sessionId || "unknown";
      const clientIp = getClientIp(req);
      const ipHash = hashIp(clientIp);

      const voteLimit = checkRateLimit(`hallvote:${ipHash}`, 60_000, 2);
      if (!voteLimit.allowed) {
        return res.status(429).json({ message: "Please wait before creating another vote.", retry_after_seconds: 60 });
      }

      const parsed = hallVoteCreateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid request: " + parsed.error.message });
      }

      const { title, options } = parsed.data;
      const voteOptions: VoteOptionInput[] = options.map((opt) => ({
        name: opt.name,
        description: opt.description,
        est_cost: opt.est_cost,
        est_time: opt.est_time,
        recipe_payload:
          (opt.recipe_payload as GenerateResponse | undefined) ??
          buildMinimalGenerateResponse(opt.name),
      }));

      const { voteId } = createHallVote(title, voteOptions, sessionId);

      const { resolveHallVoteShareOrigin } = await import("../hall-vote-og.js");
      const shareUrl = `${resolveHallVoteShareOrigin(req)}/vote/${voteId}`;

      return res.json({ vote_id: voteId, share_url: shareUrl });
    } catch (error: unknown) {
      logError("hallvote", "create failed", error);
      return res.status(500).json({ message: "Failed to create vote" });
    }
  });

  app.get("/api/hall-vote/:voteId", (req: Request, res: Response) => {
    try {
      const voteId = routeParam(req.params.voteId);
      const sessionId = (req as { _sessionId?: string })._sessionId || "";
      const clientIp = getClientIp(req);
      const ua = req.headers["user-agent"] || "";
      const fingerprint = hashVoterFingerprint(clientIp, ua);

      const vote = getHallVote(voteId, sessionId, fingerprint);
      if (!vote) {
        return res.status(404).json({ message: "Vote not found" });
      }

      return res.json(vote);
    } catch (error: unknown) {
      logError("hallvote", "get failed", error);
      return res.status(500).json({ message: "Failed to get vote" });
    }
  });

  app.post("/api/hall-vote/:voteId/vote", (req: Request, res: Response) => {
    try {
      const voteId = routeParam(req.params.voteId);
      const { optionId } = req.body;

      if (typeof optionId !== "number") {
        return res.status(400).json({ message: "optionId is required" });
      }

      const clientIp = getClientIp(req);
      const ipHash = hashIp(clientIp);
      const voteRateLimit = checkRateLimit(`vote:${ipHash}`, 60_000, 10);
      if (!voteRateLimit.allowed) {
        return res.status(429).json({ message: "Too many vote attempts. Please wait." });
      }

      const ua = req.headers["user-agent"] || "";
      const fingerprint = hashVoterFingerprint(clientIp, ua);

      const result = castBallot(voteId, optionId, fingerprint);
      if (!result.success) {
        const statusCode = result.error === "You already voted" ? 409 : 400;
        return res.status(statusCode).json({ message: result.error });
      }

      const sessionId = (req as { _sessionId?: string })._sessionId || "";
      const updatedVote = getHallVote(voteId, sessionId, fingerprint);
      return res.json(updatedVote);
    } catch (error: unknown) {
      logError("hallvote", "cast failed", error);
      return res.status(500).json({ message: "Failed to cast vote" });
    }
  });

  app.post("/api/hall-vote/:voteId/close", requireCsrf, (req: Request, res: Response) => {
    try {
      const voteId = routeParam(req.params.voteId);
      const sessionId = (req as { _sessionId?: string })._sessionId || "";
      const result = closeHallVote(voteId, sessionId);
      if (!result.success) {
        return res.status(403).json({ message: result.error });
      }

      const clientIp = getClientIp(req);
      const ua = req.headers["user-agent"] || "";
      const fingerprint = hashVoterFingerprint(clientIp, ua);
      const updatedVote = getHallVote(voteId, sessionId, fingerprint);
      return res.json(updatedVote);
    } catch (error: unknown) {
      logError("hallvote", "close failed", error);
      return res.status(500).json({ message: "Failed to close vote" });
    }
  });
}
