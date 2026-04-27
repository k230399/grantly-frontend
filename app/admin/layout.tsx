"use client";
// This file needs "use client" because it reads from localStorage (a browser API)
// to verify the logged-in user's role, and uses usePathname() to highlight
// the active nav item as the admin moves between pages.

// Admin layout — wraps every page inside /admin with a persistent sidebar and top bar.
// Acts as an auth guard: if there is no session, or the user's role is not "admin",
// they are redirected away before any admin content is rendered.

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

// The shape of the user object saved in localStorage under "grantly_user" after login
interface StoredUser {
  id: string;
  email: string;       // the admin's email address — shown in the sidebar footer
  full_name: string;   // the admin's display name — shown in the sidebar footer and greeting
  role: "applicant" | "admin"; // must be "admin" to pass the guard below
}

// Describes one item in the sidebar navigation list
interface NavItem {
  href: string;    // the URL this link navigates to
  label: string;   // the visible text label next to the icon
  icon: React.ComponentType<{ className?: string }>; // Lucide icon component
}

// The sidebar nav links, ordered from most- to least-used
const navItems: NavItem[] = [
  { href: "/admin",              label: "Dashboard",    icon: LayoutDashboard },
  { href: "/admin/grant-rounds", label: "Grant Rounds", icon: Award },
  { href: "/admin/applications", label: "Applications", icon: FileText },
  { href: "/admin/settings",     label: "Settings",     icon: Settings },
];

// Admin layout: renders the two-panel shell (sidebar + main area) around all /admin pages
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<StoredUser | null>(null);

  const router = useRouter();
  // usePathname() returns the current URL path (e.g. "/admin/applications")
  // so we can highlight the matching sidebar link as active.
  const pathname = usePathname();

  // On mount, read localStorage and verify that a valid admin session exists.
  // Any failure (no session, wrong role, corrupt data) triggers a redirect.
  useEffect(() => {
    const raw = localStorage.getItem("grantly_user");

    if (!raw) {
      // No session found at all — send to sign-in
      router.replace("/login");
      return;
    }

    try {
      const parsed = JSON.parse(raw) as StoredUser;

      if (parsed.role !== "admin") {
        // The user is logged in but is an applicant, not an admin.
        // Send them to the applicant portal instead of blocking them entirely.
        router.replace("/apply");
        return;
      }

      // All checks passed — store the user so we can render the sidebar
      setUser(parsed);
    } catch {
      // localStorage data was corrupted — clear it and send to sign-in
      localStorage.removeItem("grantly_user");
      localStorage.removeItem("grantly_token");
      router.replace("/login");
    }
  }, [router, pathname]);

  // Signs the admin out by clearing their session from localStorage, then redirects to sign-in
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
    // Full-height, full-width shell split into sidebar (left) and main area (right)
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* ── Sidebar ────────────────────────────────────────────────────
          Fixed-width panel on the left containing the logo, nav links,
          and the signed-in admin's info at the bottom.
          flex-shrink-0 prevents it from squishing on smaller viewports. */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">

        {/* ── Logo / brand ────────────────────────────────────────────
            Links back to the admin dashboard home.
            The "Admin" pill makes it visually clear this is the admin surface. */}
        <div className="h-16 flex items-center px-5 border-b border-gray-100 gap-2">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center">
              <Image src={'/grantly-logo.png'} width={100} height={100} alt="Grantly Logo"></Image>
            </div>
            <span className="text-lg font-semibold text-gray-900">Grantly</span>
          </Link>
          {/* Small badge clarifying this is the admin area, not the applicant portal */}
          <span className="ml-auto text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
            Admin
          </span>
        </div>

        {/* ── Navigation links ─────────────────────────────────────────
            Maps over navItems to render each link.
            The active link gets a blue highlight; all others are neutral. */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon }) => {
            // Determine whether this link matches the current page.
            // /admin (root) is matched exactly to avoid it lighting up on every sub-page.
            // All other links use startsWith so nested routes (e.g. /admin/applications/123)
            // still highlight the parent nav item.
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
                    ? "bg-blue-50 text-blue-700"                           // active: blue fill + blue text
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900" // default: grey hover
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

        {/* ── Sidebar footer — user info + sign out ───────────────────
            Pinned to the bottom of the sidebar.
            Shows the admin's name, email, and a sign-out button.    */}
        <div className="border-t border-gray-100 p-4">

          {/* User info row — avatar initial + name + email */}
          <div className="flex items-center gap-3 mb-3 px-1">
            {/* Avatar: a coloured circle with the first letter of the admin's name */}
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <span className="text-blue-700 text-sm font-semibold">
                {user.full_name.charAt(0).toUpperCase()}
              </span>
            </div>
            {/* Name and email — both truncated if longer than the sidebar width */}
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user.full_name}</p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
          </div>

          {/* Sign out button — red hover makes the destructive action obvious */}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>

        </div>
      </aside>

      {/* ── Main content area ──────────────────────────────────────────
          Takes up all remaining width to the right of the sidebar.
          The top bar is fixed in place; the page content scrolls below it. */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* ── Top bar ───────────────────────────────────────────────────
            A slim header above the page content.
            Left side: personalised greeting. Right side: today's date.  */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
          <p className="text-sm text-gray-500">
            Good {getTimeOfDay()},{" "}
            {/* Show only the admin's first name to keep it concise */}
            <span className="font-semibold text-gray-900">
              {user.full_name.split(" ")[0]}
            </span>
          </p>
          {/* Current date — formatted as "Tuesday, 22 April 2025" */}
          <p className="text-xs text-gray-400">
            {new Date().toLocaleDateString("en-AU", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </header>

        {/* ── Scrollable page content ────────────────────────────────────
            Each /admin page renders its unique content here via {children}.
            overflow-y-auto allows long pages to scroll without affecting the sidebar. */}
        <main className="flex-1 overflow-y-auto flex flex-col">
          <div className="flex-1 p-6">
            {children}
          </div>
        </main>

      </div>
    </div>
  );
}

// Returns a greeting word based on the current hour of the day.
// Used in the top bar to personalise the message ("Good morning", etc.)
function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}
