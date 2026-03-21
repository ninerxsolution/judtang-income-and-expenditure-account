/**
 * Announcement image uploads. Files saved to storage/announcement/image/
 * (gitignored). Served publicly via GET /api/announcement/image/[filename]
 * and URL path /storage/announcement/image/... (see next.config rewrites).
 */
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const STORAGE_DIR = path.join(process.cwd(), "storage", "announcement", "image");

export const ANNOUNCEMENT_IMAGE_PUBLIC_PREFIX = "/storage/announcement/image";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function getAllowedAnnouncementImageTypes(): string[] {
  return [...ALLOWED_TYPES];
}

export function isAllowedAnnouncementImageType(mime: string): boolean {
  return ALLOWED_TYPES.includes(mime as (typeof ALLOWED_TYPES)[number]);
}

export function getMaxAnnouncementImageSize(): number {
  return MAX_FILE_SIZE;
}

export async function ensureAnnouncementImageDir(): Promise<void> {
  await mkdir(STORAGE_DIR, { recursive: true });
}

function extensionFromMime(mime: string): "jpg" | "png" | "webp" {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

/** Returns public URL path e.g. /storage/announcement/image/<uuid>.png */
export async function saveAnnouncementImage(file: File): Promise<{ url: string; filename: string }> {
  await ensureAnnouncementImageDir();
  const mime = file.type;
  if (!isAllowedAnnouncementImageType(mime)) {
    throw new Error("INVALID_TYPE");
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("TOO_LARGE");
  }

  const ext = extensionFromMime(mime);
  const filename = `${randomUUID()}.${ext}`;
  const filepath = path.join(STORAGE_DIR, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filepath, buffer);

  return {
    filename,
    url: `${ANNOUNCEMENT_IMAGE_PUBLIC_PREFIX}/${filename}`,
  };
}

export function getAnnouncementImageStorageDir(): string {
  return STORAGE_DIR;
}

/** Safe single-segment filename only (no path chars). */
export function isSafeAnnouncementImageFilename(name: string): boolean {
  return /^[a-f0-9-]+\.(jpe?g|png|webp)$/i.test(name);
}

export function getAnnouncementImageAbsolutePath(filename: string): string {
  if (!isSafeAnnouncementImageFilename(filename)) {
    throw new Error("Invalid filename");
  }
  return path.join(STORAGE_DIR, filename);
}
