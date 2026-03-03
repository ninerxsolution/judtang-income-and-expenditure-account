/**
 * Report image storage. Files saved to storage/report/image/
 */
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const STORAGE_DIR = path.join(process.cwd(), "storage", "report", "image");
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_FILES = 3;

export function getAllowedTypes(): string[] {
  return [...ALLOWED_TYPES];
}

export function isAllowedType(mime: string): boolean {
  return ALLOWED_TYPES.includes(mime as (typeof ALLOWED_TYPES)[number]);
}

export function getMaxFileSize(): number {
  return MAX_FILE_SIZE;
}

export function getMaxFiles(): number {
  return MAX_FILES;
}

export async function ensureStorageDir(): Promise<void> {
  await mkdir(STORAGE_DIR, { recursive: true });
}

export async function saveReportImage(
  reportId: string,
  file: File
): Promise<string> {
  await ensureStorageDir();
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const safeExt = ["jpeg", "jpg", "png", "webp"].includes(ext) ? ext : "jpg";
  const filename = `${reportId}_${randomUUID()}.${safeExt}`;
  const filepath = path.join(STORAGE_DIR, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filepath, buffer);
  return `report/image/${filename}`;
}

export function getImageAbsolutePath(relativePath: string): string {
  const filename = relativePath.replace(/^report\/image\//, "");
  return path.join(STORAGE_DIR, filename);
}
