"use client";
import type { ReactNode } from "react";
import { DataProvider } from "@/lib/data";
import { LangProvider } from "@/lib/i18n";
import Shell from "./Shell";

export default function Providers({ children }: { children: ReactNode }) {
  return <LangProvider><DataProvider><Shell>{children}</Shell></DataProvider></LangProvider>;
}
