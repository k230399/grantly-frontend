"use client";
// This page needs "use client" because it uses useState for form values and
// useRouter for navigation after a successful login — both require browser APIs.

// Sign-in page for Grantly — accessible at /login
// Shared entry point for both applicants and admins. After a successful login,
// the user is redirected to /admin or /apply depending on their role.

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import Image from "next/image";

// The shape of the success response from POST /api/v1/auth/login
interface LoginSuccessResponse {
  access_token: string; // JWT the frontend attaches to every subsequent API request
  token_type: "bearer";
  expires_in: number;   // seconds until the token expires (typically 3600)
  user: {
    id: string;
    email: string;
    full_name: string;
    role: "applicant" | "admin"; // determines which dashboard to redirect to
  };
}

// The shape of an error response from the API
// e.g. { error: { code: "invalid_credentials", message: "..." } }
interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
  };
}


// Client component: renders the interactive sign-in form for the /login page
export default function SignInPage() {
  // The current value of the email input field
  const [email, setEmail] = useState("");

  // The current value of the password input field
  const [password, setPassword] = useState("");

  // true while the login API request is in flight — disables the button
  const [loading, setLoading] = useState(false);

  // A human-readable error message to show in the error banner.
  // null means no error is currently displayed.
  const [error, setError] = useState<string | null>(null);

  // true for ~1.5 seconds after a successful login — controls the success toast visibility
  const [showSuccess, setShowSuccess] = useState(false);

  // useRouter gives us the programmatic navigation method (router.push)
  // so we can redirect after a successful login without a full page reload.
  const router = useRouter();

  // Handles form submission — called when the user clicks "Sign in".
  // Sends the credentials to the backend, stores the token on success,
  // or surfaces an error message on failure.
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    // Stop the browser from doing a default form POST + page navigation
    e.preventDefault();

    setLoading(true);
    setError(null); // clear any previous error before retrying

    try {
      // POST /api/v1/auth/login
      // Sends: { email, password }
      // Returns: { access_token, token_type, expires_in, user: { id, email, full_name, role } }
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
        // The backend returned a 4xx error — display its message directly.
        const errorData = data as ApiErrorResponse;
        setError(errorData.error?.message ?? "Something went wrong. Please try again.");
        return;
      }

      // Login was successful — save the token and user info to localStorage
      // so they're available on subsequent pages without another API call.
      // Key "grantly_token" holds the JWT; attach it as Bearer on every API request.
      // Key "grantly_user" holds the user profile (id, name, role).
      const successData = data as LoginSuccessResponse;
      localStorage.setItem("grantly_token", successData.access_token);
      localStorage.setItem("grantly_user", JSON.stringify(successData.user));

      // Show the success toast, then wait briefly so the user can read it before navigating
      setShowSuccess(true);
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Route the user to the correct surface based on their role.
      // Admins go to the admin dashboard; applicants go to their dashboard.
      if (successData.user.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    } catch {
      // A network error occurred — the fetch itself failed (e.g. backend is down)
      setError("Unable to connect. Please check your internet connection.");
    } finally {
      // Always re-enable the button, whether the request succeeded or failed
      setLoading(false);
    }
  }

  return (
    // Full-height page with the same blue gradient (Preline primary) used on the landing hero
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 to-white">

      {/* ── Top navigation strip ──────────────────────────────────────
          Minimal header with just a back-to-home link.
          Keeps the page clean without the full marketing nav.         */}
      <nav className="w-full px-4 sm:px-6 lg:px-8 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">

          {/* Logo wordmark — links back to the public landing page */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center">
              <Image src={'/grantly-logo.png'} width={100} height={100} alt="Grantly Logo"></Image>
            </div>
            <span className="text-xl font-semibold text-gray-900">Grantly</span>
          </Link>

          {/* Secondary link for users who don't have an account yet */}
          <Link
            href="/register"
            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            Don&apos;t have an account?{" "}
            <span className="text-blue-600 font-semibold">Sign up</span>
          </Link>

        </div>
      </nav>

      {/* ── Main content area ─────────────────────────────────────────
          Vertically and horizontally centred on the page.             */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">

        {/* Sign-in card — white panel with a subtle border and shadow */}
        <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-sm p-8">

          {/* ── Card header ───────────────────────────────────────────
              Heading + sub-copy explaining what this page is for.    */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Sign in to Grantly
            </h1>
            <p className="text-sm text-gray-500">
              Enter your email and password to access your dashboard.
            </p>
          </div>

          {/* ── Sign-in form ──────────────────────────────────────────
              onSubmit fires handleSubmit, which calls the login API.  */}
          <form onSubmit={handleSubmit}>

            {/* Error banner — only rendered when there is an error to show.
                The AlertCircle icon and red styling draw attention to the problem. */}
            {error !== null && (
              <div className="mb-5 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            {/* Email field */}
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
                // Controlled input — value comes from state, updates on every keystroke
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition"
              />
            </div>

            {/* Password field */}
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
                // Controlled input — value comes from state, updates on every keystroke
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition"
              />
            </div>

            {/* Submit button — disabled and shows a spinner while the request is in flight.
                The cursor-not-allowed class signals to the user that the button is busy.  */}
            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 active:bg-blue-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {/* Show a spinning loader icon while loading, arrow icon otherwise */}
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

          {/* ── Divider ───────────────────────────────────────────────
              Visual separator before the create-account prompt.      */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-xs text-gray-400">or</span>
            </div>
          </div>

          {/* ── Create account prompt ─────────────────────────────────
              Secondary action for new users.                         */}
          <Link
            href="/register"
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Create a free account
          </Link>

        </div>
      </main>

      {/* Footer strip
          Minimal bottom bar matching the landing page footer style.  */}
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
