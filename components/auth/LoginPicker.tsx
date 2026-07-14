"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

type Creator = { id: string; name: string; handle: string; image: string | null };

export function LoginPicker({ users }: { users: Creator[] }) {
  const [query, setQuery] = useState("");
  const filtered = users.filter(
    (u) => u.name.toLowerCase().includes(query.toLowerCase()) || u.handle.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-3">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name or handle…"
        className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-muted)] focus:border-[var(--color-violet)]"
      />
      <div className="flex max-h-96 flex-col gap-1 overflow-y-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5">
        {filtered.map((user) => (
          <button
            key={user.id}
            onClick={() => signIn("credentials", { userId: user.id, redirectTo: "/" })}
            className="flex items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-[var(--color-surface-hover)]"
          >
            <div className="h-8 w-8 overflow-hidden rounded-full bg-[var(--color-violet-soft)] ring-1 ring-[var(--color-border)]">
              {user.image && <img src={user.image} alt="" className="h-full w-full object-cover" />}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-[var(--color-ink)]">{user.name}</p>
              <p className="truncate font-mono text-xs text-[var(--color-ink-muted)]">@{user.handle}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
