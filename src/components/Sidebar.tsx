"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/stats", label: "Stats", icon: "📊" },
  { href: "/awaiting-cim", label: "Awaiting CIM", icon: "📋" },
  { href: "/cim-received", label: "CIM Received", icon: "📄" },
  { href: "/loi-sent", label: "LOI Sent", icon: "✉️" },
  { href: "/brokers", label: "Broker Tracker", icon: "🤝" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 bg-zinc-900 text-zinc-300 flex flex-col h-screen sticky top-0">
      <div className="px-5 py-6 border-b border-zinc-800">
        <h1 className="text-lg font-semibold text-white tracking-tight">
          Holter Holdings
        </h1>
        <p className="text-xs text-zinc-500 mt-0.5">Deal Pipeline</p>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                active
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-5 py-4 border-t border-zinc-800">
        <p className="text-[11px] text-zinc-600">On-Market CRM</p>
      </div>
    </aside>
  );
}
