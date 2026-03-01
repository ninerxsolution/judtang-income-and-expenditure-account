/**
 * Server-side auth helpers. Re-export auth config and getServerSession.
 * Client-side signIn/signOut: use from "next-auth/react".
 */
export { authOptions } from "@/auth";
export { getServerSession } from "next-auth";
