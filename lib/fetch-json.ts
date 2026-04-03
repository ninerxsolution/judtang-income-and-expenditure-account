type ErrorBody = { error?: string };

/** Best-effort JSON error message from a failed API response. */
export async function readErrorMessageFromResponse(
  res: Response,
): Promise<string | undefined> {
  const body: unknown = await res.json().catch(() => ({}));
  if (body && typeof body === "object" && "error" in body) {
    const err = (body as ErrorBody).error;
    return typeof err === "string" ? err : undefined;
  }
  return undefined;
}
