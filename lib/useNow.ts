"use client";
import { useEffect, useState } from "react";

/** Returnerer null på server/første render (unngår hydreringsavvik), deretter tid hvert `ms`. */
export function useNow(ms = 1000): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}
