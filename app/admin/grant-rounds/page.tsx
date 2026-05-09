"use client";
// Client component: needs localStorage for the JWT and useState for filter/pagination state.

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

interface GrantRound {
  id: string;
  title: string;
  short_description: string | null;
  status: "draft" | "open" | "closed" | "completed";
  is_published: boolean;
  is_featured: boolean;
  min_funding_amount: number | null;
  max_funding_amount: number;
  opens_at: string | null;
  closes_at: string | null;
  applications_count: number;
  created_at: string;
  creator: { id: string; full_name: string } | null;
}

interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

// "all" is frontend-only — we omit ?status= from the API call when it's selected.
type StatusFilter = "all" | "draft" | "open" | "closed" | "completed";

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: "all",       label: "All" },
  { value: "draft",     label: "Draft" },
  { value: "open",      label: "Open" },
  { value: "closed",    label: "Closed" },
  { value: "completed", label: "Completed" },
];

function getStatusBadge(status: GrantRound["status"]): { className: string; label: string } {
  switch (status) {
    case "draft":     return { className: "bg-gray-100 text-gray-600",   label: "Draft" };
    case "open":      return { className: "bg-green-100 text-green-700", label: "Open" };
    case "closed":    return { className: "bg-amber-100 text-amber-700", label: "Closed" };
    case "completed": return { className: "bg-blue-100 text-blue-700",   label: "Completed" };
    default:          return { className: "bg-gray-100 text-gray-500",   label: String(status) };
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

export default function GrantRoundsPage() {
  const router = useRouter();

  const [rounds, setRounds] = useState<GrantRound[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);

  // Re-fetches whenever the status filter or page changes.
  useEffect(() => {
    async function fetchRounds() {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("grantly_token");
      if (!token) {
        router.replace("/login");
        return;
      }

      const params = new URLSearchParams({ page: String(page) });
      if (statusFilter !== "all") params.set("status", statusFilter);

      try {
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

        setRounds(data.data);
        setMeta(data.meta);
      } catch {
        setError("Could not reach the server. Please check your connection.");
      } finally {
        setLoading(false);
      }
    }

    fetchRounds();
  }, [statusFilter, page, router]);

  // Reset to page 1 on filter change so we don't land on a page that doesn't exist in the new result set.
  function handleFilterChange(value: StatusFilter) {
    setStatusFilter(value);
    setPage(1);
  }

  return (
    <div>

      {/* ── Page header ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Grant Rounds</h1>
          <p className="text-sm text-gray-500 mt-1">
            {meta ? `${meta.total} round${meta.total !== 1 ? "s" : ""} total` : "Manage all grant rounds"}
          </p>
        </div>

        <Link
          href="/admin/grant-rounds/new"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Grant Round
        </Link>
      </div>

      {/* ── Filter tabs + table ─────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">

        {/* ── Status filter tabs ──────────────────────────────────────── */}
        <div className="flex items-center gap-1 px-4 pt-3 border-b border-gray-100 overflow-x-auto">
          {STATUS_TABS.map(({ value, label }) => {
            const isActive = statusFilter === value;
            return (
              <button
                key={value}
                onClick={() => handleFilterChange(value)}
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

        {/* Loading state replaces the table body so there's no layout jump. */}
        {loading && (
          <div className="flex items-center justify-center py-20 gap-2 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Loading grant rounds…</span>
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 max-w-md">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && rounds.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Award className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-900 mb-1">
              {statusFilter === "all" ? "No grant rounds yet" : `No ${statusFilter} rounds`}
            </p>
            <p className="text-xs text-gray-400 mb-4">
              {statusFilter === "all"
                ? "Create your first grant round to get started."
                : `There are no rounds with status "${statusFilter}" right now.`}
            </p>
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

        {/* ── Grant rounds table ──────────────────────────────────────── */}
        {!loading && !error && rounds.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">

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
                    const badge = getStatusBadge(round.status);

                    return (
                      <tr
                        key={round.id}
                        className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                      >

                        <td className="px-5 py-4">
                          <p className="font-bold text-gray-900 leading-snug">{round.title}</p>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-gray-700 tabular-nums">
                          {round.applications_count}
                        </td>

                        <td className="px-5 py-4 text-gray-700 whitespace-nowrap">
                          {formatCurrency(round.max_funding_amount)}
                        </td>

                        <td className="px-5 py-4 text-gray-500 whitespace-nowrap">
                          {formatDate(round.opens_at)}
                        </td>

                        <td className="px-5 py-4 text-gray-500 whitespace-nowrap">
                          {formatDate(round.closes_at)}
                        </td>

                        <td className="px-5 py-4 text-gray-700 whitespace-nowrap">
                          {round.creator?.full_name ?? "—"}
                        </td>

                        <td className="px-5 py-4">
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

            {/* ── Pagination ───────────────────────────────────────────── */}
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
