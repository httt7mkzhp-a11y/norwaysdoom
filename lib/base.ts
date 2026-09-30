/** Prefiks for statiske filer når siden hostes under en understi (GitHub Pages). */
export const withBase = (p: string) => `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${p}`;
