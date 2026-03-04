import * as React from "react"

const MOBILE_BREAKPOINT = 768

/** Tailwind sm breakpoint - use for "below sm" behavior */
const SM_BREAKPOINT = 640

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
