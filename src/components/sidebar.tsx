"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Sparkles,
  FolderOpen,
  Palette,
  BarChart3,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "대시보드", icon: LayoutDashboard, exact: true },
  { href: "/new/topic", label: "새 카드뉴스", icon: Sparkles, accent: true },
  { href: "/projects", label: "프로젝트", icon: FolderOpen },
  { href: "/brands", label: "브랜드", icon: Palette },
  { href: "/usage", label: "사용량", icon: BarChart3 },
  { href: "/settings", label: "설정", icon: Settings },
];

export function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-screen w-60 flex-shrink-0 flex-col border-r border-border bg-bg-surface">
      <div className="px-5 py-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent/15">
            <Sparkles className="h-4 w-4 text-accent" />
          </div>
          <span className="text-sm font-semibold">카드뉴스 메이커</span>
        </Link>
      </div>

      <nav className="flex-1 space-y-0.5 px-3">
        {NAV.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-bg-elevated text-text-primary"
                  : "text-text-secondary hover:bg-bg-elevated hover:text-text-primary",
                item.accent &&
                  !isActive &&
                  "text-accent hover:text-accent-hover"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        <div className="mb-2 px-3 py-1 text-xs text-text-muted truncate" title={userEmail}>
          {userEmail}
        </div>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary"
          >
            <LogOut className="h-4 w-4" />
            <span>로그아웃</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
