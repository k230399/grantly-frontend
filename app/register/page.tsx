"use client";
// Client component: needs useState for form values and to swap to the success state.

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, AlertCircle, Loader2, MailCheck } from "lucide-react";
import Image from "next/image";

interface RegisterSuccessResponse {
  message: string;
}

interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (password !== passwordConfirmation) {
      setError("The passwords you entered don't match. Please try again.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/auth/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            full_name: fullName,
            email,
            password,
            password_confirmation: passwordConfirmation,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        const errorData = data as ApiErrorResponse;
        setError(errorData.error?.message ?? "Something went wrong. Please try again.");
        return;
      }

      // No redirect — the account isn't active until the verification email is clicked.
      const _successData = data as RegisterSuccessResponse;
      setSuccess(true);
    } catch {
      setError("Unable to connect. Please check your internet connection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 to-white">

      {/* ── Top nav ─────────────────────────────────────────────────── */}
      <nav className="w-full px-4 sm:px-6 lg:px-8 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">

          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center">
              <Image src={'/grantly-logo.png'} width={100} height={100} alt="Grantly Logo"></Image>
            </div>
            <span className="text-xl font-semibold text-gray-900">Grantly</span>
          </Link>

          <Link
            href="/login"
            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            Already have an account?{" "}
            <span className="text-blue-600 font-semibold">Sign in</span>
          </Link>

        </div>
      </nav>

      {/* ── Main content area ───────────────────────────────────────── */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">

        <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-sm p-8">

          {/* Success state — shown in place of the form after registration. */}
          {success ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-5">
                <MailCheck className="w-7 h-7 text-blue-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-3">Check your email</h1>
              <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                We&apos;ve sent a verification link to{" "}
                <span className="font-semibold text-gray-700">{email}</span>.
                Click the link in that email to activate your account, <br/> then sign in.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                Go to sign in
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Create your account
                </h1>
                <p className="text-sm text-gray-500">
                  Free to use. No credit card required.
                </p>
              </div>

              <form onSubmit={handleSubmit}>

                {/* Error banner */}
                {error !== null && (
                  <div className="mb-5 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    {error}
                  </div>
                )}

                <div className="mb-5">
                  <label
                    htmlFor="fullName"
                    className="block text-sm font-medium text-gray-700 mb-1.5"
                  >
                    Full name
                  </label>
                  <input
                    id="fullName"
                    name="full_name"
                    type="text"
                    autoComplete="name"
                    required
                    placeholder="Jane Smith"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition"
                  />
                </div>

                <div className="mb-5">
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 mb-1.5"
                  >
                    Email address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition"
                  />
                </div>

                <div className="mb-5">
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700 mb-1.5"
                  >
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition"
                  />
                </div>

                <div className="mb-6">
                  <label
                    htmlFor="passwordConfirmation"
                    className="block text-sm font-medium text-gray-700 mb-1.5"
                  >
                    Confirm password
                  </label>
                  <input
                    id="passwordConfirmation"
                    name="password_confirmation"
                    type="password"
                    autoComplete="new-password"
                    required
                    placeholder="••••••••"
                    value={passwordConfirmation}
                    onChange={(e) => setPasswordConfirmation(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 active:bg-blue-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating account…
                    </>
                  ) : (
                    <>
                      Create account
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

              </form>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-3 text-xs text-gray-400">or</span>
                </div>
              </div>

              <Link
                href="/login"
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Sign in to existing account
              </Link>
            </>
          )}

        </div>
      </main>

      <footer className="py-6 px-4 text-center">
        <p className="text-xs text-gray-400">
          © {new Date().getFullYear()} Grantly. Community Grant Application Portal — Australia.
        </p>
      </footer>

    </div>
  );
}
