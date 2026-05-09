"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

interface StoredUser {
  id: string;
  email: string;
  full_name: string;
  role: "applicant" | "admin";
}

export default function PublicNav() {
  const [user, setUser] = useState<StoredUser | null>(null);
  const router = useRouter();

  // Hydrates the signed-in user from localStorage on mount.
  useEffect(() => {
    const token = localStorage.getItem("grantly_token");
    const rawUser = localStorage.getItem("grantly_user");

    if (token && rawUser) {
      try {
        setUser(JSON.parse(rawUser) as StoredUser);
      } catch {
        setUser(null);
      }
    }
  }, []);

  function handleSignOut() {
    localStorage.removeItem("grantly_token");
    localStorage.removeItem("grantly_user");
    setUser(null);
    router.push("/");
  }

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* ── Logo + wordmark ──────────────────────────────────────── */}
          <Link href="/" className="flex items-center gap-2">
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

          {/* ── Nav actions — auth-aware right-hand side ─────────────── */}
          <div className="flex items-center gap-3">

            {user ? (
              <>
                <span className="text-sm font-medium text-gray-700">
                  {user.full_name}
                </span>

                {/* Admins land on /admin; applicants on /dashboard. */}
                <Link
                  href={user.role === "admin" ? "/admin" : "/dashboard"}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                >
                  {user.role === "admin" ? "Go to admin" : "Go to dashboard"}
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <button
                  onClick={handleSignOut}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors px-3 py-2"
                >
                  Sign in
                </Link>

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
