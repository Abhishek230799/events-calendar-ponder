"use client";

import { useEffect, useState } from "react";
import { Handshake, ArrowUpDown } from "lucide-react";

type Profile = { id: string; name: string; handle: string; image: string | null };
type CollabStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "CANCELLED";
type CollabRequestDTO = {
  id: string;
  message: string | null;
  cancelReason: string | null;
  createdAt: string;
  status: CollabStatus;
  eventTitle: string | null;
  from?: Profile;
  to?: Profile;
};

function relativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const STATUS_META: Record<CollabStatus, { label: string; color: string; tint: string }> = {
  PENDING: { label: "Pending", color: "var(--color-amber)", tint: "rgba(255,194,87,0.15)" },
  ACCEPTED: { label: "Accepted", color: "var(--color-mint)", tint: "rgba(63,224,205,0.15)" },
  DECLINED: { label: "Declined", color: "var(--color-ink-muted)", tint: "rgba(152,145,168,0.12)" },
  CANCELLED: { label: "Cancelled", color: "var(--color-coral)", tint: "rgba(255,130,114,0.12)" },
};

export function CollabRequestsList() {
  const [tab, setTab] = useState<"received" | "sent">("received");
  const [sortNewestFirst, setSortNewestFirst] = useState(true);
  const [received, setReceived] = useState<CollabRequestDTO[] | null>(null);
  const [sent, setSent] = useState<CollabRequestDTO[] | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  function load() {
    fetch("/api/collab-requests")
      .then((r) => r.json())
      .then((data) => {
        setReceived(data.received ?? []);
        setSent(data.sent ?? []);
      });
  }

  useEffect(load, []);

  function updateLocal(id: string, patch: Partial<CollabRequestDTO>) {
    setReceived((prev) => prev?.map((r) => (r.id === id ? { ...r, ...patch } : r)) ?? prev);
    setSent((prev) => prev?.map((r) => (r.id === id ? { ...r, ...patch } : r)) ?? prev);
  }

  async function respond(id: string, status: "ACCEPTED" | "DECLINED") {
    updateLocal(id, { status });
    await fetch(`/api/collab-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  }

  async function confirmCancel() {
    if (!cancellingId) return;
    const id = cancellingId;
    const reason = cancelReason.trim();
    updateLocal(id, { status: "CANCELLED", cancelReason: reason || null });
    setCancellingId(null);
    setCancelReason("");
    await fetch(`/api/collab-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CANCELLED", cancelReason: reason || undefined }),
    });
    load();
  }

  const rawItems = tab === "received" ? received : sent;
  const items = rawItems
    ? [...rawItems].sort((a, b) => {
        const diff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        return sortNewestFirst ? diff : -diff;
      })
    : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex w-fit gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-1">
          {(["received", "sent"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-4 py-1.5 text-xs font-medium capitalize transition-all duration-150 ${
                tab === t ? "text-white" : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
              }`}
              style={tab === t ? { background: "linear-gradient(135deg, var(--color-coral), var(--color-violet))" } : undefined}
            >
              {t}
              {t === "received" && received && received.filter((r) => r.status === "PENDING").length > 0 && (
                <span className="ml-1.5 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px]">
                  {received.filter((r) => r.status === "PENDING").length}
                </span>
              )}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setSortNewestFirst((s) => !s)}
          className="flex items-center gap-1.5 rounded-full border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-ink-muted)] transition-colors duration-150 hover:border-[var(--color-violet)] hover:text-[var(--color-ink)]"
        >
          <ArrowUpDown size={12} />
          {sortNewestFirst ? "Newest first" : "Oldest first"}
        </button>
      </div>

      {items === null && <p className="text-sm text-[var(--color-ink-muted)]">Loading…</p>}

      {items && items.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-16 text-center backdrop-blur-sm">
          <span
            className="flex h-12 w-12 items-center justify-center rounded-xl"
            style={{ background: "linear-gradient(135deg, rgba(255,130,114,0.2), rgba(139,127,250,0.25))" }}
          >
            <Handshake size={22} className="text-[var(--color-violet)]" />
          </span>
          <p className="text-sm text-[var(--color-ink-muted)]">
            {tab === "received" ? "No collab requests yet." : "You haven't sent any collab requests yet."}
          </p>
          {tab === "sent" && (
            <p className="max-w-xs text-xs text-[var(--color-ink-muted)]">
              Hover or tap a creator's avatar on any event's attendee list to send one.
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2">
        {items?.map((req) => {
          const profile = tab === "received" ? req.from : req.to;
          if (!profile) return null;
          const statusMeta = STATUS_META[req.status] ?? STATUS_META.PENDING;
          const canRespond = tab === "received" && req.status === "PENDING";
          const canCancel = req.status === "PENDING" || req.status === "ACCEPTED";

          return (
            <div
              key={req.id}
              className="flex items-start gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/50 p-3 transition-colors duration-150 hover:bg-[var(--color-surface-hover)]"
            >
              <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full ring-1 ring-[var(--color-border)]">
                {profile.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.image} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center bg-[var(--color-violet-soft)] font-mono text-[10px] text-[var(--color-violet)]">
                    {profile.name.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium text-[var(--color-ink)]">
                    {tab === "received" ? profile.name : `To ${profile.name}`}
                  </p>
                  <span className="shrink-0 font-mono text-[10px] text-[var(--color-ink-muted)]">
                    {relativeTime(req.createdAt)}
                  </span>
                </div>
                <p className="font-mono text-xs text-[var(--color-ink-muted)]">@{profile.handle}</p>
                {req.message && <p className="mt-1 text-sm text-[var(--color-ink)]">{req.message}</p>}
                {req.eventTitle && (
                  <p className="mt-1 font-mono text-[10px] text-[var(--color-violet)]">via {req.eventTitle}</p>
                )}
                {req.status === "CANCELLED" && req.cancelReason && (
                  <p className="mt-1.5 rounded-lg bg-[rgba(255,130,114,0.08)] px-2 py-1.5 text-xs text-[var(--color-coral)]">
                    Cancelled: {req.cancelReason}
                  </p>
                )}

                {cancellingId === req.id ? (
                  <div className="mt-2.5 flex flex-col gap-1.5">
                    <input
                      autoFocus
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      placeholder="Reason (optional)…"
                      maxLength={140}
                      className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-1.5 text-xs text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-muted)] focus:border-[var(--color-coral)]"
                    />
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setCancellingId(null);
                          setCancelReason("");
                        }}
                        className="flex-1 rounded-full border border-[var(--color-border)] py-1 text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={confirmCancel}
                        className="flex-1 rounded-full bg-[var(--color-coral)] py-1 text-xs font-medium text-white hover:brightness-110"
                      >
                        Confirm cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    {canRespond && (
                      <>
                        <button
                          type="button"
                          onClick={() => respond(req.id, "ACCEPTED")}
                          className="rounded-full px-3 py-1 text-xs font-medium text-white transition-all duration-150 hover:brightness-110"
                          style={{ background: "linear-gradient(135deg, var(--color-mint), var(--color-sky))" }}
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          onClick={() => respond(req.id, "DECLINED")}
                          className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs text-[var(--color-ink-muted)] transition-colors duration-150 hover:border-[var(--color-coral)] hover:text-[var(--color-coral)]"
                        >
                          Decline
                        </button>
                      </>
                    )}
                    {canCancel && (
                      <button
                        type="button"
                        onClick={() => {
                          setCancellingId(req.id);
                          setCancelReason("");
                        }}
                        className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs text-[var(--color-ink-muted)] transition-colors duration-150 hover:border-[var(--color-coral)] hover:text-[var(--color-coral)]"
                      >
                        Cancel
                      </button>
                    )}
                    {!canRespond && !canCancel && (
                      <span
                        className="inline-block rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-wide"
                        style={{ backgroundColor: statusMeta.tint, color: statusMeta.color }}
                      >
                        {statusMeta.label}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
