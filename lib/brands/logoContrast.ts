export function logoNeedsContrastPlate(logoUrl?: string) {
  if (!logoUrl) return false;
  return !/(white|reversed|reversedout|allwhite)/i.test(logoUrl);
}

export function logoContrastStrategy(logoUrl: string | undefined, background: "light" | "dark" | "image" = "light") {
  if (!logoUrl) return "missing" as const;
  if (background === "light") return /white|reversed|reversedout|allwhite/i.test(logoUrl) ? ("unreadable" as const) : ("native" as const);
  return logoNeedsContrastPlate(logoUrl) ? ("card-backed" as const) : ("native" as const);
}
