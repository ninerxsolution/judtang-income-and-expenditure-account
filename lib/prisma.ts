/**
 * Prisma client singleton for use across the app (auth, API, etc.).
 * Prisma 7 requires a driver adapter; we use @prisma/adapter-mariadb for MySQL.
 * We parse DATABASE_URL and pass a config object to avoid mariadb driver URL parsing issues.
 */
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function parseDatabaseUrl(url: string): { host: string; port: number; user: string; password: string; database: string } {
  const trimmed = url.trim();
  // Parse mysql:// or mariadb:// with URL by normalizing scheme
  const normalized = trimmed.replace(/^(mysql|mariadb):\/\//i, "https://");
  const u = new URL(normalized);
  return {
    host: u.hostname,
    port: u.port ? parseInt(u.port, 10) : 3306,
    user: decodeURIComponent(u.username || ""),
    password: decodeURIComponent(u.password || ""),
    database: u.pathname.replace(/^\//, "").replace(/\/$/, "") || "",
  };
}

function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  const config = parseDatabaseUrl(url);
  const adapter = new PrismaMariaDb(config);
  return new PrismaClient({ adapter });
}

export const prisma =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
