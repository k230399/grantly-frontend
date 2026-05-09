"use client";
// Client component: reads window.location.hash, which is a browser-only API.

// Supabase redirects here after the email verification link is clicked.
// Success hash: #access_token=...&type=signup · Failure hash: #error=...&error_description=...
// Redirect URL is configured in Supabase: Authentication → URL Configuration.

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, MailCheck, AlertCircle } from "lucide-react";
import Footer from "../../components/Footer";

type ConfirmState = "loading" | "success" | "error";

export default function AuthConfirmPage() {
  const [state, setState] = useState<ConfirmState>("loading");
  const [errorDescription, setErrorDescription] = useState<string | null>(null);

  // Parses Supabase's redirect hash on mount and routes into success or error state.
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    const params = new URLSearchParams(hash);

    const error = params.get("error");
    const description = params.get("error_description");

    if (error) {
      setErrorDescription(
        description ?? "The verification link was invalid or has expired."
      );
      setState("error");
    } else {
      setState("success");
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 to-white">

      {/* ── Top nav ─────────────────────────────────────────────────── */}
      <nav className="w-full px-4 sm:px-6 lg:px-8 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">

          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">G</span>
            </div>
            <span className="text-xl font-semibold text-gray-900">Grantly</span>
          </Link>

        </div>
      </nav>

      {/* ── Main content area ───────────────────────────────────────── */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">

          {/* Loading state — prevents a flash of the wrong screen before the hash is parsed. */}
          {state === "loading" && (
            <div className="py-4">
              <div className="w-14 h-14 rounded-full bg-blue-100 animate-pulse mx-auto mb-5" />
              <p className="text-sm text-gray-500">Verifying your email…</p>
            </div>
          )}

          {/* Success state */}
          {state === "success" && (
            <div className="py-4">
              <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-5">
                <MailCheck className="w-7 h-7 text-blue-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-3">
                Email confirmed!
              </h1>
              <p className="text-sm text-gray-500 mb-8 leading-relaxed">
                Your email address has been verified. Your account is now active, sign in to get started.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                Sign in
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}

          {/* Error state — common causes: link expired, already used, or invalid. */}
          {state === "error" && (
            <div className="py-4">
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-5">
                <AlertCircle className="w-7 h-7 text-red-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-3">
                Verification failed
              </h1>
              <p className="text-sm text-gray-500 mb-8 leading-relaxed">
                {errorDescription}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                >
                  Try again
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Sign in instead
                </Link>
              </div>
            </div>
          )}

        </div>
      </main>

      <Footer />

    </div>
  );
}
