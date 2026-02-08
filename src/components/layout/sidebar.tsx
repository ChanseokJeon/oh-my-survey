"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard } from "lucide-react";

const navItems = [
  {
    title: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  // Surveys link removed - Dashboard already shows surveys list
];

export function Sidebar() {
  const pathname = usePathname();

  const version = process.env.NEXT_PUBLIC_APP_VERSION || '0.0.0';
  const sha = process.env.NEXT_PUBLIC_BUILD_SHA || 'local';
  const buildTime = process.env.NEXT_PUBLIC_BUILD_TIME;

  return (
    <div className="flex h-full w-64 flex-col border-r bg-background">
      <div className="flex-1 overflow-auto py-4">
        <nav className="grid items-start px-4 text-sm font-medium">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                pathname === item.href && "bg-muted text-primary"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.title}
            </Link>
          ))}
        </nav>
      </div>
      <div className="border-t px-4 py-3">
        <p
          className="text-xs text-muted-foreground/60"
          title={buildTime ? `Built: ${new Date(buildTime).toLocaleString()}` : undefined}
        >
          v{version}-{sha}
        </p>
      </div>
    </div>
  );
}
