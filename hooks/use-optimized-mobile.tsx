"use client";

import { useState, useEffect, useCallback } from "react";

const MOBILE_BREAKPOINT = 768;

export function useMobile() {
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined);

  const checkIsMobile = useCallback(() => {
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
  }, []);

  useEffect(() => {
    // Use matchMedia for better performance than resize events
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);

    // Initial check
    checkIsMobile();

    // Use the more efficient matchMedia listener
    const handleChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
    };

    mql.addEventListener("change", handleChange);

    return () => mql.removeEventListener("change", handleChange);
  }, [checkIsMobile]);

  return !!isMobile;
}
