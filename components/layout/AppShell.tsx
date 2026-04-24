import Link from "next/link";
import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f7f4ee] text-slate-950">
      <header className="no-print border-b border-black/10 bg-[#142836] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-4">
          <Link href="/create" className="grid gap-0.5">
            <span className="text-sm font-semibold uppercase tracking-wide text-cyan-200">WCEPS</span>
            <span className="text-lg font-semibold">Branding Tool</span>
          </Link>
          <nav className="flex items-center gap-2 text-sm">
            <Link className="rounded-full px-3 py-2 text-white/85 hover:bg-white/10 hover:text-white" href="/create#examples">
              Examples
            </Link>
            <Link className="rounded-full bg-[#3EB3BD] px-4 py-2 font-semibold text-[#142836]" href="/create">
              Create artifact
            </Link>
          </nav>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
