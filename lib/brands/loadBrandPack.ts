import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { BrandPackSchema, type BrandPack } from "@/lib/schema/brandPack";
import { StyleTokensSchema } from "@/lib/schema/styleTokens";
import { brandPacksDir, styleDir } from "@/lib/storage/paths";

export const brandSlugMap: Record<string, string> = {
  wceps: "wceps-master",
  "wceps master": "wceps-master",
  "wceps-master": "wceps-master",
  "care coaching": "care-coaching",
  care: "care-coaching",
  "care-coaching": "care-coaching",
  ccna: "ccna",
  "care coaching needs assessment": "ccna",
  "care coaching needs assessment ccna": "ccna",
  webbalign: "webbalign",
  "webb align": "webbalign",
  "webb-align": "webbalign",
  call: "call",
  "wida prime": "wida-prime",
  widaprime: "wida-prime",
  "wida-prime": "wida-prime",
};

export function normalizeBrandSlug(value: string) {
  const normalized = value.trim().toLowerCase();
  return brandSlugMap[normalized] ?? normalized.replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function loadBrandPack(brand: string): Promise<BrandPack> {
  const slug = normalizeBrandSlug(brand || "wceps");
  const raw = await readFile(path.join(brandPacksDir, `${slug}.json`), "utf8");
  return BrandPackSchema.parse(JSON.parse(raw));
}

export async function loadAllBrandPacks(): Promise<BrandPack[]> {
  const files = await readdir(brandPacksDir);
  const packs = await Promise.all(
    files
      .filter((file) => file.endsWith(".json"))
      .map(async (file) => {
        const raw = await readFile(path.join(brandPacksDir, file), "utf8");
        return BrandPackSchema.parse(JSON.parse(raw));
      }),
  );

  return packs.sort((a, b) => {
    if (a.brandName === "WCEPS") return -1;
    if (b.brandName === "WCEPS") return 1;
    return a.brandName.localeCompare(b.brandName);
  });
}

export async function loadStyleTokens() {
  const raw = await readFile(path.join(styleDir, "inferred-style-tokens.json"), "utf8");
  return StyleTokensSchema.parse(JSON.parse(raw));
}
