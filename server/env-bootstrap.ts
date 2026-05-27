/**
 * Must be the first import in server/index.ts (and any server entrypoint).
 * ESM hoists imports — OpenAI clients must not run before this module executes.
 */
import { loadProjectEnv } from "./lib/load-project-env.js";

loadProjectEnv();
