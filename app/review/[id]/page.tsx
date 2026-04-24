import { AppShell } from "@/components/layout/AppShell";
import { ClientStoredReview } from "@/components/review/ClientStoredReview";
import { loadDraft } from "@/lib/storage/drafts";

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let artifact;

  try {
    artifact = await loadDraft(id);
  } catch {
    return (
      <AppShell>
        <ClientStoredReview id={id} />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <ClientStoredReview id={id} initialArtifact={artifact} />
    </AppShell>
  );
}
