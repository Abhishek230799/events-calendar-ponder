"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { CalendarDays, KanbanSquare, Handshake, ListChecks, LogOut } from "lucide-react";

type ShellUser = { name: string; handle: string; image: string | null };

const NAV_ITEMS = [
  { href: "/calendar", label: "Events Calendar", icon: CalendarDays, tint: "rgba(255,130,114,0.16)", iconColor: "var(--color-coral)" },
  { href: "/created", label: "Created Events", icon: ListChecks, tint: "rgba(255,194,87,0.16)", iconColor: "var(--color-amber)" },
  { href: "/collabs", label: "Collab Requests", icon: Handshake, tint: "rgba(63,224,205,0.16)", iconColor: "var(--color-mint)" },
];

export function AppShell({ user, children }: { user: ShellUser; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  const pathname = usePathname();

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-[var(--color-bg)]">
      {/* Ambient gradient wash — much bolder this pass, two large saturated blobs */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(55rem 45rem at -15% -15%, rgba(255,130,114,0.22), transparent 55%), " +
            "radial-gradient(55rem 45rem at 115% 10%, rgba(139,127,250,0.24), transparent 55%), " +
            "radial-gradient(45rem 40rem at 50% 120%, rgba(63,224,205,0.10), transparent 60%)",
        }}
      />

      <div
        className="relative z-10 flex h-14 shrink-0 items-center gap-3 px-4 backdrop-blur-xl"
        style={{
          background:
            "linear-gradient(90deg, rgba(22,18,30,0.94), rgba(32,22,42,0.94) 45%, rgba(26,22,40,0.94) 100%), " +
            "linear-gradient(90deg, rgba(255,130,114,0.35), rgba(139,127,250,0.4))",
          boxShadow: "0 4px 28px -10px rgba(139,127,250,0.5)",
        }}
      >
        <span
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
          style={{ background: "linear-gradient(90deg, var(--color-coral), var(--color-violet), var(--color-mint))" }}
        />
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
          aria-expanded={open}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--color-ink)] transition-all duration-150 hover:scale-105 hover:bg-white/10 active:scale-95"
        >
          <div className="flex flex-col gap-[3px]">
            <span className={`block h-[2px] w-4 bg-current transition-transform duration-200 ${open ? "translate-y-[5px] rotate-45" : ""}`} />
            <span className={`block h-[2px] w-4 bg-current transition-opacity duration-200 ${open ? "opacity-0" : ""}`} />
            <span className={`block h-[2px] w-4 bg-current transition-transform duration-200 ${open ? "-translate-y-[5px] -rotate-45" : ""}`} />
          </div>
        </button>
        <Image src="/logo.png" alt="Ponders" width={110} height={28} priority className="brightness-125 contrast-110" />
      </div>

      <div className="relative z-10 flex flex-1 overflow-hidden">
        <aside
          className={`relative flex flex-col overflow-hidden bg-[var(--color-surface)]/70 backdrop-blur-md transition-[width] duration-200 ease-out ${
            open ? "w-64" : "w-0"
          }`}
        >
          {/* Signature gradient hairline down the right edge, not a flat border */}
          <div
            className="absolute right-0 top-0 h-full w-px"
            style={{ background: "linear-gradient(180deg, var(--color-coral), var(--color-violet), var(--color-mint))" }}
          />

          <div className="flex flex-col gap-1.5 p-4 pb-2">
            <p className="mb-2 px-2 font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)]">
              Navigate
            </p>
            {NAV_ITEMS.map((item) => {
              const active = pathname?.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group relative flex items-center gap-3 whitespace-nowrap rounded-xl px-2.5 py-2.5 text-sm transition-all duration-150 ${
                    active
                      ? "bg-white/[0.06] font-medium text-[var(--color-ink)] shadow-[inset_0_0_0_1px_rgba(139,127,250,0.35),0_0_28px_-10px_rgba(139,127,250,0.6)]"
                      : "text-[var(--color-ink-muted)] hover:translate-x-1 hover:bg-white/[0.04] hover:text-[var(--color-ink)]"
                  }`}
                >
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-transform duration-150 group-hover:scale-110"
                    style={{ background: item.tint, color: item.iconColor }}
                  >
                    <Icon size={16} strokeWidth={2.25} />
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="flex-1" />

          <div className="p-4 pt-3">
            <div className="mb-3 h-px w-full" style={{ background: "linear-gradient(90deg, transparent, var(--color-border), transparent)" }} />
            <div className="group flex items-center gap-2.5 whitespace-nowrap rounded-xl p-2 transition-colors duration-150 hover:bg-white/[0.05]">
              <div
                className="h-9 w-9 shrink-0 overflow-hidden rounded-full ring-2 ring-transparent transition-all duration-150 group-hover:ring-[var(--color-violet)]"
                style={{ background: "linear-gradient(135deg, var(--color-coral), var(--color-violet))" }}
              >
                {user.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.image} alt="" className="h-full w-full rounded-full object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[var(--color-ink)]">{user.name}</p>
                <p className="truncate font-mono text-xs text-[var(--color-ink-muted)]">@{user.handle}</p>
              </div>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/login" })}
                aria-label="Sign out"
                className="shrink-0 rounded-lg p-1.5 text-[var(--color-ink-muted)] transition-all duration-150 hover:scale-110 hover:bg-[rgba(255,130,114,0.16)] hover:text-[var(--color-coral)]"
              >
                <LogOut size={15} strokeWidth={2} />
              </button>
            </div>
          </div>
        </aside>

        <main className="relative flex-1 overflow-y-auto p-8">{children}</main>
      </div>
    </div>
  );
}
