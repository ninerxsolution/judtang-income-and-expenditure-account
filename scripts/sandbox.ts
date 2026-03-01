/**
 * Playground script: try print / log values.
 * Run: npm run playground   or   npx tsx scripts/sandbox.ts
 */

// eslint-disable-next-line no-console
console.log("[playground] Hello from scripts/sandbox.ts");
// eslint-disable-next-line no-console
console.log("[playground] Time:", new Date().toISOString());

// Optional: try Winston (if you add a shared logger later, require it here)
import winston from "winston";

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: "playground" },
  transports: [new winston.transports.Console()],
});

logger.info("Winston log from playground script", {
  action: "try-log",
  message: "You can edit this file to try any values or logger calls.",
});
