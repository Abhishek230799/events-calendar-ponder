import { db } from "@/lib/db";
import { LoginPicker } from "@/components/auth/LoginPicker";

export default async function LoginPage() {
  const users = await db.user.findMany({
    select: { id: true, name: true, handle: true, image: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] p-6">
      <div className="w-full max-w-md">
        <h1 className="mb-1 font-serif text-2xl text-[var(--color-ink)]">Sign in to Ponder</h1>
        <p className="mb-4 text-sm text-[var(--color-ink-muted)]">
          Demo login — pick who you are. No password: this stands in for real platform auth, which the rest of the
          app never touches directly.
        </p>
        <LoginPicker users={users} />
      </div>
    </div>
  );
}
