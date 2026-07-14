"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { ProfileCardAvatar } from "./ProfileCardAvatar";

type Profile = { id: string; name: string; handle: string; image: string | null };

export function AttendeeStack({
  eventId,
  totalGoing,
  myRsvp,
  myRsvpVisible,
}: {
  eventId: string;
  totalGoing: number;
  myRsvp: string | null;
  myRsvpVisible: boolean;
}) {
  const { data: session } = useSession();
  const [fetched, setFetched] = useState<Profile[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/events/${eventId}/attendees`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setFetched(data.visibleAttendees ?? []);
      });
    return () => {
      cancelled = true;
    };
    // Only the eventId should trigger a real refetch — visibility toggles for
    // *your own* RSVP are merged in locally below instead, since we already
    // know the answer without asking the server.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const me: Profile | null =
    session?.user?.id && session.user.handle
      ? { id: session.user.id, name: session.user.name ?? "You", handle: session.user.handle, image: session.user.image ?? null }
      : null;

  const iAmVisible = myRsvp === "GOING" && myRsvpVisible;
  const baseList = (fetched ?? []).filter((p) => p.id !== me?.id); // avoid double-listing once the real fetch catches up
  const merged = iAmVisible && me ? [me, ...baseList] : baseList;

  const shown = merged.slice(0, 5);
  const knownVisibleCount = fetched ? merged.length : null;
  const privateCount = knownVisibleCount !== null ? totalGoing - knownVisibleCount : null;

  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {shown.map((profile) => (
          <ProfileCardAvatar key={profile.id} profile={profile} eventId={eventId} />
        ))}
      </div>
      <p className="font-mono text-[10px] text-[var(--color-ink-muted)]">
        {totalGoing} going{knownVisibleCount !== null ? ` · ${knownVisibleCount} visible` : ""}
        {privateCount && privateCount > 0 ? ` · ${privateCount} private` : ""}
      </p>
    </div>
  );
}
