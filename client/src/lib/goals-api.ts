/**
 * Firehall Meals Goals + Progress (V1) client API.
 * Server is the sole source of truth for entitlement and progress math.
 */
import { apiRequest } from "@/lib/queryClient";
import type { GoalType, GoalsResponse } from "@shared/goals/types";

export async function fetchGoals(): Promise<GoalsResponse> {
  const res = await apiRequest("GET", "/api/goals");
  return res.json();
}

export async function setGoal(goalType: GoalType, target: number): Promise<GoalsResponse> {
  const res = await apiRequest("POST", "/api/goals", { goal_type: goalType, target });
  return res.json();
}

export async function removeGoal(goalType: GoalType): Promise<GoalsResponse> {
  const res = await apiRequest("DELETE", `/api/goals/${goalType}`);
  return res.json();
}
