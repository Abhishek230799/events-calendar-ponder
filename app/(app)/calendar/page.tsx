import { CalendarView } from "@/components/calendar/CalendarView";

export default function CalendarPage() {
  return (
    <div className="flex h-full flex-col gap-1 p-6">
      <h1 className="font-serif text-2xl text-[var(--color-ink)]">Events Calendar</h1>
      <p className="mb-2 text-xs text-[var(--color-ink-muted)]">Where creators find what to make content about.</p>
      <div className="min-h-0 flex-1">
        <CalendarView />
      </div>
    </div>
  );
}
