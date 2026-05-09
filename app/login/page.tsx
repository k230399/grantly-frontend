"use client";
// Client component: needs useState for the form and useRouter for the post-login redirect.

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import Image from "next/image";

interface LoginSuccessResponse {
  access_token: string;
  token_type: "bearer";
  expires_in: number;
  user: {
    id: string;
    email: string;
    full_name: string;
    role: "applicant" | "admin";
  };
}

interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/auth/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        const errorData = data as ApiErrorResponse;
        setError(errorData.error?.message ?? "Something went wrong. Please try again.");
        return;
      }

      // grantly_token: attached as Bearer on every authenticated request.
      // grantly_user: id/name/role so subsequent pages don't need another fetch.
      const successData = data as LoginSuccessResponse;
      localStorage.setItem("grantly_token", successData.access_token);
      localStorage.setItem("grantly_user", JSON.stringify(successData.user));

      setShowSuccess(true);
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Read ?next= from window.location at click time to avoid the Suspense boundary
      // useSearchParams imposes on static pages. Only allow same-origin paths so
      // ?next=https://evil.com can't bounce them off-site. Admins ignore next.
      const nextPath = new URLSearchParams(window.location.search).get("next");
      if (successData.user.role === "admin") {
        router.push("/admin");
      } else if (nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//")) {
        router.push(nextPath);
      } else {
        router.push("/dashboard");
      }
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
            href="/register"
            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            Don&apos;t have an account?{" "}
            <span className="text-blue-600 font-semibold">Sign up</span>
          </Link>

        </div>
      </nav>

      {/* ── Main content area ───────────────────────────────────────── */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">

        <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-sm p-8">

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Sign in to Grantly
            </h1>
            <p className="text-sm text-gray-500">
              Enter your email and password to access your dashboard.
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

            <div className="mb-6">
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700"
                >
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
                  Signing in…
                </>
              ) : (
                <>
                  Sign in
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
            href="/register"
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Create a free account
          </Link>

        </div>
      </main>

      <footer className="py-6 px-4 text-center">
        <p className="text-xs text-gray-400">
          © {new Date().getFullYear()} Grantly. Community Grant Application Portal — Australia.
        </p>
      </footer>

      {/* Success toast */}
      {showSuccess && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-xl bg-green-50 px-5 py-3.5 text-sm text-gray-900 shadow-lg whitespace-nowrap">
          <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
          <span>Signed in successfully.</span>
        </div>
      )}

    </div>
  );
}
