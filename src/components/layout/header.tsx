"use client";

import Link from "next/link";
import { UserNav } from "./user-nav";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center">
        {/* Left zone: matches Sidebar width (w-64 = 256px) */}
        <div className="flex w-64 shrink-0 items-center px-4">
          <Link href="/" className="flex items-center space-x-2">
            <span className="font-bold">Oh My Survey</span>
          </Link>
        </div>
        {/* Right zone: matches Main area */}
        <div className="flex flex-1 items-center justify-end px-6">
          <UserNav />
        </div>
      </div>
    </header>
  );
}
