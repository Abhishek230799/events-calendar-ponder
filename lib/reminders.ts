import { db } from "./db";
import { expandOccurrences } from "./recurrence";

const MAX_LOOKAHEAD_MINUTES = 60 * 24 * 14; // don't scan further ahead than 2 weeks worth of offsets

/**
 * Called by the cron route every 5 minutes. For each event with reminders
 * configured, expands occurrences far enough ahead to cover its largest
 * offset, and checks whether (occurrence.start - offsetMinutes) fell inside
 * the window that just elapsed since the last run. Dedup is enforced by the
 * unique constraint on Notification(eventId, userId, occurrenceStart,
 * offsetMinutes) — safe even if the cron overlaps or retries.
 */
export async function scanAndCreateReminders(windowMinutes = 5) {
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowMinutes * 60_000);

  const events = await db.event.findMany({
    where: {
      reminderOffsets: { isEmpty: false },
      OR: [{ recurrenceRule: null, startAt: { gte: now } }, { recurrenceRule: { not: null } }],
    },
    include: { rsvps: { where: { status: "GOING" } } },
  });

  let created = 0;

  for (const event of events) {
    if (event.rsvps.length === 0) continue; // nobody to remind

    const maxOffset = Math.max(...event.reminderOffsets);
    const scanEnd = new Date(
      Math.min(now.getTime() + maxOffset * 60_000, now.getTime() + MAX_LOOKAHEAD_MINUTES * 60_000)
    );

    const occurrences = expandOccurrences(event, now, scanEnd);

    for (const occ of occurrences) {
      for (const offsetMinutes of event.reminderOffsets) {
        const fireAt = new Date(occ.start.getTime() - offsetMinutes * 60_000);
        const dueNow = fireAt > windowStart && fireAt <= now;
        if (!dueNow) continue;

        for (const rsvp of event.rsvps) {
          try {
            await db.notification.create({
              data: {
                eventId: event.id,
                userId: rsvp.userId,
                occurrenceStart: occ.originalStart,
                offsetMinutes,
              },
            });
            created++;
          } catch (err: any) {
            if (err?.code !== "P2002") throw err; // P2002 = unique constraint = already sent, ignore
          }
        }
      }
    }
  }

  return { scannedEvents: events.length, notificationsCreated: created };
}
