"use client";
// This page needs "use client" because it reads from localStorage (a browser API)
// to get the logged-in user's name and role.

// Temporary dashboard — accessible at /dashboard
// Placeholder shown after login until the real /apply and /admin surfaces are built.
// Displays the logged-in user's name and role, and provides a sign-out button.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Footer from "../components/Footer";

// The shape of the user object stored in localStorage under "grantly_user"
interface StoredUser {
  id: string;
  email: string;       // the user's email address
  full_name: string;   // the user's display name
  role: "applicant" | "admin"; // controls which real dashboard they'll be sent to later
}

// Client component: reads the stored user from localStorage and displays a welcome message
export default function DashboardPage() {
  const [user, setUser] = useState<StoredUser | null | undefined>(() => {
    if (typeof window === "undefined") return undefined;
    try {
      const raw = localStorage.getItem("grantly_user");
      if (!raw) return undefined;
      return JSON.parse(raw) as StoredUser;
    } catch {
      return undefined;
    }
  });

  const router = useRouter();

  // On mount, read the stored user from localStorage.
  // If no user is found, redirect back to sign-in so this page can't be accessed unauthenticated.
  useEffect(() => {
    const raw = localStorage.getItem("grantly_user");

    if (!raw) {
      // No stored user — send them to sign-in
      router.replace("/login");
      return;
    }

    try {
      setUser(JSON.parse(raw) as StoredUser);
    } catch {
      // Stored value was corrupted — clear it and redirect
      localStorage.removeItem("grantly_user");
      localStorage.removeItem("grantly_token");
      router.replace("/login");
    }
  }, [router]); // runs once on mount; router is stable so this won't re-fire

  // Clears the stored token and user, then sends the user back to sign-in
  function handleSignOut() {
    localStorage.removeItem("grantly_token");
    localStorage.removeItem("grantly_user");
    router.push("/login");
  }

  if (!user) return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-50 to-white">
      <div className="w-8 h-8 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
    </div>
  );

  // Capitalise the role label so it reads nicely (e.g. "applicant" → "Applicant")
  const roleLabel = user.role === "admin" ? "Admin" : "Applicant";

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 to-white">

      {/* Main content area — card centred in the space above the footer */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">

      {/* Temporary dashboard card */}
      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-sm p-10 text-center">

        {/* Grantly logo at the top of the card */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center">
            <Image src={'/grantly-logo.png'} width={150} height={150} alt="Grantly Logo"></Image>
          </div>
          <span className="text-xl font-semibold text-gray-900">Grantly</span>
        </div>

        {/* Blue check badge */}
        <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-5">
          <svg className="w-7 h-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        {/* Welcome message — shows the user's name and role from localStorage */}
        <h1 className="text-xl font-bold text-gray-900 mb-2">You&apos;re signed in</h1>
        <p className="text-gray-600 text-sm mb-1">
          You are logged in as{" "}
          <span className="font-semibold text-gray-900">{user.full_name}</span>
        </p>
        <p className="text-sm text-gray-500 mb-8">
          {/* Role badge — blue for applicants, blue for admins */}
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
            user.role === "admin"
              ? "bg-blue-100 text-blue-700"
              : "bg-blue-100 text-blue-700"
          }`}>
            {roleLabel}
          </span>
        </p>

        {/* Placeholder note explaining this is temporary */}
        <p className="text-xs text-gray-400 mb-8">
          This is a temporary page. The full {roleLabel.toLowerCase()} dashboard is coming soon.
        </p>

        {/* Sign out button */}
        <button
          onClick={handleSignOut}
          className="w-full rounded-xl border border-gray-300 bg-white px-6 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Sign out
        </button>

      </div>

      </main>

      {/* Shared footer — same across all non-auth pages */}
      <Footer />

    </div>
  );
}
