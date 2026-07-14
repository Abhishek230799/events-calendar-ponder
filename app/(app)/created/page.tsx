import { CreatedEventsList } from "@/components/events/CreatedEventsList";

export default function CreatedEventsPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-2 p-8">
      <h1 className="font-serif text-3xl text-[var(--color-ink)]">Created Events</h1>
      <p className="mb-4 text-sm text-[var(--color-ink-muted)]">Everything you&apos;ve created — edit or take down anytime.</p>
      <CreatedEventsList />
    </div>
  );
}
