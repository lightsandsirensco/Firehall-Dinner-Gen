import type { CorrectionOp } from "../types.js";

/** Replace text inside step `i` (0-based) instruction. */
export const step = (i: number, find: string, replace: string): CorrectionOp => ({ op: "replace", path: `steps.${i}.instruction`, find, replace });

/** Replace a whole step instruction, guarded by its current text. */
export const stepSet = (i: number, expect: string, value: string): CorrectionOp => ({ op: "set", path: `steps.${i}.instruction`, expect, value });

export const stepTitle = (i: number, expect: string, value: string): CorrectionOp => ({ op: "set", path: `steps.${i}.title`, expect, value });

/** Change one ingredient field at index `i`. */
export const ing = (i: number, field: "name" | "quantity" | "unit" | "notes" | "group", expect: unknown, value: unknown): CorrectionOp => ({ op: "set", path: `ingredients.${i}.${field}`, expect, value });

export const addIng = (index: number, value: Record<string, string>): CorrectionOp => ({ op: "insert", path: "ingredients", index, value });

export const dropIng = (name: string): CorrectionOp => ({ op: "remove", path: "ingredients", name });

export const field = (path: string, expect: unknown, value: unknown): CorrectionOp => ({ op: "set", path, expect, value });

export const text = (path: string, find: string, replace: string): CorrectionOp => ({ op: "replace", path, find, replace });

export const GROUND_160 = "160°F (71°C)";
export const POULTRY_165 = "165°F (74°C)";
