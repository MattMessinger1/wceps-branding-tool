import assert from "node:assert/strict";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { readTraceDatasetImage } from "@/lib/trace-datasets";
import { traceDatasetsDir } from "@/lib/storage/paths";

test("trace dataset images are addressable for app-rendered artifact HTML", async () => {
  const datasetId = "test-artifact-trace-dataset";
  const datasetDir = path.join(traceDatasetsDir, datasetId);
  const imageDir = path.join(datasetDir, "images");

  await rm(datasetDir, { recursive: true, force: true });
  await mkdir(imageDir, { recursive: true });
  await writeFile(
    path.join(datasetDir, "manifest.json"),
    JSON.stringify({
      datasetId,
      createdAt: new Date().toISOString(),
      projectName: "Brand Building",
      orgName: "WCEPS",
      experimentName: "test",
      artifactCount: 0,
      artifacts: [],
    }),
    "utf8",
  );
  await writeFile(path.join(imageDir, "sample.webp"), Buffer.from("RIFFxxxxWEBP", "utf8"));

  try {
    const image = await readTraceDatasetImage(datasetId, "sample.webp");
    assert.ok(image);
    assert.equal(image.contentType, "image/webp");
    assert.equal(image.buffer.toString("utf8"), "RIFFxxxxWEBP");
  } finally {
    await rm(datasetDir, { recursive: true, force: true });
  }
});
