/** Min space (px) needed below trigger for dropdown to open downward. */
const MIN_SPACE_BELOW = 220;

/**
 * Returns true when the dropdown should open upward (above the trigger)
 * because there is insufficient space below. Use when open becomes true.
 * Computes during render; triggerRef must be populated (e.g. from previous render).
 */
export function useDropdownOpenUpward(
  triggerRef: React.RefObject<HTMLElement | null>,
  open: boolean
): boolean {
  if (!open || !triggerRef.current || typeof window === "undefined") return false;
  const rect = triggerRef.current.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom;
  return spaceBelow < MIN_SPACE_BELOW;
}
