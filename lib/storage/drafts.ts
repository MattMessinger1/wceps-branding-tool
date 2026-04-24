import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { draftsDir, safeDraftPath } from "./paths";
import { GeneratedArtifactSchema, type GeneratedArtifact } from "@/lib/schema/generatedArtifact";

export async function saveDraft(artifact: GeneratedArtifact) {
  await mkdir(draftsDir, { recursive: true });
  const filePath = safeDraftPath(artifact.id);
  await writeFile(filePath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  return filePath;
}

export async function loadDraft(id: string) {
  const raw = await readFile(safeDraftPath(id), "utf8");
  return GeneratedArtifactSchema.parse(JSON.parse(raw));
}

export async function listDrafts() {
  await mkdir(draftsDir, { recursive: true });
  const files = await readdir(draftsDir);
  const drafts: GeneratedArtifact[] = [];

  for (const file of files.filter((entry) => entry.endsWith(".json"))) {
    try {
      const raw = await readFile(`${draftsDir}/${file}`, "utf8");
      drafts.push(GeneratedArtifactSchema.parse(JSON.parse(raw)));
    } catch {
      // Ignore partial or manually edited drafts so the home page remains usable.
    }
  }

  return drafts.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
