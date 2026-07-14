"use client";

import { useState } from "react";
import { CATEGORY_META } from "./categoryStyles";
import type { EventCategory } from "./types";

export type EventFormValues = {
  title: string;
  description: string;
  category: EventCategory;
  location: string;
  isVirtual: boolean;
  startAt: string;
  endAt: string;
  timezone: string;
  repeats: "NONE" | "DAILY" | "WEEKLY" | "MONTHLY";
  repeatUntil: string;
  reminderOffsets: number[];
};

const REMINDER_CHOICES = [
  { label: "At start", minutes: 0 },
  { label: "1 hour before", minutes: 60 },
  { label: "1 day before", minutes: 1440 },
];

const CREATABLE_CATEGORIES: EventCategory[] = [
  "LIVESTREAM",
  "COLLAB",
  "BRAND_MEETING",
  "CONTENT_DEADLINE",
  "COMMUNITY",
  "OTHER",
];

type Props = {
  defaultDate: Date;
  onClose: () => void;
  onSubmit: (values: EventFormValues) => Promise<void>;
  initialValues?: Partial<EventFormValues>;
  submitLabel?: string;
  isEditingRecurring?: boolean; // hides + locks the Repeats section
};

export function EventModal({
  defaultDate,
  onClose,
  onSubmit,
  initialValues,
  submitLabel = "Create event",
  isEditingRecurring = false,
}: Props) {
  const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const [values, setValues] = useState<EventFormValues>({
    title: "",
    description: "",
    category: "OTHER",
    location: "",
    isVirtual: true,
    startAt: toLocalInput(defaultDate),
    endAt: toLocalInput(new Date(defaultDate.getTime() + 60 * 60_000)),
    timezone: localTimezone,
    repeats: "NONE",
    repeatUntil: "",
    reminderOffsets: [60],
    ...initialValues,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.title.trim()) return setError("Give the event a title.");
    if (new Date(values.endAt) <= new Date(values.startAt)) return setError("End time must be after start time.");
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(values);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  function toggleReminder(minutes: number) {
    setValues((v) => ({
      ...v,
      reminderOffsets: v.reminderOffsets.includes(minutes)
        ? v.reminderOffsets.filter((m) => m !== minutes)
        : [...v.reminderOffsets, minutes].sort((a, b) => a - b),
    }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="flex max-h-[90vh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[0_24px_80px_-16px_rgba(0,0,0,0.7)]"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl text-[var(--color-ink)]">{submitLabel === "Create event" ? "New event" : "Edit event"}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-[var(--color-ink-muted)] transition-colors hover:bg-white/5 hover:text-[var(--color-ink)]"
          >
            ✕
          </button>
        </div>

        <label className="flex flex-col gap-1 text-sm text-[var(--color-ink)]">
          Title
          <input
            required
            value={values.title}
            onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
            placeholder="e.g. Q3 brand sync"
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-[var(--color-ink)] outline-none focus:border-[var(--color-violet)]"
          />
        </label>

        <div className="flex flex-col gap-1.5 text-sm text-[var(--color-ink)]">
          Category
          <div className="flex flex-wrap gap-1.5">
            {CREATABLE_CATEGORIES.map((cat) => {
              const meta = CATEGORY_META[cat];
              const active = values.category === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setValues((v) => ({ ...v, category: cat }))}
                  className="rounded-full border px-2.5 py-1 text-xs transition-all duration-150"
                  style={
                    active
                      ? { borderColor: meta.color, background: meta.tint, color: meta.color }
                      : { borderColor: "var(--color-border)", color: "var(--color-ink-muted)" }
                  }
                >
                  {meta.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1 text-sm text-[var(--color-ink)]">
            Starts
            <input
              required
              type="datetime-local"
              value={values.startAt}
              onChange={(e) => setValues((v) => ({ ...v, startAt: e.target.value }))}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-[var(--color-ink)] outline-none focus:border-[var(--color-violet)]"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm text-[var(--color-ink)]">
            Ends
            <input
              required
              type="datetime-local"
              value={values.endAt}
              onChange={(e) => setValues((v) => ({ ...v, endAt: e.target.value }))}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-[var(--color-ink)] outline-none focus:border-[var(--color-violet)]"
            />
          </label>
        </div>
        <p className="-mt-2 font-mono text-[10px] text-[var(--color-ink-muted)]">
          Times shown in your timezone ({localTimezone}) — everyone sees this converted to their own.
        </p>

        <label className="flex flex-col gap-1 text-sm text-[var(--color-ink)]">
          Location / link
          <input
            value={values.location}
            onChange={(e) => setValues((v) => ({ ...v, location: e.target.value }))}
            placeholder="Zoom link, studio address, etc."
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-[var(--color-ink)] outline-none focus:border-[var(--color-violet)]"
          />
        </label>

        {!isEditingRecurring && (
          <div className="flex flex-col gap-1.5 text-sm text-[var(--color-ink)]">
            Repeats
            <div className="flex flex-wrap gap-1.5">
              {(["NONE", "DAILY", "WEEKLY", "MONTHLY"] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setValues((v) => ({ ...v, repeats: opt }))}
                  className={`rounded-full border px-3 py-1 text-xs capitalize transition-all duration-150 ${
                    values.repeats === opt
                      ? "border-[var(--color-violet)] bg-[var(--color-violet-soft)] text-[var(--color-violet)]"
                      : "border-[var(--color-border)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
                  }`}
                >
                  {opt.toLowerCase()}
                </button>
              ))}
            </div>
          </div>
        )}
        {isEditingRecurring && (
          <p className="font-mono text-[10px] text-[var(--color-ink-muted)]">
            This is a recurring event — the repeat schedule itself can&apos;t be edited here yet, only these fields.
          </p>
        )}

        <div className="flex flex-col gap-1.5 text-sm text-[var(--color-ink)]">
          Remind attendees
          <div className="flex flex-wrap gap-1.5">
            {REMINDER_CHOICES.map((choice) => (
              <button
                key={choice.minutes}
                type="button"
                onClick={() => toggleReminder(choice.minutes)}
                className={`rounded-full border px-3 py-1 text-xs transition-all duration-150 ${
                  values.reminderOffsets.includes(choice.minutes)
                    ? "border-[var(--color-mint)] bg-[rgba(63,224,205,0.14)] text-[var(--color-mint)]"
                    : "border-[var(--color-border)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
                }`}
              >
                {choice.label}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-[var(--color-coral)]">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 rounded-full py-2.5 text-sm font-medium text-white transition-all duration-150 hover:brightness-110 disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, var(--color-coral), var(--color-violet))" }}
        >
          {submitting ? "Saving…" : submitLabel}
        </button>
      </form>
    </div>
  );
}

function toLocalInput(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function buildRecurrenceRule(values: EventFormValues): string | null {
  if (values.repeats === "NONE") return null;
  const parts = [`FREQ=${values.repeats}`];
  if (values.repeatUntil) {
    const until = new Date(values.repeatUntil);
    parts.push(`UNTIL=${until.toISOString().replace(/[-:]/g, "").split(".")[0]}Z`);
  }
  return parts.join(";");
}
