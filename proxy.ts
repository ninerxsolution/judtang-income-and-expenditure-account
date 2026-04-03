/**
 * Next.js 16 proxy — route protection (redirect unauthenticated to sign-in).
 * Uses getServerSession for database strategy (withAuth is JWT-only).
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

const protectedPathPrefixes = ["/dashboard"];
const adminPathPrefix = "/admin";
const publicPathPrefixes = ["/", "/sign-in", "/register", "/restore-account", "/api/auth", "/_next", "/favicon"];

/** Logged-in users are redirected away from these (to dashboard or safe callbackUrl). */
const authEntryPaths = ["/sign-in", "/register", "/restore-account"] as const;

function isAuthEntryPath(pathname: string): boolean {
  return authEntryPaths.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

function getSafePostAuthRedirect(
  request: NextRequest,
  rawCallback: string | null,
  fallbackPath: string
): URL {
  if (!rawCallback) {
    return new URL(fallbackPath, request.url);
  }
  const trimmed = rawCallback.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return new URL(fallbackPath, request.url);
  }
  let resolved: URL;
  try {
    resolved = new URL(trimmed, request.url);
  } catch {
    return new URL(fallbackPath, request.url);
  }
  if (resolved.origin !== request.nextUrl.origin) {
    return new URL(fallbackPath, request.url);
  }
  if (
    authEntryPaths.some(
      (p) =>
        resolved.pathname === p || resolved.pathname.startsWith(`${p}/`)
    )
  ) {
    return new URL(fallbackPath, request.url);
  }
  return resolved;
}

function isPublic(pathname: string): boolean {
  if (pathname === "/") return true;
  return publicPathPrefixes.some(
    (p) => p === pathname || (p !== "/" && pathname.startsWith(p))
  );
}

function isProtected(pathname: string): boolean {
  return protectedPathPrefixes.some((p) => pathname.startsWith(p));
}

function isAdminPath(pathname: string): boolean {
  return pathname === adminPathPrefix || pathname.startsWith(adminPathPrefix + "/");
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (isAuthEntryPath(pathname)) {
    const session = await getServerSession(authOptions);
    if (session) {
      const callback = request.nextUrl.searchParams.get("callbackUrl");
      const target = getSafePostAuthRedirect(request, callback, "/dashboard");
      return NextResponse.redirect(target);
    }
    return NextResponse.next();
  }

  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  if (isAdminPath(pathname)) {
    const session = await getServerSession(authOptions);
    if (!session) {
      const signInUrl = new URL("/sign-in", request.url);
      signInUrl.searchParams.set("callbackUrl", pathname + request.nextUrl.search);
      return NextResponse.redirect(signInUrl);
    }
    const role = (session.user as { role?: string })?.role;
    if (role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  if (isProtected(pathname)) {
    const session = await getServerSession(authOptions);
    if (!session) {
      const signInUrl = new URL("/sign-in", request.url);
      signInUrl.searchParams.set("callbackUrl", pathname + request.nextUrl.search);
      return NextResponse.redirect(signInUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:png|ico|svg|webp)$).*)"],
};
