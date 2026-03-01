/**
 * Load .env before any other imports that depend on process.env.
 * Must be imported first in seed.ts when running via tsx (e.g. db:seed:reset).
 */
import dotenv from "dotenv";
import path from "path";

const root = path.resolve(process.cwd());
dotenv.config({ path: path.join(root, ".env") });
dotenv.config({ path: path.join(root, ".env.local"), override: true });
