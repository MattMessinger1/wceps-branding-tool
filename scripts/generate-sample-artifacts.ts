import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { generateArtifact } from "@/lib/generation/generateArtifact";
import { draftsDir, examplesDir } from "@/lib/storage/paths";
import { saveDraft } from "@/lib/storage/drafts";

async function main() {
  const raw = await readFile(path.join(examplesDir, "sample-requests.json"), "utf8");
  const requests = JSON.parse(raw) as unknown[];
  await mkdir(draftsDir, { recursive: true });

  for (const request of requests) {
    const artifact = await generateArtifact(request);
    await saveDraft(artifact);
    await writeFile(path.join(examplesDir, `${artifact.id}.json`), `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
    console.log(`Generated ${artifact.brand} ${artifact.artifactType}: ${artifact.id}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
