import * as React from "react"

const MOBILE_BREAKPOINT = 768

/** Tailwind sm breakpoint - use for "below sm" behavior */
const SM_BREAKPOINT = 640

/** Tailwind lg breakpoint - use for "desktop" (lg and up) */
const LG_BREAKPOINT = 1024

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}

/** True when viewport width < Tailwind sm (640px). Use for mobile-first UI below sm. */
export function useIsSmallScreen() {
  const [isSmall, setIsSmall] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${SM_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsSmall(window.innerWidth < SM_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsSmall(window.innerWidth < SM_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isSmall
}

/** True when viewport width >= Tailwind lg (1024px). Use for desktop layout. */
export function useIsDesktopOrLarger() {
  const [isDesktop, setIsDesktop] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${LG_BREAKPOINT}px)`)
    const onChange = () => {
      setIsDesktop(window.innerWidth >= LG_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsDesktop(window.innerWidth >= LG_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isDesktop
}
