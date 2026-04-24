import { loadAllBrandPacks, loadStyleTokens } from "@/lib/brands/loadBrandPack";

async function main() {
  const [packs, style] = await Promise.all([loadAllBrandPacks(), loadStyleTokens()]);

  console.log(`Validated ${packs.length} brand packs.`);
  console.log(`Loaded style tokens: ${style.confidence ?? style.source ?? "available"}`);
  for (const pack of packs) {
    console.log(`- ${pack.brandName}: ${pack.sourceEvidence.length} evidence blocks`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
