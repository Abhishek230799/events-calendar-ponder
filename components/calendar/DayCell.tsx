"use client";

import { useState } from "react";
import { CATEGORY_META } from "./categoryStyles";
import type { OccurrenceDTO, HolidayDTO } from "./types";

type Props = {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  occurrences: OccurrenceDTO[]; // expected pre-sorted: user-created (PLATFORM) first, then by time
  holiday?: HolidayDTO;
  pipelineCount?: number;
  onSelect: (date: Date) => void;
};

const MAX_DOTS = 5;

export function DayCell({ date, isCurrentMonth, isToday, isSelected, occurrences, holiday, pipelineCount = 0, onSelect }: Props) {
  const [hovered, setHovered] = useState(false);
  const shown = occurrences.slice(0, MAX_DOTS);
  const overflow = occurrences.length - shown.length;

  // Since occurrences arrive pre-sorted user-created-first, the top slot (if
  // it has a host) is what gets featured as the on-cell label.
  const featured = occurrences[0]?.event.host ? occurrences[0] : undefined;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => onSelect(date)}
        className={`group relative flex h-full w-full flex-col items-start gap-1.5 rounded-xl border p-2 text-left transition-all duration-150 active:scale-[0.97] ${
          isSelected
            ? "border-[var(--color-violet)] bg-[var(--color-violet-soft)] shadow-[0_0_20px_-8px_rgba(139,127,250,0.6)]"
            : "border-[var(--color-border)] hover:border-[var(--color-violet)]/40 hover:bg-white/[0.03]"
        } ${!isCurrentMonth ? "opacity-35" : ""}`}
      >
        <div className="flex w-full items-center justify-between">
          <span
            className={`font-mono text-xs ${
              isToday
                ? "flex h-5 w-5 items-center justify-center rounded-full text-white"
                : "text-[var(--color-ink-muted)]"
            }`}
            style={isToday ? { background: "linear-gradient(135deg, var(--color-coral), var(--color-violet))" } : undefined}
          >
            {date.getDate()}
          </span>
          {holiday && (
            <span
              title={holiday.name}
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: "var(--color-amber)" }}
            />
          )}
        </div>

        {holiday && (
          <p className="line-clamp-1 font-mono text-[9px] uppercase tracking-wide text-[var(--color-amber)]/80">
            {holiday.name}
          </p>
        )}

        {featured && (
          <span
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className="line-clamp-1 text-[10px] font-medium text-[var(--color-ink)]"
          >
            {featured.event.title}
          </span>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-1">
          {shown.map((occ, i) => (
            <span
              key={i}
              title={occ.event.title}
              className="h-1.5 w-1.5 rounded-full transition-transform duration-150 group-hover:scale-125"
              style={{ backgroundColor: CATEGORY_META[occ.event.category].color }}
            />
          ))}
          {overflow > 0 && <span className="font-mono text-[9px] text-[var(--color-ink-muted)]">+{overflow}</span>}
          {pipelineCount > 0 && (
            <span
              title={`${pipelineCount} of your posts scheduled`}
              className="h-1.5 w-1.5 rounded-[2px] border border-[var(--color-mint)]"
            />
          )}
        </div>
      </button>

      {featured && hovered && (
        <div className="absolute left-0 top-full z-20 mt-1 w-56 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.6)] backdrop-blur-md">
          <span
            className="mb-1 inline-block rounded-full px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wide"
            style={{
              backgroundColor: CATEGORY_META[featured.event.category].tint,
              color: CATEGORY_META[featured.event.category].color,
            }}
          >
            {CATEGORY_META[featured.event.category].label}
          </span>
          <p className="text-xs font-medium text-[var(--color-ink)]">{featured.event.title}</p>
          <p className="font-mono text-[10px] text-[var(--color-ink-muted)]">
            {new Date(featured.start).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
            {featured.event.host ? ` · @${featured.event.host.handle}` : ""}
          </p>
          {featured.event.location && (
            <p className="mt-0.5 text-[10px] text-[var(--color-ink-muted)]">{featured.event.location}</p>
          )}
        </div>
      )}
    </div>
  );
}
