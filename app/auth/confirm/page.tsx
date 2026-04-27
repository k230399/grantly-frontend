"use client";
// This page needs "use client" because it reads window.location.hash, which is
// a browser-only API — it doesn't exist during server-side rendering.

// Email verification callback page — accessible at /auth/confirm
// Supabase redirects here after the user clicks the verification link in their email.
// On success, the URL hash contains: #access_token=...&type=signup
// On failure, the URL hash contains: #error=...&error_description=...
// Configure this URL in Supabase: Authentication → URL Configuration → Redirect URLs

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, MailCheck, AlertCircle } from "lucide-react";
import Footer from "../../components/Footer";

// The three states this page can be in:
// - "loading": we haven't parsed the URL hash yet (initial render)
// - "success": Supabase confirmed the email successfully
// - "error":   Supabase returned an error (e.g. link expired, already used)
type ConfirmState = "loading" | "success" | "error";

// Client component: reads the URL hash from Supabase's redirect and shows
// either a success screen or an error screen depending on what it finds.
export default function AuthConfirmPage() {
  // Which state to render — starts as "loading" until we've read the hash
  const [state, setState] = useState<ConfirmState>("loading");

  // The human-readable error description from Supabase, if one was returned.
  // Only set when state === "error".
  const [errorDescription, setErrorDescription] = useState<string | null>(null);

  // On mount, parse the URL fragment (the part after #) that Supabase appends.
  // This runs once — the hash doesn't change after the page loads.
  useEffect(() => {
    // window.location.hash looks like "#error=access_denied&error_description=..."
    // or "#access_token=...&type=signup"
    // URLSearchParams can parse it after we strip the leading "#"
    const hash = window.location.hash.slice(1); // remove the "#"
    const params = new URLSearchParams(hash);

    const error = params.get("error");
    const description = params.get("error_description");

    if (error) {
      // Supabase reported a problem — show the error state with its description
      setErrorDescription(
        description ?? "The verification link was invalid or has expired."
      );
      setState("error");
    } else {
      // No error param — assume the verification was successful
      setState("success");
    }
  }, []); // empty dependency array — runs once on mount

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 to-white">

      {/* ── Top navigation strip ──────────────────────────────────────
          Minimal header — same as the login and register pages.      */}
      <nav className="w-full px-4 sm:px-6 lg:px-8 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">

          {/* Logo wordmark — links back to the public landing page */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">G</span>
            </div>
            <span className="text-xl font-semibold text-gray-900">Grantly</span>
          </Link>

        </div>
      </nav>

      {/* ── Main content area ─────────────────────────────────────────
          Centred card — content switches based on the confirm state.  */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">

          {/* ── Loading state ─────────────────────────────────────────
              Shown for a brief moment while useEffect reads the hash.
              Prevents a flash of the wrong state on first render.    */}
          {state === "loading" && (
            <div className="py-4">
              <div className="w-14 h-14 rounded-full bg-blue-100 animate-pulse mx-auto mb-5" />
              <p className="text-sm text-gray-500">Verifying your email…</p>
            </div>
          )}

          {/* ── Success state ─────────────────────────────────────────
              Shown when Supabase didn't include an error in the hash.
              Prompts the user to sign in now that their account is active. */}
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

          {/* ── Error state ───────────────────────────────────────────
              Shown when Supabase included an error param in the hash.
              Common reasons: link expired, already used, or invalid.  */}
          {state === "error" && (
            <div className="py-4">
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-5">
                <AlertCircle className="w-7 h-7 text-red-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-3">
                Verification failed
              </h1>
              {/* Show the description that Supabase returned, e.g. "Token has expired" */}
              <p className="text-sm text-gray-500 mb-8 leading-relaxed">
                {errorDescription}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                {/* Primary action: try registering again */}
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                >
                  Try again
                  <ArrowRight className="w-4 h-4" />
                </Link>
                {/* Secondary action: go to sign in if they already have an active account */}
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

      {/* Shared footer — same across all non-auth pages */}
      <Footer />

    </div>
  );
}
