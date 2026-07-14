import { CollabRequestsList } from "@/components/collabs/CollabRequestsList";

export default function CollabsPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-2 p-8">
      <h1 className="font-serif text-3xl text-[var(--color-ink)]">Collab requests</h1>
      <p className="mb-4 text-sm text-[var(--color-ink-muted)]">
        Standalone for now — sends and persists, no accept/decline flow yet since the rest of Ponder's social graph
        doesn't exist to build that on.
      </p>
      <CollabRequestsList />
    </div>
  );
}
