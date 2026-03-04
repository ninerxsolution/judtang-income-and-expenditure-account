import { NextResponse } from "next/server";

/**
 * Dev-only API route: try print / log values from Next.js context.
 * GET /api/dev — only works when NODE_ENV === 'development'.
 * Use for: checking env, trying logger, quick experiments.
 */
export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Not available outside development" },
      { status: 404 }
    );
  }

  const payload = {
    ok: true,
    message: "Dev playground — edit app/api/dev/route.ts to try things",
    timestamp: new Date().toISOString(),
    env: {
      NODE_ENV: process.env.NODE_ENV,
      APP_ENV: process.env.APP_ENV ?? "(not set)",
    },
  };

  // Log to server console when this route is hit
  console.log("[api/dev] GET", payload);

  return NextResponse.json(payload);
}
