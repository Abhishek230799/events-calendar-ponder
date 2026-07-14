"use client";

import { useEffect, useMemo, useState } from "react";
import { DayCell } from "./DayCell";
import { CATEGORY_META } from "./categoryStyles";
import { CalendarDays, Eraser } from "lucide-react";
import { AttendeeStack } from "./AttendeeStack";
import { EventModal, buildRecurrenceRule, type EventFormValues } from "./EventModal";
import type { OccurrenceDTO, HolidayDTO, RsvpStatus } from "./types";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type PipelineItemLite = { scheduledFor: string | null };

const RSVP_OPTIONS: { status: RsvpStatus; label: string }[] = [
  { status: "GOING", label: "Going" },
  { status: "INTERESTED", label: "Interested" },
  { status: "DECLINED", label: "Can't make it" },
];

function startOfMonthGrid(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - first.getDay());
  return gridStart;
}

function sameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

export function CalendarView() {
  const [month, setMonth] = useState(() => new Date());
  const [occurrences, setOccurrences] = useState<OccurrenceDTO[]>([]);
  const [holidays, setHolidays] = useState<HolidayDTO[]>([]);
  const [pipelineItems, setPipelineItems] = useState<PipelineItemLite[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [rsvpError, setRsvpError] = useState<string | null>(null);

  const gridDays = useMemo(() => {
    const start = startOfMonthGrid(month);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [month]);

  const rangeStart = gridDays[0];
  const rangeEnd = gridDays[gridDays.length - 1];

  async function refreshOccurrences() {
    const params = new URLSearchParams({ from: rangeStart.toISOString(), to: rangeEnd.toISOString() });
    const data = await fetch(`/api/events?${params}`).then((r) => r.json());
    setOccurrences(data.occurrences ?? []);
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const params = new URLSearchParams({ from: rangeStart.toISOString(), to: rangeEnd.toISOString() });

    Promise.all([
      fetch(`/api/events?${params}`).then((r) => r.json()),
      fetch(`/api/holidays?${params}`).then((r) => r.json()),
      fetch(`/api/pipeline`).then((r) => r.json()),
    ]).then(([eventsData, holidaysData, pipelineData]) => {
      if (cancelled) return;
      setOccurrences(eventsData.occurrences ?? []);
      setHolidays(holidaysData.holidays ?? []);
      setPipelineItems((pipelineData.items ?? []).filter((i: PipelineItemLite) => i.scheduledFor));
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  const occurrencesByDay = (day: Date) =>
    occurrences
      .filter((o) => sameDay(new Date(o.start), day))
      .sort((a, b) => {
        const aCreated = a.event.host ? 0 : 1;
        const bCreated = b.event.host ? 0 : 1;
        if (aCreated !== bCreated) return aCreated - bCreated;
        return new Date(a.start).getTime() - new Date(b.start).getTime();
      });

  const holidayForDay = (day: Date) => holidays.find((h) => sameDay(new Date(h.date), day));
  const pipelineCountForDay = (day: Date) =>
    pipelineItems.filter((i) => i.scheduledFor && sameDay(new Date(i.scheduledFor), day)).length;

  async function handleRsvp(occ: OccurrenceDTO, status: RsvpStatus, visible?: boolean) {
    const targetEventId = occ.event.id;
    const targetOriginalStart = occ.originalStart;
    const previous = occ.event.myRsvp;
    const previousVisible = occ.event.myRsvpVisible;
    const newVisible = visible ?? occ.event.myRsvpVisible;

    const wasGoing = previous === "GOING";
    const willBeGoing = status === "GOING";
    let attendeeDelta = 0;
    let visibleDelta = 0;
    if (wasGoing && !willBeGoing) {
      attendeeDelta = -1;
      if (previousVisible) visibleDelta = -1;
    } else if (!wasGoing && willBeGoing) {
      attendeeDelta = 1;
      if (newVisible) visibleDelta = 1;
    } else if (wasGoing && willBeGoing) {
      if (previousVisible && !newVisible) visibleDelta = -1;
      else if (!previousVisible && newVisible) visibleDelta = 1;
    }

    const applyLocal = (myRsvp: RsvpStatus | null, myRsvpVisible: boolean, dAttendee: number, dVisible: number) => {
      setOccurrences((prev) =>
        prev.map((o) => {
          if (o.event.id !== targetEventId) return o;
          if (o.event.recurrenceRule && o.originalStart !== targetOriginalStart) return o;
          return {
            ...o,
            event: {
              ...o.event,
              myRsvp,
              myRsvpVisible,
              attendeeCount: o.event.attendeeCount + dAttendee,
              visibleAttendeeCount: o.event.visibleAttendeeCount + dVisible,
            },
          };
        })
      );
    };

    applyLocal(status, newVisible, attendeeDelta, visibleDelta);
    setRsvpError(null);

    try {
      const res = await fetch(`/api/events/${occ.event.id}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          visible,
          occurrenceKey: occ.event.recurrenceRule ? occ.originalStart : undefined,
        }),
      });

      if (!res.ok) {
        applyLocal(previous, previousVisible, -attendeeDelta, -visibleDelta);
        const data = await res.json().catch(() => ({}));
        setRsvpError(data.error ?? "Couldn't update your RSVP.");
        return;
      }
    } catch {
      // network failure — optimistic UI already reflects the intended state;
      // next natural refetch (month change, page reload) will reconcile if needed
    }
  }

  async function handleRemoveRsvp(occ: OccurrenceDTO) {
    const targetEventId = occ.event.id;
    const targetOriginalStart = occ.originalStart;
    const previous = occ.event.myRsvp;
    const previousVisible = occ.event.myRsvpVisible;

    // Same delta logic as handleRsvp, just unconditionally subtracting
    // whatever this RSVP was contributing, since the end state is "no RSVP" —
    // not a specific status to weigh against.
    const dAttendee = previous === "GOING" ? -1 : 0;
    const dVisible = previous === "GOING" && previousVisible ? -1 : 0;

    setOccurrences((prev) =>
      prev.map((o) => {
        if (o.event.id !== targetEventId) return o;
        if (o.event.recurrenceRule && o.originalStart !== targetOriginalStart) return o;
        return {
          ...o,
          event: {
            ...o.event,
            myRsvp: null,
            myRsvpVisible: false,
            attendeeCount: o.event.attendeeCount + dAttendee,
            visibleAttendeeCount: o.event.visibleAttendeeCount + dVisible,
          },
        };
      })
    );
    setRsvpError(null);

    try {
      const params = new URLSearchParams();
      if (occ.event.recurrenceRule) params.set("occurrenceKey", occ.originalStart);
      await fetch(`/api/events/${occ.event.id}/rsvp?${params}`, { method: "DELETE" });
    } catch {
      // best-effort rollback isn't attempted here — DELETE is idempotent and
      // safe to have "succeeded" locally even if the network call is still
      // in flight or briefly failed; a stale row left behind just means the
      // next real RSVP action's upsert overwrites it anyway
    }
  }

  async function handleCreate(values: EventFormValues) {
    setCreateError(null);
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: values.title,
        description: values.description,
        category: values.category,
        location: values.location,
        isVirtual: values.isVirtual,
        startAt: new Date(values.startAt).toISOString(),
        endAt: new Date(values.endAt).toISOString(),
        recurrenceRule: buildRecurrenceRule(values),
        timezone: values.timezone,
        reminderOffsets: values.reminderOffsets,
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? "Failed to create event");
    }
    setModalOpen(false);
    refreshOccurrences();
  }

  const selectedOccurrences = selectedDate ? occurrencesByDay(selectedDate) : [];
  const selectedHoliday = selectedDate ? holidayForDay(selectedDate) : undefined;

  return (
    <div className="grid h-full grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
      <div className="flex h-full min-h-0 flex-col gap-3">
        <div className="flex shrink-0 items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-ink-muted)] transition-all duration-150 hover:scale-105 hover:border-[var(--color-violet)] hover:text-[var(--color-ink)] active:scale-95"
            >
              ←
            </button>
            <h2 className="w-44 text-center font-serif text-xl text-[var(--color-ink)]">
              {month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
            </h2>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-ink-muted)] transition-all duration-150 hover:scale-105 hover:border-[var(--color-violet)] hover:text-[var(--color-ink)] active:scale-95"
            >
              →
            </button>
            {loading && <span className="ml-2 font-mono text-[10px] text-[var(--color-ink-muted)]">loading…</span>}
          </div>
          <button
            type="button"
            onClick={() => {
              setCreateError(null);
              setModalOpen(true);
            }}
            className="rounded-full px-3.5 py-1.5 text-xs font-medium text-white transition-all duration-150 hover:scale-105 hover:brightness-110 active:scale-95"
            style={{ background: "linear-gradient(135deg, var(--color-coral), var(--color-violet))" }}
          >
            + New event
          </button>
        </div>

        {createError && (
          <div className="shrink-0 rounded-lg border border-[var(--color-coral)]/30 bg-[var(--color-coral)]/10 px-3 py-2 text-xs text-[var(--color-coral)]">
            {createError}
          </div>
        )}
        {rsvpError && (
          <div className="shrink-0 rounded-lg border border-[var(--color-coral)]/30 bg-[var(--color-coral)]/10 px-3 py-2 text-xs text-[var(--color-coral)]">
            {rsvpError}
          </div>
        )}

        <div className="grid shrink-0 grid-cols-7 gap-1.5">
          {WEEKDAY_LABELS.map((d) => (
            <div key={d} className="pb-1 text-center font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)]">
              {d}
            </div>
          ))}
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-6 gap-1.5">
          {gridDays.map((day) => (
            <DayCell
              key={day.toISOString()}
              date={day}
              isCurrentMonth={day.getMonth() === month.getMonth()}
              isToday={sameDay(day, new Date())}
              isSelected={Boolean(selectedDate && sameDay(day, selectedDate))}
              occurrences={occurrencesByDay(day)}
              holiday={holidayForDay(day)}
              pipelineCount={pipelineCountForDay(day)}
              onSelect={setSelectedDate}
            />
          ))}
        </div>
      </div>

      <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-4 backdrop-blur-sm">
        {!selectedDate && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <span
              className="flex h-12 w-12 items-center justify-center rounded-xl"
              style={{ background: "linear-gradient(135deg, rgba(255,130,114,0.2), rgba(139,127,250,0.25))" }}
            >
              <CalendarDays size={22} className="text-[var(--color-violet)]" />
            </span>
            <p className="text-sm text-[var(--color-ink-muted)]">Click a day to see what's happening.</p>

            {(() => {
              const upcoming = occurrences
                .filter((o) => new Date(o.start) >= new Date())
                .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
                .slice(0, 4);
              if (upcoming.length === 0) return null;
              return (
                <div className="flex w-full flex-col gap-1.5 text-left">
                  <p className="px-1 font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)]">
                    Coming up
                  </p>
                  {upcoming.map((occ, i) => {
                    const meta = CATEGORY_META[occ.event.category];
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setSelectedDate(new Date(occ.start))}
                        className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-2.5 py-2 text-left transition-all duration-150 hover:scale-[1.02] hover:border-[var(--color-violet)]/40 hover:bg-white/[0.03]"
                      >
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: meta.color }} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-[var(--color-ink)]">{occ.event.title}</p>
                          <p className="font-mono text-[10px] text-[var(--color-ink-muted)]">
                            {new Date(occ.start).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}
        {selectedDate && (
          <div key={selectedDate.toISOString()} className="flex animate-[fadeIn_0.18s_ease-out] flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg text-[var(--color-ink)]">
                {selectedDate.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setCreateError(null);
                  setModalOpen(true);
                }}
                className="text-xs text-[var(--color-violet)] hover:underline"
              >
                + Add
              </button>
            </div>

            {selectedHoliday && (
              <div className="rounded-lg border border-[var(--color-amber)]/30 bg-[var(--color-amber)]/10 px-3 py-2">
                <p className="font-mono text-xs text-[var(--color-amber)]">{selectedHoliday.name}</p>
              </div>
            )}

            {selectedOccurrences.length === 0 && (
              <p className="text-sm text-[var(--color-ink-muted)]">Nothing scheduled here yet.</p>
            )}

            {selectedOccurrences.map((occ, i) => {
              const meta = CATEGORY_META[occ.event.category];
              return (
                <div
                  key={i}
                  className="relative rounded-xl border border-[var(--color-border)] p-3 transition-colors duration-150 hover:border-[var(--color-violet)]/40"
                >
                  {occ.event.myRsvp && (
                    <button
                      type="button"
                      onClick={() => handleRemoveRsvp(occ)}
                      title="Remove response"
                      className="absolute right-2.5 top-2.5 flex items-center gap-1 rounded-full px-2 py-1 text-[10px] text-[var(--color-ink-muted)] transition-all duration-150 hover:scale-105 hover:text-[var(--color-coral)]"
                    >
                      <Eraser size={11} />
                      Clear
                    </button>
                  )}
                  <span
                    className="mb-1 inline-block rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-wide"
                    style={{ backgroundColor: meta.tint, color: meta.color }}
                  >
                    {meta.label}
                  </span>
                  <p className="text-sm font-medium text-[var(--color-ink)]">{occ.event.title}</p>
                  <p className="font-mono text-xs text-[var(--color-ink-muted)]">
                    {new Date(occ.start).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                    {occ.event.host ? ` · hosted by @${occ.event.host.handle}` : ""}
                  </p>
                  {occ.event.location && (
                    <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">{occ.event.location}</p>
                  )}

                  <div className="mt-2.5">
                    <AttendeeStack
                      eventId={occ.event.id}
                      totalGoing={occ.event.attendeeCount}
                      myRsvp={occ.event.myRsvp}
                      myRsvpVisible={occ.event.myRsvpVisible}
                    />
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {RSVP_OPTIONS.map((opt) => (
                      <button
                        key={opt.status}
                        type="button"
                        onClick={() => handleRsvp(occ, opt.status, occ.event.myRsvpVisible)}
                        className={`rounded-full border px-2.5 py-1 text-xs transition-all duration-150 hover:scale-105 active:scale-95 ${
                          occ.event.myRsvp === opt.status
                            ? "border-transparent text-white"
                            : "border-[var(--color-border)] text-[var(--color-ink-muted)] hover:border-[var(--color-violet)] hover:text-[var(--color-ink)]"
                        }`}
                        style={
                          occ.event.myRsvp === opt.status
                            ? { background: "linear-gradient(135deg, var(--color-coral), var(--color-violet))" }
                            : undefined
                        }
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {occ.event.myRsvp === "GOING" && (
                    <label className="mt-2 flex items-center gap-1.5 text-xs text-[var(--color-ink-muted)]">
                      <input
                        type="checkbox"
                        checked={occ.event.myRsvpVisible}
                        onChange={(e) => handleRsvp(occ, "GOING", e.target.checked)}
                        className="accent-[var(--color-violet)]"
                      />
                      Show that I&apos;m going
                    </label>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modalOpen && (
        <EventModal
          defaultDate={selectedDate ?? new Date()}
          onClose={() => setModalOpen(false)}
          onSubmit={async (values) => {
            try {
              await handleCreate(values);
            } catch (err) {
              setCreateError(err instanceof Error ? err.message : "Failed to create event");
              throw err;
            }
          }}
        />
      )}
    </div>
  );
}
