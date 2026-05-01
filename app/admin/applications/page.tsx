"use client";
// Client component: reads the JWT from localStorage to authenticate API calls
// and manages filter, search, dropdown, and pagination state interactively.

// Applications list page — accessible at /admin/applications.
// Lists every application across every grant round so admins can review,
// filter by status, search by project name, and scope to a single round.

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Loader2,
  Search,
} from "lucide-react";

// Shape of a single application as returned by GET /api/v1/applications.
// Only includes the fields rendered on this page.
interface Application {
  id: string;
  reference_number: string;
  project_name: string;
  funding_requested: number;
  status: "draft" | "submitted" | "under_review" | "approved" | "rejected";
  submitted_at: string | null;
  created_at: string;
  grant_round: { id: string; title: string };
  applicant: { id: string; full_name: string; email: string } | null;
}

// Pagination info returned alongside the data array from the API.
interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

// Bare-bones grant round shape used to populate the round dropdown.
interface RoundOption {
  id: string;
  title: string;
}

// "all" is a frontend-only sentinel — we just omit ?status= from the API call when it's selected.
type StatusFilter = "all" | "draft" | "submitted" | "under_review" | "approved" | "rejected";

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: "all",          label: "All" },
  { value: "draft",        label: "Draft" },
  { value: "submitted",    label: "Submitted" },
  { value: "under_review", label: "Under Review" },
  { value: "approved",     label: "Approved" },
  { value: "rejected",     label: "Rejected" },
];

// Returns the Tailwind colour classes and display label for an application status.
function getStatusBadge(status: Application["status"]): { className: string; label: string } {
  switch (status) {
    case "draft":        return { className: "bg-gray-100 text-gray-600",   label: "Draft" };
    case "submitted":    return { className: "bg-blue-100 text-blue-700",   label: "Submitted" };
    case "under_review": return { className: "bg-amber-100 text-amber-700", label: "Under Review" };
    case "approved":     return { className: "bg-green-100 text-green-700", label: "Approved" };
    case "rejected":     return { className: "bg-red-100 text-red-600",     label: "Rejected" };
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Narrow an arbitrary string to a known StatusFilter, returning "all" otherwise.
// Used to validate the ?status= query param the dashboard's Quick Actions card sends.
function parseStatus(raw: string | null): StatusFilter {
  const valid: StatusFilter[] = ["all", "draft", "submitted", "under_review", "approved", "rejected"];
  return valid.includes(raw as StatusFilter) ? (raw as StatusFilter) : "all";
}

export default function ApplicationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [applications, setApplications] = useState<Application[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [rounds, setRounds] = useState<RoundOption[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Seed the status tab from ?status= so the dashboard's "Review Applications"
  // shortcut lands with the Submitted tab pre-selected.
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(() =>
    parseStatus(searchParams.get("status"))
  );
  const [grantRoundId, setGrantRoundId] = useState<string>("");

  // Two states for search: searchInput is what the user types right now,
  // searchQuery is the debounced value that actually gets sent to the API.
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [page, setPage] = useState(1);

  // One-time fetch to populate the grant-round dropdown. Admins see every round,
  // so a single page=1 with a generous per_page covers all but the largest orgs.
  useEffect(() => {
    async function fetchRounds() {
      const token = localStorage.getItem("grantly_token");
      if (!token) return;

      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/grant-rounds?per_page=100`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!res.ok) return; // dropdown is non-critical; fail silently

        const data = await res.json();
        setRounds(
          (data.data ?? []).map((r: RoundOption) => ({ id: r.id, title: r.title }))
        );
      } catch {
        // dropdown stays empty; user can still browse without round filter
      }
    }

    fetchRounds();
  }, []);

  // Debounce the search input by 300 ms so we don't fire a request on every keystroke.
  // Resets the page so the new results start from page 1.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearchQuery(searchInput);
      setPage(1);
    }, 300);

    return () => clearTimeout(t);
  }, [searchInput]);

  // Main list fetch — re-runs whenever any filter or the page number changes.
  useEffect(() => {
    async function fetchApplications() {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("grantly_token");
      if (!token) {
        router.replace("/login");
        return;
      }

      const params = new URLSearchParams({ page: String(page) });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (grantRoundId) params.set("grant_round_id", grantRoundId);
      if (searchQuery) params.set("search", searchQuery);

      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/applications?${params}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const data = await res.json();

        if (!res.ok) {
          setError(data.error?.message ?? "Failed to load applications.");
          setLoading(false);
          return;
        }

        setApplications(data.data);
        setMeta(data.meta);
      } catch {
        setError("Could not reach the server. Please check your connection.");
      } finally {
        setLoading(false);
      }
    }

    fetchApplications();
  }, [statusFilter, grantRoundId, searchQuery, page, router]);

  function handleStatusChange(value: StatusFilter) {
    setStatusFilter(value);
    setPage(1);
  }

  function handleRoundChange(value: string) {
    setGrantRoundId(value);
    setPage(1);
  }

  // True when at least one of the three filters narrows the list — used to pick the empty-state copy.
  const hasActiveFilter = statusFilter !== "all" || grantRoundId !== "" || searchQuery !== "";

  return (
    <div>

      {/* ── Page header ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Applications</h1>
          <p className="text-sm text-gray-500 mt-1">
            {meta ? `${meta.total} application${meta.total !== 1 ? "s" : ""} total` : "Review and manage applications"}
          </p>
        </div>
      </div>

      {/* ── Main card — filters + table ──────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">

        {/* Status filter tabs along the top of the card */}
        <div className="flex items-center gap-1 px-4 pt-3 border-b border-gray-100 overflow-x-auto">
          {STATUS_TABS.map(({ value, label }) => {
            const isActive = statusFilter === value;
            return (
              <button
                key={value}
                onClick={() => handleStatusChange(value)}
                className={`px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  isActive
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Search input + grant-round dropdown row */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 border-b border-gray-100">

          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by project name…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={grantRoundId}
            onChange={(e) => handleRoundChange(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            <option value="">All rounds</option>
            {rounds.map((r) => (
              <option key={r.id} value={r.id}>{r.title}</option>
            ))}
          </select>
        </div>

        {/* Loading / error / empty / table — same structure as grant-rounds list */}

        {loading && (
          <div className="flex items-center justify-center py-20 gap-2 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Loading applications…</span>
          </div>
        )}

        {!loading && error && (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 max-w-md">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {!loading && !error && applications.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <FileText className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-900 mb-1">
              {hasActiveFilter ? "No applications match your filters" : "No applications yet"}
            </p>
            <p className="text-xs text-gray-400">
              {hasActiveFilter
                ? "Try clearing the search or changing the status tab."
                : "Submitted applications will appear here."}
            </p>
          </div>
        )}

        {!loading && !error && applications.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">

                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Reference</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Project</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Applicant</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Round</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Amount</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Status</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Submitted</th>
                    <th className="text-right text-xs font-medium text-gray-500 px-5 py-3">Actions</th>
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
                        <td className="px-5 py-4 text-gray-500 font-mono text-xs whitespace-nowrap">
                          {app.reference_number}
                        </td>

                        <td className="px-5 py-4 max-w-[220px]">
                          <p className="font-bold text-gray-900 leading-snug truncate">
                            {app.project_name}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-gray-700 whitespace-nowrap">
                          {app.applicant?.full_name ?? "—"}
                        </td>

                        <td className="px-5 py-4 text-gray-500 max-w-[200px] truncate">
                          {app.grant_round.title}
                        </td>

                        <td className="px-5 py-4 text-gray-700 font-medium whitespace-nowrap">
                          {formatCurrency(app.funding_requested)}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-gray-500 whitespace-nowrap">
                          {formatDate(app.submitted_at)}
                        </td>

                        {/* Detail page lands in a follow-up build step; the link is set up now so the row is already navigable. */}
                        <td className="px-5 py-4 text-right">
                          <Link
                            href={`/admin/applications/${app.id}`}
                            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {meta && meta.last_page > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">

                <p className="text-xs text-gray-400">
                  Showing{" "}
                  <span className="font-medium text-gray-600">
                    {(meta.current_page - 1) * meta.per_page + 1}
                    {" "}–{" "}
                    {Math.min(meta.current_page * meta.per_page, meta.total)}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium text-gray-600">{meta.total}</span>
                </p>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => p - 1)}
                    disabled={meta.current_page === 1}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Previous
                  </button>

                  <span className="px-3 py-1.5 text-xs text-gray-400">
                    {meta.current_page} / {meta.last_page}
                  </span>

                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={meta.current_page === meta.last_page}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}
