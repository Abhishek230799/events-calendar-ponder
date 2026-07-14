"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSession } from "next-auth/react";
import { useHoverOrTap } from "@/hooks/useHoverOrTap";

type Profile = { id: string; name: string; handle: string; image: string | null };

export function ProfileCardAvatar({ profile, eventId }: { profile: Profile; eventId?: string }) {
  const { data: session } = useSession();
  const isSelf = session?.user?.id === profile.id;

  const { open, setOpen, containerRef, popoverRef, triggerProps, popoverHoverProps } = useHoverOrTap<HTMLDivElement, HTMLDivElement>();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [composing, setComposing] = useState(false);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  function openAt() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) setCoords({ top: rect.bottom + 8, left: rect.left + rect.width / 2 });
  }

  async function sendCollabRequest() {
    setSending(true);
    try {
      const res = await fetch("/api/collab-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toId: profile.id, eventId, message: message.trim() || undefined }),
      });
      if (res.ok) setSent(true);
    } finally {
      setSending(false);
    }
  }

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        ref={triggerRef}
        type="button"
        {...triggerProps}
        onMouseEnter={() => {
          openAt();
          triggerProps.onMouseEnter();
        }}
        onClick={(e) => {
          openAt();
          triggerProps.onClick(e);
        }}
        aria-label={isSelf ? "You" : `View ${profile.name}'s profile`}
        className="h-7 w-7 shrink-0 overflow-hidden rounded-full ring-2 ring-[var(--color-surface)] transition-transform duration-150 hover:scale-110 hover:z-10"
      >
        {profile.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.image} alt={profile.name} className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center bg-[var(--color-violet-soft)] font-mono text-[10px] text-[var(--color-violet)]">
            {profile.name.slice(0, 2).toUpperCase()}
          </span>
        )}
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="dialog"
            ref={popoverRef}
            {...popoverHoverProps}
            style={{ position: "fixed", top: coords.top, left: coords.left, transform: "translateX(-50%)" }}
            className="z-[100] w-64 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.6)] backdrop-blur-md"
          >
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 overflow-hidden rounded-full bg-[var(--color-violet-soft)]">
                {profile.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.image} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center font-mono text-xs text-[var(--color-violet)]">
                    {profile.name.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[var(--color-ink)]">
                  {profile.name}
                  {isSelf && <span className="ml-1.5 text-[var(--color-ink-muted)]">(you)</span>}
                </p>
                <p className="truncate font-mono text-xs text-[var(--color-ink-muted)]">@{profile.handle}</p>
              </div>
            </div>

            {!isSelf && !composing && !sent && (
              <button
                type="button"
                onClick={() => setComposing(true)}
                className="mt-3 w-full rounded-full py-1.5 text-xs font-medium text-white transition-all duration-150 hover:brightness-110"
                style={{ background: "linear-gradient(135deg, var(--color-coral), var(--color-violet))" }}
              >
                Send collab request
              </button>
            )}

            {!isSelf && composing && !sent && (
              <div className="mt-3 flex flex-col gap-2">
                <textarea
                  autoFocus
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={`Say something to @${profile.handle}… (optional)`}
                  rows={3}
                  maxLength={280}
                  className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-2 text-xs text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-muted)] focus:border-[var(--color-violet)]"
                />
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setComposing(false)}
                    className="flex-1 rounded-full border border-[var(--color-border)] py-1.5 text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={sending}
                    onClick={sendCollabRequest}
                    className="flex-1 rounded-full py-1.5 text-xs font-medium text-white transition-all duration-150 hover:brightness-110 disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg, var(--color-coral), var(--color-violet))" }}
                  >
                    {sending ? "Sending…" : "Send"}
                  </button>
                </div>
              </div>
            )}

            {!isSelf && sent && (
              <p className="mt-3 rounded-full bg-[rgba(63,224,205,0.15)] py-1.5 text-center text-xs font-medium text-[var(--color-mint)]">
                Request sent ✓
              </p>
            )}

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-1.5 w-full text-center text-[10px] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
            >
              Close
            </button>
          </div>,
          document.body
        )}
    </div>
  );
}
