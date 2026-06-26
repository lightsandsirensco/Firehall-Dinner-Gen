/**

 * Hall growth dashboard API (admin).

 */



import type { Express, Request, Response } from "express";

import type { AnalyticsPeriod } from "../../shared/analytics/events.js";

import type { GrowthChartRange } from "../../shared/growth-dashboard/types.js";

import { GROWTH_CHART_RANGES } from "../../shared/growth-dashboard/types.js";

import { getGrowthDashboard, initGrowthDashboardStore } from "./store.js";

import { insertAnalyticsEvents, initAnalyticsStore } from "../analytics/analytics-store.js";

import { logError } from "../logger.js";



let storeReady = false;



async function ensureStore(): Promise<void> {

  if (!storeReady) {

    await initGrowthDashboardStore();

    await initAnalyticsStore();

    storeReady = true;

  }

}



const PERIODS = new Set<AnalyticsPeriod>(["today", "7d", "30d", "all"]);



function parsePeriod(raw: unknown): AnalyticsPeriod {

  const p = String(raw ?? "30d");

  return PERIODS.has(p as AnalyticsPeriod) ? (p as AnalyticsPeriod) : "30d";

}



function parseChartRange(raw: unknown): GrowthChartRange {

  const r = String(raw ?? "30d");

  return GROWTH_CHART_RANGES.includes(r as GrowthChartRange) ? (r as GrowthChartRange) : "30d";

}



export function registerGrowthDashboardRoutes(app: Express): void {

  app.get("/api/admin/growth-dashboard", async (req: Request, res: Response) => {

    try {

      await ensureStore();

      const period = parsePeriod(req.query.period);

      const chartRange = parseChartRange(req.query.chart_range ?? req.query.chart);

      const payload = getGrowthDashboard(period, chartRange);



      const sessionId = (req as Request & { _sessionId?: string })._sessionId;

      insertAnalyticsEvents(

        [

          {

            event_type: "growth_dashboard_viewed",

            route: "/admin/growth",

            metadata: { period, chart_range: chartRange },

          },

        ],

        sessionId,

      );



      return res.json(payload);

    } catch (err) {

      logError("growth-dashboard", "dashboard failed", err);

      return res.status(500).json({ message: "Failed to load growth dashboard" });

    }

  });

}


