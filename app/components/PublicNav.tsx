"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

// Shape of the user object stored in localStorage under "grantly_user"
interface StoredUser {
  id: string;           // UUID from Supabase Auth
  email: string;        // user's email address
  full_name: string;    // display name shown in the nav
  role: "applicant" | "admin"; // controls which dashboard they see
}

// Client component: renders the public nav bar with auth-aware right-hand actions
export default function PublicNav() {
  // The logged-in user parsed from localStorage, or null if not authenticated.
  // Starts as null and is populated once the component mounts in the browser.
  const [user, setUser] = useState<StoredUser | null>(null);

  const router = useRouter();

  // Read localStorage on mount to check for an existing session.
  // This runs only on the client (after hydration), so localStorage is safe to access here.
  // The empty dependency array [] means it runs once when the component first appears.
  useEffect(() => {
    const token = localStorage.getItem("grantly_token");
    const rawUser = localStorage.getItem("grantly_user");

    // Only set user state if both the token and user object exist in storage
    if (token && rawUser) {
      try {
        // grantly_user is stored as a JSON string — parse it back into an object
        setUser(JSON.parse(rawUser) as StoredUser);
      } catch {
        // If parsing fails (corrupt data), treat the user as logged out
        setUser(null);
      }
    }
  }, []);

  // handleSignOut — called when the user clicks "Sign out".
  // Clears the stored token and user object, then navigates to the home page.
  function handleSignOut() {
    localStorage.removeItem("grantly_token");
    localStorage.removeItem("grantly_user");
    setUser(null);       // update state immediately so the nav re-renders
    router.push("/");    // send the user back to the landing page
  }

  return (
    // Sticky header that stays pinned to the top of the viewport as the user scrolls.
    // z-50 keeps it above all other content; border-b provides a subtle separator line.
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* ── Logo + wordmark ────────────────────────────────────────
              Links back to "/" so clicking the logo always goes home. */}
          <Link href="/" className="flex items-center gap-2">
            {/* Logo image — sized to 32×32 to sit neatly in the nav bar */}
            <div className="w-8 h-8 rounded-lg flex items-center justify-center">
              <Image
                src="/grantly-logo.png"
                width={32}
                height={32}
                alt="Grantly Logo"
              />
            </div>
            <span className="text-xl font-semibold text-gray-900">Grantly</span>
          </Link>

          {/* ── Nav actions ────────────────────────────────────────────
              The right-hand side swaps based on whether a user is logged in.
              - Logged in:  show their name + a Sign out button
              - Logged out: show Sign in link + Apply for a grant button  */}
          <div className="flex items-center gap-3">

            {/* Condition: user !== null means we found a valid token + user in localStorage */}
            {user ? (
              // ── Authenticated state ──────────────────────────────────
              <>
                {/* Show the user's name as low-prominence text so they know who's signed in */}
                <span className="text-sm font-medium text-gray-700">
                  {user.full_name}
                </span>

                {/* Role-based dashboard link:
                    - Admins go to /admin (the management dashboard)
                    - Applicants go to /apply (their application portal) */}
                <Link
                  href={user.role === "admin" ? "/admin" : "/dashboard"}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                >
                  {/* Label changes based on role */}
                  {user.role === "admin" ? "Go to admin" : "Go to dashboard"}
                  <ArrowRight className="w-4 h-4" />
                </Link>

                {/* Sign out button — clears storage and redirects home */}
                <button
                  onClick={handleSignOut}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </>
            ) : (
              // ── Unauthenticated state ────────────────────────────────
              <>
                {/* Low-prominence link for users who already have an account */}
                <Link
                  href="/login"
                  className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors px-3 py-2"
                >
                  Sign in
                </Link>

                {/* Primary CTA — blue button with arrow icon */}
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                >
                  Apply for a grant
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            )}

          </div>
        </div>
      </div>
    </nav>
  );
}
