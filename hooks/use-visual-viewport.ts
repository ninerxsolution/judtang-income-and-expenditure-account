import * as React from "react";

export type VisualViewportState = {
  height: number;
  offsetTop: number;
};

/**
 * Returns { height, offsetTop } from window.visualViewport when enabled.
 * Listens to resize and scroll events so the UI can adapt when the mobile keyboard opens.
 * SSR-safe: returns null until client-side effect runs.
 */
export function useVisualViewport(enabled: boolean): VisualViewportState | null {
  const [state, setState] = React.useState<VisualViewportState | null>(null);

  React.useEffect(() => {
    if (!enabled) {
      setState(null);
      return;
    }

    const vv =
      typeof window !== "undefined" ? window.visualViewport : undefined;
    if (!vv) {
      return;
    }

    const update = () => {
      setState({ height: vv.height, offsetTop: vv.offsetTop });
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);

    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, [enabled]);

  return state;
}
