"use client";
// Client component: needs localStorage to read the logged-in applicant.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FileText, ArrowRight } from "lucide-react";
import Footer from "../components/Footer";

interface StoredUser {
  id: string;
  email: string;
  full_name: string;
  role: "applicant" | "admin";
}

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

  // Auth guard: redirect to /login if no session is found.
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
        // Corrupt session — clear both keys so a fresh login starts clean.
        localStorage.removeItem("grantly_user");
        localStorage.removeItem("grantly_token");
        router.replace("/login");
      }
    }

    init();
  }, [router]);

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

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">

      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-sm p-10 text-center">

        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">G</span>
          </div>
          <span className="text-xl font-semibold text-gray-900">Grantly</span>
        </div>

        <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-5">
          <FileText className="w-7 h-7 text-blue-600" />
        </div>

        <h1 className="text-xl font-bold text-gray-900 mb-2">
          Welcome, {user.full_name.split(" ")[0]}
        </h1>
        <p className="text-sm text-gray-500 mb-8">
          Browse open grant rounds and submit your applications from here.
        </p>

        <Link
          href="/grants"
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors mb-3"
        >
          Browse Grant Rounds
          <ArrowRight className="w-4 h-4" />
        </Link>

        <button
          onClick={handleSignOut}
          className="w-full rounded-xl border border-gray-300 bg-white px-6 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Sign out
        </button>

      </div>

      </main>

      <Footer />

    </div>
  );
}
