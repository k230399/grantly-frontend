"use client";
// "use client" because we use useState and useEffect to manage the
// loading state and grant rounds data fetched from the API.

// Public grant rounds browse page — accessible at /grants.
// No login required. Shows all open, published grant rounds in a card grid.

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Footer from "../components/Footer";
import {
  Award,
  Clock,
  DollarSign,
  ArrowRight,
  Loader2,
  AlertCircle,
  MapPin,
} from "lucide-react";
import PublicNav from "../components/PublicNav";

// The shape of a single grant round as returned by GET /api/v1/grant-rounds
interface GrantRound {
  id: string;
  title: string;
  short_description: string | null;
  cover_image_url: string | null;
  min_funding_amount: number | null;
  max_funding_amount: number;
  status: "draft" | "open" | "closed" | "completed";
  is_published: boolean;
  is_featured: boolean;
  opens_at: string | null;
  closes_at: string | null;
  key_focus_areas: string[] | null;
  geographic_restrictions: string | null;
}

// Pagination info returned alongside the data array from the API
interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
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
// Returns "—" when the date is null.
function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Returns a human-readable string describing how many days remain until a deadline.
// Returns null if no date is given, or "Applications closed" if the date has passed.
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

// GrantRoundCard: renders a single grant round as a browsable card in the grid.
// Used on /grants — one card per open grant round.
function GrantRoundCard({ round }: { round: GrantRound }) {
  // How much time is left to apply — used to show urgency styling
  const daysLeft = daysUntil(round.closes_at);

  // true when the deadline is within 7 days — shown in amber to signal urgency
  const isUrgent =
    daysLeft !== null &&
    daysLeft !== "Applications closed" &&
    daysLeft !== "Closes today" &&
    !isNaN(parseInt(daysLeft)) &&
    parseInt(daysLeft) <= 7;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow duration-200">

      {/* Cover image */}
      <div className="relative w-full aspect-video bg-gradient-to-br from-blue-500 to-indigo-600 overflow-hidden">
        {round.cover_image_url ? (
          <img
            src={round.cover_image_url}
            alt={`Cover image for ${round.title}`}
            className="w-full h-full object-cover"
          />
        ) : (
          
          <div className="absolute inset-0 flex items-center justify-center opacity-20">
            <Award className="w-16 h-16 text-white" />
          </div>
        )}

        {/* Badges overlaid on the top-left of the card image */}
        <div className="absolute top-3 left-3 flex gap-2">
          {/* Condition: only show the "Featured" badge if the round is marked featured */}
          {round.is_featured && (
            <span className="rounded-full bg-amber-400 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
              Featured
            </span>
          )}
          {/* Status badge — only open rounds are shown, but badge communicates it clearly */}
          <span className="rounded-full bg-green-500 px-2.5 py-0.5 text-xs font-semibold text-white">
            Open
          </span>
        </div>
      </div>

      {/* ── Card body ───────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 p-5 gap-3">

        {/* Grant title */}
        <h3 className="text-xl font-bold text-gray-900 leading-snug">{round.title}</h3>

        {/* Short description — clamped to 2 lines so cards stay uniform in height */}
        {round.short_description && (
          <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">
            {round.short_description}
          </p>
        )}

        {/* Geographic restriction — shown when the grant is limited to certain areas */}
        {round.geographic_restrictions && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{round.geographic_restrictions}</span>
          </div>
        )}

        {/* Spacer pushes the funding/date/tags section to the bottom of the card */}
        <div className="flex-1" />

        {/* Funding range */}
        <div className="flex items-center gap-1.5 text-sm">
          <DollarSign className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span className="font-semibold text-gray-900">
            {/* Condition: show a range if a minimum is set; otherwise just show the max */}
            {round.min_funding_amount
              ? `${formatCurrency(round.min_funding_amount)} – ${formatCurrency(round.max_funding_amount)}`
              : `Up to ${formatCurrency(round.max_funding_amount)}`}
          </span>
        </div>

        {/* Closing date + days remaining */}
        {round.closes_at && (
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-gray-400">
              <Clock className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Closes {formatDate(round.closes_at)}</span>
            </div>
            {/* Condition: amber for urgent (≤7 days) or closing today, gray otherwise */}
            {daysLeft && (
              <span
                className={`font-medium ${
                  daysLeft === "Closes today" || isUrgent ? "text-amber-600" : "text-gray-400"
                }`}
              >
                {daysLeft}
              </span>
            )}
          </div>
        )}

        {/* Key focus area tags — show up to 3, with "+N more" if there are extras */}
        {round.key_focus_areas && round.key_focus_areas.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {round.key_focus_areas.slice(0, 3).map((area) => (
              <span
                key={area}
                className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700"
              >
                {area}
              </span>
            ))}
            {/* Only shown when there are more than 3 focus areas */}
            {round.key_focus_areas.length > 3 && (
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
                +{round.key_focus_areas.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* View Details CTA — links to the individual grant detail page at /grants/[id] */}
        <Link
          href={`/grants/${round.id}`}
          className="mt-1 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          View Details
          <ArrowRight className="w-4 h-4" />
        </Link>

      </div>
    </div>
  );
}

// Client component: the public grant rounds browse page at /grants
export default function GrantsPage() {
  // The list of open grant rounds returned by the API
  const [rounds, setRounds] = useState<GrantRound[]>([]);

  // Pagination info returned alongside the rounds array
  const [meta, setMeta] = useState<PaginationMeta | null>(null);

  // true while the API request is in flight — shows a spinner in place of the grid
  const [loading, setLoading] = useState(true);

  // An error message if the fetch failed — null means nothing to show
  const [error, setError] = useState<string | null>(null);

  // On mount: fetch the open grant rounds from the public API.
  // No auth token is needed — this is a public endpoint.
  useEffect(() => {
    async function fetchRounds() {
      try {
        // GET /api/v1/grant-rounds?status=open — requests only open rounds.
        // NOTE: the backend must allow unauthenticated requests to this endpoint
        // for the public browse page to work without a login.
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/grant-rounds?status=open`
        );

        const data = await res.json();

        if (!res.ok) {
          setError(data.error?.message ?? "Failed to load grant rounds.");
          return;
        }

        // Filter client-side to be safe — only show open, published rounds
        // (the backend should enforce this too, but this is a second line of defence)
        const openRounds = (data.data as GrantRound[]).filter(
          (r) => r.status === "open" && r.is_published
        );

        setRounds(openRounds);
        setMeta(data.meta);
      } catch {
        setError("Could not reach the server. Please check your connection.");
      } finally {
        // Always turn off the loading spinner whether the fetch succeeded or failed
        setLoading(false);
      }
    }

    fetchRounds();
  }, []); // empty array — runs once when the page first loads

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <PublicNav/>

      {/* Hero section */}
      <section className="bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-12">
          <p className="text-blue-600 text-sm font-medium mb-3 uppercase tracking-wider">
            Grant Rounds
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
            Browse Open Grants
          </h1>
          <p className="text-gray-600 text-base sm:text-lg leading-relaxed">
            Explore funding opportunities available to your organisation. Select a grant to read the full details and start your application.
          </p>
          {/* Show the total count once loaded — gives context on how many rounds are available */}
          {meta && !loading && (
            <p className="mt-4 text-gray-400 text-sm">
              {rounds.length} grant {rounds.length === 1 ? "round" : "rounds"} currently open
            </p>
          )}
        </div>
      </section>

      {/* Main content area */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-24 gap-2 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Loading grant rounds…</span>
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div className="flex items-center justify-center py-24">
            <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 max-w-md">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && rounds.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Award className="w-7 h-7 text-gray-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">No open grants right now</h2>
            <p className="text-sm text-gray-500 max-w-sm leading-relaxed">
              There are no grant rounds open for applications at the moment. Check back soon.
            </p>
          </div>
        )}

        {/* Card grid */}
        {!loading && !error && rounds.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {rounds.map((round) => (
              <GrantRoundCard key={round.id} round={round} />
            ))}
          </div>
        )}

        {/* Pagination placeholder */}
        {!loading && !error && meta && meta.last_page > 1 && (
          <div className="mt-10 flex justify-center">
            <p className="text-sm text-gray-400">
              Page {meta.current_page} of {meta.last_page}
            </p>
          </div>
        )}

      </main>
      <Footer />

    </div>
  );
}
