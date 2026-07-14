"use client";

import { useEffect, useState } from "react";
import { CATEGORY_META } from "@/components/calendar/categoryStyles";
import { EventModal, buildRecurrenceRule, type EventFormValues } from "@/components/calendar/EventModal";
import type { EventCategory } from "@/components/calendar/types";
import { CalendarX2, Pencil, Trash2 } from "lucide-react";

type CreatedEvent = {
  id: string;
  title: string;
  description: string | null;
  category: EventCategory;
  location: string | null;
  isVirtual: boolean;
  startAt: string;
  endAt: string;
  timezone: string;
  recurrenceRule: string | null;
  reminderOffsets: number[];
  attendeeCount: number;
};

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function CreatedEventsList() {
  const [events, setEvents] = useState<CreatedEvent[] | null>(null);
  const [editing, setEditing] = useState<CreatedEvent | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch("/api/events/created")
      .then((r) => r.json())
      .then((data) => setEvents(data.events ?? []));
  }

  useEffect(load, []);

  async function handleEditSubmit(values: EventFormValues) {
    if (!editing) return;
    const res = await fetch(`/api/events/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: values.title,
        description: values.description,
        category: values.category,
        location: values.location,
        isVirtual: values.isVirtual,
        startAt: new Date(values.startAt).toISOString(),
        endAt: new Date(values.endAt).toISOString(),
        timezone: values.timezone,
        reminderOffsets: values.reminderOffsets,
        // recurrenceRule deliberately omitted — editing an existing series'
        // schedule isn't supported yet, see EventModal's isEditingRecurring note
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? "Failed to update event");
    }
    setEditing(null);
    load();
  }

  async function handleDelete(id: string) {
    setError(null);
    const res = await fetch(`/api/events/${id}`, { method: "DELETE" });
    setConfirmingDeleteId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to delete event");
      return;
    }
    setEvents((prev) => prev?.filter((e) => e.id !== id) ?? prev);
  }

  if (events === null) return <p className="text-sm text-[var(--color-ink-muted)]">Loading…</p>;

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-16 text-center backdrop-blur-sm">
        <span
          className="flex h-12 w-12 items-center justify-center rounded-xl"
          style={{ background: "linear-gradient(135deg, rgba(255,130,114,0.2), rgba(139,127,250,0.25))" }}
        >
          <CalendarX2 size={22} className="text-[var(--color-violet)]" />
        </span>
        <p className="text-sm text-[var(--color-ink-muted)]">You haven&apos;t created any events yet.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {error && (
        <div className="rounded-lg border border-[var(--color-coral)]/30 bg-[var(--color-coral)]/10 px-3 py-2 text-xs text-[var(--color-coral)]">
          {error}
        </div>
      )}

      {events.map((event) => {
        const meta = CATEGORY_META[event.category];
        const isConfirming = confirmingDeleteId === event.id;
        return (
          <div key={event.id} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/50 p-3">
            <span
              className="mb-1 inline-block rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-wide"
              style={{ backgroundColor: meta.tint, color: meta.color }}
            >
              {meta.label}
            </span>
            <p className="text-sm font-medium text-[var(--color-ink)]">
              {event.title}
              {event.recurrenceRule && (
                <span className="ml-1.5 font-mono text-[9px] text-[var(--color-ink-muted)]">· repeats</span>
              )}
            </p>
            <p className="font-mono text-xs text-[var(--color-ink-muted)]">
              {new Date(event.startAt).toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
              {" · "}
              {event.attendeeCount} going
            </p>
            {event.location && <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">{event.location}</p>}

            {!isConfirming ? (
              <div className="mt-2.5 flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setEditing(event)}
                  className="flex items-center gap-1 rounded-full border border-[var(--color-border)] px-3 py-1 text-xs text-[var(--color-ink-muted)] transition-colors duration-150 hover:border-[var(--color-violet)] hover:text-[var(--color-ink)]"
                >
                  <Pencil size={11} /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDeleteId(event.id)}
                  className="flex items-center gap-1 rounded-full border border-[var(--color-border)] px-3 py-1 text-xs text-[var(--color-ink-muted)] transition-colors duration-150 hover:border-[var(--color-coral)] hover:text-[var(--color-coral)]"
                >
                  <Trash2 size={11} /> Delete
                </button>
              </div>
            ) : (
              <div className="mt-2.5 flex items-center gap-2">
                <p className="text-xs text-[var(--color-coral)]">
                  Delete{event.attendeeCount > 0 ? ` — ${event.attendeeCount} people RSVP'd` : ""}?
                </p>
                <button
                  type="button"
                  onClick={() => handleDelete(event.id)}
                  className="rounded-full bg-[var(--color-coral)] px-3 py-1 text-xs font-medium text-white hover:brightness-110"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDeleteId(null)}
                  className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        );
      })}

      {editing && (
        <EventModal
          defaultDate={new Date(editing.startAt)}
          submitLabel="Save changes"
          isEditingRecurring={Boolean(editing.recurrenceRule)}
          initialValues={{
            title: editing.title,
            description: editing.description ?? "",
            category: editing.category,
            location: editing.location ?? "",
            isVirtual: editing.isVirtual,
            startAt: toLocalInput(editing.startAt),
            endAt: toLocalInput(editing.endAt),
            timezone: editing.timezone,
            reminderOffsets: editing.reminderOffsets,
          }}
          onClose={() => setEditing(null)}
          onSubmit={handleEditSubmit}
        />
      )}
    </div>
  );
}
