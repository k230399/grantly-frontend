"use client";
// Client component: reads the JWT from localStorage to authenticate API calls
// and manages loading/error state for the live counts and recent applications table.

// Admin dashboard overview — accessible at /admin
// High-level snapshot of platform activity: open grant rounds, total applications,
// pending review queue, and the most recently active applications.

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Award,
  FileText,
  Clock,
  CheckCircle,
  ArrowRight,
  TrendingUp,
  Users,
  AlertCircle,
  Loader2,
} from "lucide-react";

// Shape of one application row used in the Recent Applications table.
// Only includes the fields the dashboard actually renders.
interface DashboardApplication {
  id: string;
  funding_requested: number;
  status: "draft" | "submitted" | "under_review" | "approved" | "rejected";
  submitted_at: string | null;
  created_at: string;
  grant_round: { id: string; title: string };
  applicant: { id: string; full_name: string; email: string } | null;
}

// Aggregated counts shown in the four stat cards at the top of the dashboard.
interface DashboardCounts {
  activeRounds: number;
  totalApplications: number;
  pendingReview: number;   // submitted + under_review
  approved: number;        // total approved (no date filter — see note in plan)
}

// Returns the Tailwind colour classes and display label for a given application status.
// Each status gets a distinct colour so reviewers can scan the table at a glance.
function getStatusBadge(status: DashboardApplication["status"]): {
  className: string;
  label: string;
} {
  switch (status) {
    case "draft":        return { className: "bg-gray-100 text-gray-600",   label: "Draft" };
    case "submitted":    return { className: "bg-blue-100 text-blue-700",   label: "Submitted" };
    case "under_review": return { className: "bg-amber-100 text-amber-700", label: "Under Review" };
    case "approved":     return { className: "bg-green-100 text-green-700", label: "Approved" };
    case "rejected":     return { className: "bg-red-100 text-red-600",     label: "Rejected" };
  }
}

// Formats a number as Australian dollars without decimal places.
// e.g. formatCurrency(25000) → "$25,000"
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
  }).format(amount);
}

// Formats an ISO date string as a short human-readable date.
// e.g. "2025-09-30T23:59:59+00:00" → "30 Sep 2025"
function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AdminDashboardPage() {
  // The 5 most recent non-draft applications shown in the table.
  const [applications, setApplications] = useState<DashboardApplication[]>([]);

  // Aggregated totals shown in the stat cards. null while the parallel fetch is in flight.
  const [counts, setCounts] = useState<DashboardCounts | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetches the recent applications list and the four stat-card counts in parallel
  // on first mount. We need the JWT from localStorage so this has to run client-side.
  useEffect(() => {
    async function fetchDashboard() {
      const token = localStorage.getItem("grantly_token");
      if (!token) return; // layout guard handles redirect; bail quietly here

      const base = process.env.NEXT_PUBLIC_API_BASE_URL;
      const headers = { Authorization: `Bearer ${token}` };

      try {
        // Five list endpoints in parallel — we only read meta.total from the four count
        // calls, but it's the cheapest available shape until aggregate endpoints exist.
        const [recent, openRounds, totalApps, submitted, underReview, approved] =
          await Promise.all([
            fetch(`${base}/api/v1/applications`, { headers }),
            fetch(`${base}/api/v1/grant-rounds?status=open`, { headers }),
            fetch(`${base}/api/v1/applications`, { headers }),
            fetch(`${base}/api/v1/applications?status=submitted`, { headers }),
            fetch(`${base}/api/v1/applications?status=under_review`, { headers }),
            fetch(`${base}/api/v1/applications?status=approved`, { headers }),
          ]);

        if (!recent.ok) {
          const data = await recent.json().catch(() => ({}));
          setError(data.error?.message ?? "Failed to load dashboard data.");
          return;
        }

        const recentData = await recent.json();
        const openRoundsData = await openRounds.json();
        const totalAppsData = await totalApps.json();
        const submittedData = await submitted.json();
        const underReviewData = await underReview.json();
        const approvedData = await approved.json();

        // The API has no multi-status filter, so we drop drafts client-side
        // and slice the first 5. The default per_page (15) gives enough buffer
        // that drafts almost never push the table below 5 rows.
        const nonDrafts: DashboardApplication[] = (recentData.data ?? [])
          .filter((a: DashboardApplication) => a.status !== "draft")
          .slice(0, 5);

        setApplications(nonDrafts);
        setCounts({
          activeRounds: openRoundsData.meta?.total ?? 0,
          totalApplications: totalAppsData.meta?.total ?? 0,
          pendingReview:
            (submittedData.meta?.total ?? 0) + (underReviewData.meta?.total ?? 0),
          approved: approvedData.meta?.total ?? 0,
        });
      } catch {
        setError("Could not reach the server. Please check your connection.");
      } finally {
        setLoading(false);
      }
    }

    fetchDashboard();
  }, []);

  return (
    <div>

      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          An overview of grant rounds and application activity.
        </p>
      </div>

      {/* ── Stat cards ────────────────────────────────────────────────
          Four summary numbers that give the admin a quick pulse on the platform.
          Each big number falls back to a skeleton bar while the parallel fetch is in flight. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">

        <StatCard
          label="Active Rounds"
          value={counts?.activeRounds}
          loading={loading}
          subtitle="Currently open to applicants"
          icon={<Award className="w-5 h-5 text-blue-600" />}
          iconBg="bg-blue-50"
        />

        <StatCard
          label="Total Applications"
          value={counts?.totalApplications}
          loading={loading}
          subtitle="Across all rounds"
          icon={<FileText className="w-5 h-5 text-purple-600" />}
          iconBg="bg-purple-50"
        />

        <StatCard
          label="Pending Review"
          value={counts?.pendingReview}
          loading={loading}
          subtitle="Awaiting a decision"
          icon={<Clock className="w-5 h-5 text-amber-600" />}
          iconBg="bg-amber-50"
        />

        <StatCard
          label="Approved"
          value={counts?.approved}
          loading={loading}
          subtitle="Total approved"
          icon={<CheckCircle className="w-5 h-5 text-green-600" />}
          iconBg="bg-green-50"
        />

      </div>

      {/* ── Lower content: recent applications table + quick actions ──────
          Two-column grid on large screens. Table takes 2/3, quick actions 1/3. */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Recent Applications table ──────────────────────────────── */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">

          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">Recent Applications</h2>
            <Link
              href="/admin/applications"
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
              View all
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Loading state replaces the table body so there's no layout jump. */}
          {loading && (
            <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading applications…</span>
            </div>
          )}

          {!loading && error && (
            <div className="flex items-center justify-center py-16 px-5">
              <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 max-w-md">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            </div>
          )}

          {!loading && !error && applications.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <FileText className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-900 mb-1">No applications yet</p>
              <p className="text-xs text-gray-400">
                Submitted applications will appear here.
              </p>
            </div>
          )}

          {!loading && !error && applications.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">

                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Applicant</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Grant Round</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Amount</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Status</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Submitted</th>
                  </tr>
                </thead>

                <tbody>
                  {applications.map((app) => {
                    const badge = getStatusBadge(app.status);

                    return (
                      <tr
                        key={app.id}
                        className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-5 py-3.5 font-medium text-gray-900 whitespace-nowrap">
                          {app.applicant?.full_name ?? "—"}
                        </td>

                        <td className="px-5 py-3.5 text-gray-500 max-w-[180px] truncate">
                          {app.grant_round.title}
                        </td>

                        <td className="px-5 py-3.5 text-gray-700 font-medium whitespace-nowrap">
                          {formatCurrency(app.funding_requested)}
                        </td>

                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                        </td>

                        <td className="px-5 py-3.5 text-gray-400 whitespace-nowrap">
                          {formatDate(app.submitted_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Quick Actions panel ────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">

          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">Quick Actions</h2>
          </div>

          <div className="p-4 space-y-2">

            <Link
              href="/admin/grant-rounds/new"
              className="flex items-center justify-between p-3.5 rounded-lg border border-gray-200 hover:border-blue-200 hover:bg-blue-50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Award className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">New Grant Round</p>
                  <p className="text-xs text-gray-500">Create and configure a round</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors flex-shrink-0" />
            </Link>

            <Link
              href="/admin/applications?status=submitted"
              className="flex items-center justify-between p-3.5 rounded-lg border border-gray-200 hover:border-amber-200 hover:bg-amber-50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Review Applications</p>
                  <p className="text-xs text-gray-500">
                    {/* Live count of applications waiting on a decision (submitted + under_review). */}
                    {counts
                      ? `${counts.pendingReview} application${counts.pendingReview !== 1 ? "s" : ""} need a decision`
                      : "Loading…"}
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-amber-600 transition-colors flex-shrink-0" />
            </Link>

            <Link
              href="/admin/applications"
              className="flex items-center justify-between p-3.5 rounded-lg border border-gray-200 hover:border-purple-200 hover:bg-purple-50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <Users className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">All Applications</p>
                  <p className="text-xs text-gray-500">Browse the full list</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-purple-600 transition-colors flex-shrink-0" />
            </Link>

            <Link
              href="/admin/grant-rounds"
              className="flex items-center justify-between p-3.5 rounded-lg border border-gray-200 hover:border-green-200 hover:bg-green-50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Grant Rounds</p>
                  <p className="text-xs text-gray-500">Manage open and draft rounds</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-green-600 transition-colors flex-shrink-0" />
            </Link>

          </div>
        </div>

      </div>
    </div>
  );
}

// One stat card. Shows a skeleton bar in place of the number while the
// parent's parallel fetch is still in flight, then swaps to the live count.
function StatCard({
  label,
  value,
  loading,
  subtitle,
  icon,
  iconBg,
}: {
  label: string;
  value: number | undefined;
  loading: boolean;
  subtitle: string;
  icon: React.ReactNode;
  iconBg: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${iconBg}`}>
          {icon}
        </div>
      </div>
      {loading || value === undefined ? (
        <div className="h-9 w-16 bg-gray-100 rounded animate-pulse" />
      ) : (
        <p className="text-3xl font-bold text-gray-900">{value}</p>
      )}
      <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
    </div>
  );
}
