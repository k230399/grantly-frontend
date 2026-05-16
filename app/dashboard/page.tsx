"use client";
// "use client" because this page reads from localStorage for auth and
// fetches the applicant's applications on mount.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Footer from "../components/Footer";
import ApplicantNav from "../components/ApplicantNav";
import Chatbot from "../components/Chatbot";
import {
  FileText,
  ArrowRight,
  Clock,
  Loader2,
  AlertCircle,
  Award,
  CalendarDays,
  Hash,
} from "lucide-react";

interface StoredUser {
  id: string;
  email: string;
  full_name: string;
  role: "applicant" | "admin";
}

interface GrantRoundSummary {
  id: string;
  title: string;
  status: string;
  closes_at: string | null;
}

interface Application {
  id: string;
  reference_number: string;
  project_name: string;
  project_description: string;
  funding_requested: number;
  status: "draft" | "submitted" | "under_review" | "approved" | "rejected";
  submitted_at: string | null;
  grant_round: GrantRoundSummary;
  created_at: string;
  updated_at: string;
}

// Formats an ISO date string as a short human-readable date, e.g. "29 Apr 2026"
function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Returns how many days until a closing date, or "Closes today" / "Applications closed"
function daysUntil(iso: string | null): string | null {
  if (!iso) return null;
  const now = new Date();
  const deadline = new Date(iso);
  const diff = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return "Applications closed";
  if (diff === 0) return "Closes today";
  if (diff === 1) return "1 day left";
  return `${diff} days left`;
}

// Returns the display label and Tailwind colour classes for each application status
function statusBadge(status: Application["status"]): { label: string; classes: string } {
  switch (status) {
    case "draft":
      return { label: "In Progress", classes: "bg-amber-100 text-amber-800" };
    case "submitted":
      return { label: "Submitted", classes: "bg-blue-100 text-blue-800" };
    case "under_review":
      return { label: "Under Review", classes: "bg-indigo-100 text-indigo-800" };
    case "approved":
      return { label: "Approved", classes: "bg-green-100 text-green-800" };
    case "rejected":
      return { label: "Unsuccessful", classes: "bg-red-100 text-red-800" };
  }
}

// ApplicationCard: renders a single application as a prominent status card
function ApplicationCard({ app }: { app: Application }) {
  const badge = statusBadge(app.status);
  const closesAt = app.grant_round.closes_at;
  const daysLeft = daysUntil(closesAt);
  const isUrgent =
    daysLeft !== null &&
    daysLeft !== "Applications closed" &&
    daysLeft !== "Closes today" &&
    !isNaN(parseInt(daysLeft)) &&
    parseInt(daysLeft) <= 7;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col gap-4">

      {/* Grant round name + status badge */}
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide leading-relaxed">
          {app.grant_round.title}
        </p>
        <span className={`flex-shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${badge.classes}`}>
          {badge.label}
        </span>
      </div>

      {/* Project name */}
      <h3 className="text-lg font-bold text-gray-900 leading-snug -mt-1">
        {app.project_name}
      </h3>

      {/* Reference number */}
      <div className="flex items-center gap-1.5 text-xs text-gray-400">
        <Hash className="w-3.5 h-3.5 flex-shrink-0" />
        <span>{app.reference_number}</span>
      </div>

      {/* Dates row */}
      <div className="flex flex-wrap gap-4 text-sm text-gray-500">
        <div className="flex items-center gap-1.5">
          <CalendarDays className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span>Started {formatDate(app.created_at)}</span>
        </div>
        {/* Show submitted date once the application has moved past draft */}
        {app.submitted_at && (
          <div className="flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span>Submitted {formatDate(app.submitted_at)}</span>
          </div>
        )}
      </div>

      {/* Deadline row — only shown for drafts to signal urgency */}
      {app.status === "draft" && closesAt && (
        <div className={`flex items-center gap-1.5 text-sm ${isUrgent || daysLeft === "Closes today" ? "text-amber-600" : "text-gray-500"}`}>
          <Clock className="w-4 h-4 flex-shrink-0" />
          <span>
            Round closes {formatDate(closesAt)}
            {daysLeft && ` · ${daysLeft}`}
          </span>
        </div>
      )}

      {/* CTA */}
      <div className="pt-1">
        <Link
          href={`/apply/${app.id}`}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          {app.status === "draft" ? "Continue Application" : "View Application"}
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

    </div>
  );
}

// Client component: applicant dashboard at /dashboard
export default function DashboardPage() {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // On mount: verify session, then fetch the applicant's applications.
  useEffect(() => {
    async function init() {
      const raw = localStorage.getItem("grantly_user");
      const token = localStorage.getItem("grantly_token");

      if (!raw || !token) {
        router.replace("/login");
        return;
      }

      let parsedUser: StoredUser;
      try {
        parsedUser = JSON.parse(raw) as StoredUser;
      } catch {
        localStorage.removeItem("grantly_user");
        localStorage.removeItem("grantly_token");
        router.replace("/login");
        return;
      }

      setUser(parsedUser);

      // Fetch the applicant's applications from the API
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/applications`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await res.json();

        if (!res.ok) {
          setError(data.error?.message ?? "Failed to load your applications.");
          return;
        }

        setApplications(data.data as Application[]);
      } catch {
        setError("Could not reach the server. Please check your connection.");
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [router]);

  // Show spinner while we verify auth and fetch data
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="w-8 h-8 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
      </div>
    );
  }

  const firstName = user.full_name.split(" ")[0];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">

      <ApplicantNav user={user} />

      {/* Main content */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-10">

        {/* Welcome heading */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Welcome back, {firstName}</h1>
          <p className="mt-1 text-sm text-gray-500">Track and manage your grant applications.</p>
        </div>

        {/* My Applications section */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            My Applications
          </h2>

          {/* Loading state */}
          {loading && (
            <div className="flex items-center gap-2 text-gray-400 py-10">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading your applications…</span>
            </div>
          )}

          {/* Error state */}
          {!loading && error && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && applications.length === 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-8 py-12 flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <Award className="w-7 h-7 text-gray-400" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-1">No applications yet</h3>
              <p className="text-sm text-gray-500 max-w-xs leading-relaxed mb-6">
                Browse open grant rounds to start your first application.
              </p>
              <Link
                href="/grants"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                Browse Grant Rounds
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}

          {/* Application cards */}
          {!loading && !error && applications.length > 0 && (
            <div className="flex flex-col gap-4">
              {applications.map((app) => (
                <ApplicationCard key={app.id} app={app} />
              ))}
            </div>
          )}
        </section>

        {/* Secondary CTA — always shown when apps exist */}
        {!loading && !error && applications.length > 0 && (
          <div className="mt-8 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-500 mb-3">Looking for other opportunities?</p>
            <Link
              href="/grants"
              className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            >
              Browse open grant rounds
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

      </main>

      <Footer />

      {/* AI dashboard assistant — answers questions about the applicant's own applications */}
      <Chatbot contextType="dashboard" />
    </div>
  );
}
