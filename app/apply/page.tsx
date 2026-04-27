"use client";
// This page needs "use client" because it reads from localStorage to display
// the logged-in applicant's name and provides a sign-out button.

// Applicant portal placeholder — accessible at /apply
// Shown after a successful applicant login until the full portal is built.
// Reads the logged-in user from localStorage and redirects to /login if no session is found.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FileText, ArrowRight } from "lucide-react";
import Footer from "../components/Footer";

// The shape of the user object stored in localStorage under "grantly_user"
interface StoredUser {
  id: string;
  email: string;       // the applicant's email address
  full_name: string;   // the applicant's display name
  role: "applicant" | "admin";
}

// Client component: applicant portal landing page (placeholder)
export default function ApplyPage() {
  const [user, setUser] = useState<StoredUser | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem("grantly_user");
      if (!raw) return null;
      return JSON.parse(raw) as StoredUser;
    } catch {
      return null;
    }
  });

  const router = useRouter();

  // On mount, read localStorage and verify a session exists.
  // If no session is found, redirect to /login.
  useEffect(() => {
    async function init() {
      const raw = localStorage.getItem("grantly_user");

      if (!raw) {
        router.replace("/login");
        return;
      }

      try {
        setUser(JSON.parse(raw) as StoredUser);
      } catch {
        // Corrupted data — clear and redirect
        localStorage.removeItem("grantly_user");
        localStorage.removeItem("grantly_token");
        router.replace("/login");
      }
    }

    init();
  }, [router]);

  // Sign out by clearing localStorage and redirecting to /login
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

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 to-white">

      {/* Main content area — centred card fills available space above the footer */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">

      {/* Placeholder card */}
      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-sm p-10 text-center">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">G</span>
          </div>
          <span className="text-xl font-semibold text-gray-900">Grantly</span>
        </div>

        {/* Icon */}
        <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-5">
          <FileText className="w-7 h-7 text-blue-600" />
        </div>

        {/* Welcome message */}
        <h1 className="text-xl font-bold text-gray-900 mb-2">
          Welcome, {user.full_name.split(" ")[0]}
        </h1>
        <p className="text-sm text-gray-500 mb-8">
          Browse open grant rounds and submit your applications from here.
        </p>

        {/* Link to the grant rounds browse page */}
        <Link
          href="/grants"
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors mb-3"
        >
          Browse Grant Rounds
          <ArrowRight className="w-4 h-4" />
        </Link>

        {/* Sign out */}
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
