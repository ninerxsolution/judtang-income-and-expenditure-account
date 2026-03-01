/**
 * GET: returns app metadata (name, version) for display in settings.
 * Reads from environment variables (APP_NAME, APP_VERSION, PATCH_VERSION).
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appName = process.env.APP_NAME ?? "Judtang";
  const appVersion = process.env.APP_VERSION ?? "0.1.0";
  const patchVersion = process.env.PATCH_VERSION ?? "";

  return NextResponse.json({
    appName,
    appVersion,
    patchVersion,
    fullVersion: patchVersion ? `${appVersion} (${patchVersion})` : appVersion,
  });
}
