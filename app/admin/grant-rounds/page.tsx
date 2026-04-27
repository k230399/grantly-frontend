"use client";
// This page needs to be a client component because it reads the JWT from localStorage
// to authenticate the API request, and manages filter/pagination state interactively.

// Grant Rounds list page — accessible at /admin/grant-rounds.
// Shows all grant rounds in a table. Admins can filter by status and page through results.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Award,
  Plus,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Loader2,
} from "lucide-react";

// The shape of a single grant round as returned by GET /api/v1/grant-rounds
interface GrantRound {
  id: string;                        // unique identifier (UUID)
  title: string;                     // display name of the round
  short_description: string | null;  // optional one-liner shown on cards
  status: "draft" | "open" | "closed" | "completed"; // current lifecycle stage
  is_published: boolean;             // whether applicants can see this round
  is_featured: boolean;              // whether it's pinned to the top of the browse page
  min_funding_amount: number | null; // minimum applicants can request (AUD)
  max_funding_amount: number;        // maximum applicants can request (AUD)
  opens_at: string | null;           // ISO date when applications open
  closes_at: string | null;          // ISO date when applications close
  applications_count: number;        // how many applications have been submitted
  created_at: string;                // ISO timestamp when this round was created
  creator: { id: string; full_name: string } | null; // the admin who created this round (included for admin requests)
}

// Pagination info returned alongside the data array from the API
interface PaginationMeta {
  current_page: number; // which page we're on right now (1-indexed)
  last_page: number;    // the total number of pages
  per_page: number;     // how many items per page (the API default is 15)
  total: number;        // total number of rounds matching the current filter
}

// The status filter options shown as tabs above the table.
// "all" is a frontend-only value — we just omit the ?status= param when it's selected.
type StatusFilter = "all" | "draft" | "open" | "closed" | "completed";

// Each tab gets a label and the query param value to pass to the API
const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: "all",       label: "All" },
  { value: "draft",     label: "Draft" },
  { value: "open",      label: "Open" },
  { value: "closed",    label: "Closed" },
  { value: "completed", label: "Completed" },
];

// Returns the Tailwind colour classes and display label for a grant round's status.
// Matches the colour scheme used throughout the admin surface.
function getStatusBadge(status: GrantRound["status"]): { className: string; label: string } {
  switch (status) {
    case "draft":     return { className: "bg-gray-100 text-gray-600",   label: "Draft" };
    case "open":      return { className: "bg-green-100 text-green-700", label: "Open" };
    case "closed":    return { className: "bg-amber-100 text-amber-700", label: "Closed" };
    case "completed": return { className: "bg-blue-100 text-blue-700",   label: "Completed" };
    default:          return { className: "bg-gray-100 text-gray-500",   label: String(status) };
  }
}

// Formats a number as Australian dollars without decimal places.
// e.g. formatCurrency(50000) → "$50,000"
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
  }).format(amount);
}

// Formats an ISO date string as a short human-readable date.
// e.g. "2025-09-30T23:59:59+00:00" → "30 Sep 2025"
// Returns "—" when the date is null (not set yet).
function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Client component: the Grant Rounds list page at /admin/grant-rounds
export default function GrantRoundsPage() {
  const router = useRouter();

  // The list of grant rounds loaded from the API — starts empty while fetching
  const [rounds, setRounds] = useState<GrantRound[]>([]);

  // Pagination info returned alongside the rounds — starts null before first fetch
  const [meta, setMeta] = useState<PaginationMeta | null>(null);

  // true while the API request is in flight — shows a spinner in place of the table
  const [loading, setLoading] = useState(true);

  // An error message if the fetch failed — null means no error to show
  const [error, setError] = useState<string | null>(null);

  // Which status tab is currently selected — "all" means no filter is applied
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Which page of results we're viewing — resets to 1 whenever the filter changes
  const [page, setPage] = useState(1);

  // Fetch grant rounds from the API whenever the filter or page changes.
  // useEffect runs after every render where statusFilter or page has changed.
  useEffect(() => {
    async function fetchRounds() {
      setLoading(true);
      setError(null);

      // Read the JWT stored at login — needed to authenticate this request
      const token = localStorage.getItem("grantly_token");
      if (!token) {
        router.replace("/login");
        return;
      }

      // Build the query string — include ?status= only when a specific status is selected
      const params = new URLSearchParams({ page: String(page) });
      if (statusFilter !== "all") params.set("status", statusFilter);

      try {
        // GET /api/v1/grant-rounds — admins see all rounds in all statuses
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/grant-rounds?${params}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const data = await res.json();

        if (!res.ok) {
          setError(data.error?.message ?? "Failed to load grant rounds.");
          setLoading(false);
          return;
        }

        // Store the rounds list and pagination info from the response
        setRounds(data.data);
        setMeta(data.meta);
      } catch {
        setError("Could not reach the server. Please check your connection.");
      } finally {
        // Always turn off the loading spinner, whether the request succeeded or failed
        setLoading(false);
      }
    }

    fetchRounds();
  }, [statusFilter, page, router]); // re-runs whenever any of these change

  // When the admin clicks a different status tab, reset to page 1 so they
  // don't land on a page that doesn't exist in the new filtered result set
  function handleFilterChange(value: StatusFilter) {
    setStatusFilter(value);
    setPage(1);
  }

  return (
    <div>

      {/* ── Page header ──────────────────────────────────────────────────
          Title on the left, "New Grant Round" button on the right.       */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Grant Rounds</h1>
          <p className="text-sm text-gray-500 mt-1">
            {/* Show the total count once it's loaded — helps the admin know the scale */}
            {meta ? `${meta.total} round${meta.total !== 1 ? "s" : ""} total` : "Manage all grant rounds"}
          </p>
        </div>

        {/* Link to the create form — styled as a primary button */}
        <Link
          href="/admin/grant-rounds/new"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Grant Round
        </Link>
      </div>

      {/* ── Main card — contains the filter tabs + table ──────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">

        {/* ── Status filter tabs ────────────────────────────────────────
            A row of clickable tabs that filter the table by status.
            The active tab gets an underline and blue text.              */}
        <div className="flex items-center gap-1 px-4 pt-3 border-b border-gray-100 overflow-x-auto">
          {STATUS_TABS.map(({ value, label }) => {
            // true when this tab is the currently selected filter
            const isActive = statusFilter === value;
            return (
              <button
                key={value}
                onClick={() => handleFilterChange(value)}
                className={`px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  isActive
                    ? "border-blue-600 text-blue-600"       // active tab: blue underline + text
                    : "border-transparent text-gray-500 hover:text-gray-700" // inactive: no underline
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* ── Loading state ─────────────────────────────────────────────
            Shown while the API request is in flight.
            Replaces the table so there's no layout jump.               */}
        {loading && (
          <div className="flex items-center justify-center py-20 gap-2 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Loading grant rounds…</span>
          </div>
        )}

        {/* ── Error state ───────────────────────────────────────────────
            Shown when the API fetch failed.                            */}
        {!loading && error && (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 max-w-md">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* ── Empty state ───────────────────────────────────────────────
            Shown when the fetch succeeded but returned zero results.   */}
        {!loading && !error && rounds.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Award className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-900 mb-1">
              {/* Message changes depending on whether a filter is active */}
              {statusFilter === "all" ? "No grant rounds yet" : `No ${statusFilter} rounds`}
            </p>
            <p className="text-xs text-gray-400 mb-4">
              {statusFilter === "all"
                ? "Create your first grant round to get started."
                : `There are no rounds with status "${statusFilter}" right now.`}
            </p>
            {/* Only show the create button in the empty state when viewing all rounds */}
            {statusFilter === "all" && (
              <Link
                href="/admin/grant-rounds/new"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Grant Round
              </Link>
            )}
          </div>
        )}

        {/* ── Grant rounds table ────────────────────────────────────────
            Only rendered when data has loaded and there are rows to show. */}
        {!loading && !error && rounds.length > 0 && (
          <>
            {/* Horizontal scroll wrapper in case the table is wider than the viewport */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">

                {/* Column headers */}
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Title</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Status</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Applications</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Max Funding</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Opens</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Closes</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Created By</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Published</th>
                    <th className="text-right text-xs font-medium text-gray-500 px-5 py-3">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {rounds.map((round) => {
                    // Look up the colour and label for this row's status badge
                    const badge = getStatusBadge(round.status);

                    return (
                      <tr
                        key={round.id}
                        className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                      >

                        {/* Title + optional short description below it */}
                        <td className="px-5 py-4">
                          <p className="font-bold text-gray-900 leading-snug">{round.title}</p>
                        </td>

                        {/* Status — colour-coded pill badge */}
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                        </td>

                        {/* Number of applications submitted for this round */}
                        <td className="px-5 py-4 text-gray-700 tabular-nums">
                          {round.applications_count}
                        </td>

                        {/* Maximum funding amount formatted as AUD */}
                        <td className="px-5 py-4 text-gray-700 whitespace-nowrap">
                          {formatCurrency(round.max_funding_amount)}
                        </td>

                        {/* Date when applications open — "—" if not set */}
                        <td className="px-5 py-4 text-gray-500 whitespace-nowrap">
                          {formatDate(round.opens_at)}
                        </td>

                        {/* Date when applications close — "—" if not set */}
                        <td className="px-5 py-4 text-gray-500 whitespace-nowrap">
                          {formatDate(round.closes_at)}
                        </td>

                        {/* Creator — the admin's full name who created this round; "—" if not available */}
                        <td className="px-5 py-4 text-gray-700 whitespace-nowrap">
                          {round.creator?.full_name ?? "—"}
                        </td>

                        {/* Published indicator — green dot for yes, grey for no */}
                        <td className="px-5 py-4">
                          {/* Condition: is this round currently visible to applicants? */}
                          {round.is_published ? (
                            <span className="inline-flex items-center gap-1.5 text-xs text-green-700">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                              Yes
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                              No
                            </span>
                          )}
                        </td>

                        {/* Actions — Edit link (more actions like Delete can be added later) */}
                        <td className="px-5 py-4 text-right flex flex-column gap-2">
                          <a
                            href={`/grants/${round.id}`}
                            target="_blank"
                            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            View
                          </a>
                          <Link
                            href={`/admin/grant-rounds/${round.id}/edit`}
                            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            Edit
                          </Link>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Pagination controls ──────────────────────────────────────
                Only shown when there is more than one page of results.    */}
            {meta && meta.last_page > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">

                {/* "Showing X–Y of Z" count — gives the admin context on where they are */}
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

                {/* Previous / Next buttons */}
                <div className="flex items-center gap-1">

                  {/* Previous page — disabled on the first page */}
                  <button
                    onClick={() => setPage((p) => p - 1)}
                    disabled={meta.current_page === 1}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Previous
                  </button>

                  {/* Page indicator between the two buttons */}
                  <span className="px-3 py-1.5 text-xs text-gray-400">
                    {meta.current_page} / {meta.last_page}
                  </span>

                  {/* Next page — disabled on the last page */}
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
