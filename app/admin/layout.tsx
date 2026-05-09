"use client";
// Client component: needs localStorage for the role check and usePathname() for active-link highlighting.

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  LayoutDashboard,
  Award,
  FileText,
  Settings,
  LogOut,
} from "lucide-react";

interface StoredUser {
  id: string;
  email: string;
  full_name: string;
  role: "applicant" | "admin";
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { href: "/admin",              label: "Dashboard",    icon: LayoutDashboard },
  { href: "/admin/grant-rounds", label: "Grant Rounds", icon: Award },
  { href: "/admin/applications", label: "Applications", icon: FileText },
  { href: "/admin/settings",     label: "Settings",     icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<StoredUser | null>(null);

  const router = useRouter();
  const pathname = usePathname();

  // Auth guard: verify a valid admin session on mount and on route change.
  useEffect(() => {
    const raw = localStorage.getItem("grantly_user");

    if (!raw) {
      router.replace("/login");
      return;
    }

    try {
      const parsed = JSON.parse(raw) as StoredUser;

      if (parsed.role !== "admin") {
        // Logged-in applicants get sent to their portal rather than blocked outright.
        router.replace("/apply");
        return;
      }

      setUser(parsed);
    } catch {
      // Corrupt session — clear both keys so a fresh login starts clean.
      localStorage.removeItem("grantly_user");
      localStorage.removeItem("grantly_token");
      router.replace("/login");
    }
  }, [router, pathname]);

  function handleSignOut() {
    localStorage.removeItem("grantly_token");
    localStorage.removeItem("grantly_user");
    router.push("/login");
  }

  if (!user) return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="w-8 h-8 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* ── Sidebar ──────────────────────────────────────────────────── */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">

        {/* ── Logo / brand ──────────────────────────────────────────── */}
        <div className="h-16 flex items-center px-5 border-b border-gray-100 gap-2">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center">
              <Image src={'/grantly-logo.png'} width={100} height={100} alt="Grantly Logo"></Image>
            </div>
            <span className="text-lg font-semibold text-gray-900">Grantly</span>
          </Link>
          <span className="ml-auto text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
            Admin
          </span>
        </div>

        {/* ── Navigation links ───────────────────────────────────────── */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon }) => {
            // /admin matches exactly so it doesn't light up on every sub-page;
            // other links use startsWith so nested routes still highlight the parent.
            const isActive =
              href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(href);

            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <Icon
                  className={`w-5 h-5 flex-shrink-0 ${
                    isActive ? "text-blue-600" : "text-gray-400"
                  }`}
                />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* ── Sidebar footer — user info + sign out ─────────────────── */}
        <div className="border-t border-gray-100 p-4">
          <div className="flex items-center gap-3 px-1">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <span className="text-blue-700 text-sm font-semibold">
                {user.full_name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">{user.full_name}</p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
            <button
              onClick={handleSignOut}
              aria-label="Sign out"
              title="Sign out"
              className="flex-shrink-0 p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main content area ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* ── Top bar ─────────────────────────────────────────────────── */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
          <p className="text-sm text-gray-500">
            Good {getTimeOfDay()},{" "}
            <span className="font-semibold text-gray-900">
              {user.full_name.split(" ")[0]}
            </span>
          </p>
          <p className="text-xs text-gray-400">
            {new Date().toLocaleDateString("en-AU", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </header>

        {/* ── Scrollable page content ──────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto flex flex-col">
          <div className="flex-1 p-6">
            {children}
          </div>
        </main>

      </div>
    </div>
  );
}

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}
