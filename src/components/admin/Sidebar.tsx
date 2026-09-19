"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  icon: string;
  exact?: boolean;
  soon?: boolean;
};

const NAV: NavItem[] = [
  { href: "/admin", label: "Overview", icon: "◈", exact: true },
  { href: "/admin/members", label: "Members", icon: "◐" },
  { href: "/admin/coupons", label: "Coupons", icon: "✦" },
  { href: "/admin/membership-types", label: "Membership Types", icon: "❖" },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(item.href + "/");
        if (item.soon) {
          return (
            <span
              key={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm cursor-not-allowed"
              style={{ color: "var(--color-faint)" }}
              title="Coming in Phase 2"
            >
              <span className="w-5 text-center opacity-60">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              <span className="chip chip-muted" style={{ height: 20, fontSize: "0.6rem" }}>
                soon
              </span>
            </span>
          );
        }
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors"
            style={
              active
                ? {
                    background: "var(--color-gold-soft)",
                    color: "var(--color-gold-bright)",
                    border: "1px solid color-mix(in srgb, var(--color-gold) 30%, transparent)",
                  }
                : { color: "var(--color-muted)", border: "1px solid transparent" }
            }
          >
            <span className="w-5 text-center">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
