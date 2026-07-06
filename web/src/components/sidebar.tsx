"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/logo";
import { cn, initials } from "@/lib/utils";

type NavItem = { href: string; label: string; ready?: boolean };
type NavGroup = { title?: string; items: NavItem[] };

const NAV: NavGroup[] = [
  { items: [{ href: "/dashboard", label: "Dashboard", ready: true }] },
  {
    title: "People",
    items: [
      { href: "/employees", label: "Employees", ready: true },
      { href: "/attendance", label: "Attendance", ready: true },
      { href: "/leave", label: "WFH & Leave", ready: true },
      { href: "/payroll", label: "Payroll", ready: true },
    ],
  },
  {
    title: "Business",
    items: [
      { href: "/tasks", label: "Task Log", ready: true },
      { href: "/clients", label: "Clients", ready: true },
      { href: "/projects", label: "Projects", ready: true },
      { href: "/quotes", label: "Quotes", ready: true },
      { href: "/invoices", label: "Invoices", ready: true },
    ],
  },
];

export function Sidebar({ orgName, email, role }: { orgName: string; email: string; role: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex h-screen w-64 flex-shrink-0 flex-col bg-[#0d1117] text-white">
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white">
          <Logo size={22} />
        </span>
        <span className="truncate text-[15px] font-bold">{orgName}</span>
      </div>

      <nav className="flex-1 overflow-y-auto py-3">
        {NAV.map((group, gi) => (
          <div key={gi} className="mb-2">
            {group.title && (
              <div className="px-5 pb-1 pt-3 text-[10px] font-bold uppercase tracking-wider text-white/40">
                {group.title}
              </div>
            )}
            {group.items.map((item) => {
              const active = pathname === item.href;
              if (!item.ready) {
                return (
                  <span
                    key={item.href}
                    className="mx-3 flex cursor-not-allowed items-center justify-between rounded-lg px-3 py-2 text-sm text-white/35"
                    title="Coming soon"
                  >
                    {item.label}
                    <span className="text-[10px] font-semibold uppercase text-white/25">Soon</span>
                  </span>
                );
              }
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "mx-3 flex items-center rounded-lg border-l-[3px] border-transparent px-3 py-2 text-sm font-medium text-white/75 transition hover:bg-white/5 hover:text-white",
                    active && "border-brand bg-white/5 font-semibold text-white",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 bg-black/20 px-4 py-3">
        <div className="mb-2 flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#24406e] text-sm font-bold">
            {initials(email)}
          </span>
          <div className="min-w-0">
            <div className="truncate text-xs font-semibold text-white/90">{email}</div>
            <div className="text-[11px] text-white/50">{role}</div>
          </div>
        </div>
        <button
          onClick={signOut}
          className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-brand hover:bg-white/5"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
