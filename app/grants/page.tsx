"use client";

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
import Chatbot from "../components/Chatbot";

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

interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
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

function GrantRoundCard({ round }: { round: GrantRound }) {
  const daysLeft = daysUntil(round.closes_at);

  // True when ≤7 days remain — drives the amber urgency styling.
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

        <div className="absolute top-3 left-3 flex gap-2">
          {round.is_featured && (
            <span className="rounded-full bg-amber-400 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
              Featured
            </span>
          )}
          <span className="rounded-full bg-green-500 px-2.5 py-0.5 text-xs font-semibold text-white">
            Open
          </span>
        </div>
      </div>

      {/* ── Card body ───────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 p-5 gap-3">

        <h3 className="text-xl font-bold text-gray-900 leading-snug">{round.title}</h3>

        {/* line-clamp-2 keeps cards uniform in height regardless of description length. */}
        {round.short_description && (
          <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">
            {round.short_description}
          </p>
        )}

        {round.geographic_restrictions && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{round.geographic_restrictions}</span>
          </div>
        )}

        {/* Spacer pushes the funding/date/tags rows to the bottom of the card. */}
        <div className="flex-1" />

        <div className="flex items-center gap-1.5 text-sm">
          <DollarSign className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span className="font-semibold text-gray-900">
            {round.min_funding_amount
              ? `${formatCurrency(round.min_funding_amount)} – ${formatCurrency(round.max_funding_amount)}`
              : `Up to ${formatCurrency(round.max_funding_amount)}`}
          </span>
        </div>

        {round.closes_at && (
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-gray-400">
              <Clock className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Closes {formatDate(round.closes_at)}</span>
            </div>
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

        {/* Show the first 3 focus-area tags + a "+N more" pill when there are extras. */}
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
            {round.key_focus_areas.length > 3 && (
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
                +{round.key_focus_areas.length - 3} more
              </span>
            )}
          </div>
        )}

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

export default function GrantsPage() {
  const [rounds, setRounds] = useState<GrantRound[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetches open grant rounds on mount. No auth — this endpoint is public.
  useEffect(() => {
    async function fetchRounds() {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/grant-rounds?status=open`
        );

        const data = await res.json();

        if (!res.ok) {
          setError(data.error?.message ?? "Failed to load grant rounds.");
          return;
        }

        // Defensive filter — the backend should already enforce this.
        const openRounds = (data.data as GrantRound[]).filter(
          (r) => r.status === "open" && r.is_published
        );

        setRounds(openRounds);
        setMeta(data.meta);
      } catch {
        setError("Could not reach the server. Please check your connection.");
      } finally {
        setLoading(false);
      }
    }

    fetchRounds();
  }, []);

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

      {/* AI grants assistant — only shows for logged-in visitors (component self-hides otherwise) */}
      <Chatbot contextType="browse" />

    </div>
  );
}
