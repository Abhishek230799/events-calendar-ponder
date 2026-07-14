import { RRule } from "rrule";
import type { Event } from "@prisma/client";

export type Occurrence = {
  eventId: string;
  start: Date;
  end: Date;
  originalStart: Date; // stable key for RSVP/reminders even if a future exception moves this occurrence
};

/**
 * Expands an event into concrete occurrences within [rangeStart, rangeEnd].
 * Recurring events are expanded on-the-fly here, never materialized as rows —
 * that keeps storage O(events) instead of O(events x occurrences), which is
 * the right tradeoff at calendar-range-query scale.
 */
export function expandOccurrences(event: Event, rangeStart: Date, rangeEnd: Date): Occurrence[] {
  const durationMs = event.endAt.getTime() - event.startAt.getTime();

  if (!event.recurrenceRule) {
    if (event.startAt >= rangeStart && event.startAt <= rangeEnd) {
      return [{ eventId: event.id, start: event.startAt, end: event.endAt, originalStart: event.startAt }];
    }
    return [];
  }

  const rule = RRule.fromString(`DTSTART:${toICalUTC(event.startAt)}\n${event.recurrenceRule}`);
  const starts = rule.between(rangeStart, rangeEnd, true);

  return starts.map((start) => ({
    eventId: event.id,
    start,
    end: new Date(start.getTime() + durationMs),
    originalStart: start,
  }));
}

function toICalUTC(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

/** Validates an RRULE string up front so bad input never reaches the DB. */
export function validateRecurrenceRule(rule: string): { valid: boolean; error?: string } {
  try {
    RRule.fromString(`DTSTART:${toICalUTC(new Date())}\n${rule}`);
    return { valid: true };
  } catch (err) {
    return { valid: false, error: (err as Error).message };
  }
}
