export function logoNeedsContrastPlate(logoUrl?: string) {
  if (!logoUrl) return false;
  return !/(white|reversed|reversedout|allwhite)/i.test(logoUrl);
}
