"use client";
// Client component: needs useState/useEffect for the async fetch and apply flow.

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Footer from "../../components/Footer";
import { useToast } from "@/contexts/ToastContext";
import {
  ArrowLeft,
  Award,
  Clock,
  DollarSign,
  Calendar,
  Mail,
  Phone,
  FileText,
  CheckCircle,
  Users,
  MapPin,
  Loader2,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import PublicNav from "@/app/components/PublicNav";

interface GrantRound {
  id: string;
  title: string;
  short_description: string | null;
  description: string;
  cover_image_url: string | null;
  eligible_organisation_types: string | null;
  geographic_restrictions: string | null;
  eligibility_criteria: string;
  required_documents: string[] | null;
  assessment_criteria: string | null;
  key_focus_areas: string[] | null;
  min_funding_amount: number | null;
  max_funding_amount: number;
  total_funding_pool: number | null;
  status: "draft" | "open" | "closed" | "completed";
  is_published: boolean;
  is_featured: boolean;
  allow_multiple_applications: boolean;
  max_applications_per_user: number | null;
  opens_at: string | null;
  closes_at: string | null;
  assessment_period_start: string | null;
  notification_date: string | null;
  funding_release_date: string | null;
  contact_email: string | null;
  contact_phone: string | null;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatDate(iso: string | null): string {
  if (!iso) return "Not set";
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
  if (diff === 1) return "1 day remaining";
  return `${diff} days remaining`;
}

export default function GrantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const id = params.id as string;

  const [starting, setStarting] = useState(false);
  const [round, setRound] = useState<GrantRound | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Lazy initializer so isAdmin is correct on the first render — otherwise the
  // fetch effect would fire without a token and admins would see a 403 on draft rounds.
  const [isAdmin] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      const stored = localStorage.getItem("grantly_user");
      if (stored) {
        const user = JSON.parse(stored) as { role: string };
        return user.role === "admin";
      }
    } catch {
      // Malformed session — treat as unauthenticated.
    }
    return false;
  });

  // Admins attach a Bearer token so the API serves draft/unpublished rounds; visitors get only published.
  useEffect(() => {
    async function fetchRound() {
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (isAdmin) {
        const token = localStorage.getItem("grantly_token");
        if (token) headers["Authorization"] = `Bearer ${token}`;
      }

      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/grant-rounds/${id}`,
          { headers }
        );

        const data = await res.json();

        if (!res.ok) {
          setError(data.error?.message ?? "Failed to load this grant round.");
          return;
        }

        setRound(data.data ?? data);
      } catch {
        setError("Could not reach the server. Please check your connection.");
      } finally {
        setLoading(false);
      }
    }

    fetchRound();
  }, [id, isAdmin]);

  // Creates a draft and navigates into the form. If the applicant already has one for this round, route to it.
  async function handleApply() {
    if (starting) return;
    const token = localStorage.getItem("grantly_token");

    // Visitors must sign in first; ?next= bounces them back here afterwards.
    if (!token) {
      router.push(`/login?next=/grants/${id}`);
      return;
    }

    setStarting(true);
    const base = process.env.NEXT_PUBLIC_API_BASE_URL;

    try {
      // The backend rejects empty required strings, so we POST distinctive placeholders that
      // /apply/[id] clears on hydrate (see DRAFT_NAME_PLACEHOLDER / DRAFT_DESCRIPTION_PLACEHOLDER).
      const res = await fetch(`${base}/api/v1/applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          grant_round_id: id,
          project_name: "Untitled application",
          project_description: "Draft — please update before submitting.",
          funding_requested: 0,
          total_project_budget: 0,
        }),
      });
      const data = await res.json();

      if (res.ok) {
        const newId = (data.data ?? data).id;
        router.push(`/apply/${newId}`);
        return;
      }

      // Duplicate — route to their existing draft (or any application) instead of a dead-end error.
      if (data.error?.code === "duplicate_application") {
        const listRes = await fetch(
          `${base}/api/v1/applications?grant_round_id=${id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const list = await listRes.json();
        const existing = (list.data ?? []) as { id: string; status: string }[];
        const draft = existing.find((a) => a.status === "draft") ?? existing[0];
        if (draft) {
          router.push(`/apply/${draft.id}`);
          return;
        }
        showToast("You already have an application for this round.", "error");
        setStarting(false);
        return;
      }

      showToast(data.error?.message ?? "Could not start application.", "error");
      setStarting(false);
    } catch {
      showToast("Could not reach the server. Please try again.", "error");
      setStarting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      <PublicNav />

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-32 gap-2 text-gray-400 flex-1">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading grant details…</span>
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 max-w-md">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <Link href="/grants" className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to all grants
          </Link>
        </div>
      )}

      {!loading && !error && round && (
        <>
          {/* Admin preview banner */}
          {isAdmin && (!round.is_published || round.status === "draft") && (
            <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
              <div className="max-w-7xl mx-auto flex items-center gap-2 text-amber-800 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>
                  <strong>Admin preview.</strong> this round is{" "}
                  {!round.is_published ? "unpublished" : "in draft"} and is not
                  visible to applicants.
                </span>
              </div>
            </div>
          )}

          {/* Cover image */}
          <div className="relative w-full h-56 sm:h-72 bg-gradient-to-br from-blue-600 to-indigo-700 overflow-hidden">
            {round.cover_image_url && (
              <img
                src={round.cover_image_url}
                alt={`Cover image for ${round.title}`}
                className="w-full h-full object-cover"
              />
            )}

            {/* Dark gradient overlay keeps the title readable over any cover image. */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

            <div className="absolute top-4 left-0 right-0 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex items-center justify-between">
              <Link
                href="/grants"
                className="inline-flex items-center gap-1.5 text-sm text-white/80 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to grants
              </Link>

              <div className="flex gap-2">
                {round.is_featured && (
                  <span className="rounded-full bg-amber-400 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
                    Featured
                  </span>
                )}
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    round.status === "open"
                      ? "bg-green-500 text-white"
                      : "bg-white/20 text-white"
                  }`}
                >
                  {round.status.charAt(0).toUpperCase() + round.status.slice(1)}
                </span>
              </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 px-4 sm:px-6 lg:px-8 pb-6 max-w-7xl mx-auto">
              <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
                {round.title}
              </h1>
              {round.short_description && (
                <p className="text-white/80 text-sm sm:text-base mt-2 max-w-2xl leading-relaxed">
                  {round.short_description}
                </p>
              )}
            </div>
          </div>

          {/* ── Body: main content + sidebar ───────────────────────── */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
            <div className="flex flex-col lg:flex-row gap-8">

              <div className="flex-1 space-y-6">

                {/* About this grant */}
                <section className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Award className="w-5 h-5 text-blue-500" />
                    About this grant
                  </h2>
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                    {round.description}
                  </p>

                  {round.key_focus_areas && round.key_focus_areas.length > 0 && (
                    <div className="mt-6 pt-5 border-t border-gray-100">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                        Key Focus Areas
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {round.key_focus_areas.map((area) => (
                          <span
                            key={area}
                            className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700"
                          >
                            {area}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </section>

                {/* Eligibility criteria */}
                <section className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-blue-500" />
                    Eligibility Criteria
                  </h2>
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                    {round.eligibility_criteria}
                  </p>

                  {round.eligible_organisation_types && (
                    <div className="mt-5 pt-5 border-t border-gray-100 flex items-start gap-3">
                      <Users className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                          Eligible Organisation Types
                        </p>
                        <p className="text-sm text-gray-600">{round.eligible_organisation_types}</p>
                      </div>
                    </div>
                  )}

                  {round.geographic_restrictions && (
                    <div className="mt-4 flex items-start gap-3">
                      <MapPin className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                          Geographic Restrictions
                        </p>
                        <p className="text-sm text-gray-600">{round.geographic_restrictions}</p>
                      </div>
                    </div>
                  )}
                </section>

                {round.assessment_criteria && (
                  <section className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-500" />
                      Assessment Criteria
                    </h2>
                    <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                      {round.assessment_criteria}
                    </p>
                  </section>
                )}

                {round.required_documents && round.required_documents.length > 0 && (
                  <section className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-500" />
                      Required Documents
                    </h2>
                    <p className="text-sm text-gray-500 mb-4">
                      You will need to attach the following documents when submitting your application:
                    </p>
                    <ul className="space-y-2.5">
                      {round.required_documents.map((doc) => (
                        <li key={doc} className="flex items-center gap-3 text-sm text-gray-700">
                          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                          {doc}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

              </div>

              {/* ── Sidebar ─────────────────────────────────────────── */}
              <div className="lg:w-80 space-y-5">

                {/* Apply CTA card */}
                <div className="bg-blue-600 rounded-xl p-6 text-white">

                  {round.closes_at && (
                    <div className="flex items-center gap-2 mb-3 text-blue-100 text-sm">
                      <Clock className="w-4 h-4 flex-shrink-0" />
                      <span>{daysUntil(round.closes_at)}</span>
                    </div>
                  )}

                  <p className="font-bold text-lg mb-1">Ready to apply?</p>
                  <p className="text-blue-100 text-sm mb-5 leading-relaxed">
                    {round.status === "open"
                      ? "Start your application and submit before the closing date."
                      : "This grant round is no longer accepting applications."}
                  </p>

                  {round.status === "open" ? (
                    <button
                      type="button"
                      onClick={handleApply}
                      disabled={starting}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {starting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Starting…
                        </>
                      ) : (
                        <>
                          Apply Now
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="w-full rounded-xl bg-blue-500/60 px-5 py-3 text-sm font-bold text-blue-200 text-center">
                      Applications Closed
                    </div>
                  )}
                </div>

                {/* Funding details */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-blue-500" />
                    Funding Details
                  </h3>
                  <dl className="space-y-3 text-sm">

                    <div>
                      <dt className="text-xs text-gray-400 mb-0.5">Amount available</dt>
                      <dd className="font-semibold text-gray-900">
                        {round.min_funding_amount
                          ? `${formatCurrency(round.min_funding_amount)} – ${formatCurrency(round.max_funding_amount)}`
                          : `Up to ${formatCurrency(round.max_funding_amount)}`}
                      </dd>
                    </div>

                    {round.total_funding_pool && (
                      <div className="pt-3 border-t border-gray-100">
                        <dt className="text-xs text-gray-400 mb-0.5">Total funding pool</dt>
                        <dd className="font-semibold text-gray-900">
                          {formatCurrency(round.total_funding_pool)}
                        </dd>
                      </div>
                    )}

                    <div className="pt-3 border-t border-gray-100">
                      <dt className="text-xs text-gray-400 mb-0.5">Applications per organisation</dt>
                      <dd className="text-gray-700">
                        {round.allow_multiple_applications
                          ? `Up to ${round.max_applications_per_user ?? "unlimited"} application${
                              round.max_applications_per_user !== 1 ? "s" : ""
                            }`
                          : "One application per organisation"}
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* Key dates / timeline */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-500" />
                    Key Dates
                  </h3>

                  <ol className="space-y-3">
                    {[
                      { label: "Applications open",    date: round.opens_at },
                      { label: "Applications close",   date: round.closes_at },
                      { label: "Assessment begins",    date: round.assessment_period_start },
                      { label: "Outcome notification", date: round.notification_date },
                      { label: "Funding release",      date: round.funding_release_date },
                    ]
                      .filter((item) => item.date)
                      .map((item) => (
                        <li
                          key={item.label}
                          className="flex items-start justify-between gap-3 text-xs"
                        >
                          <span className="text-gray-500">{item.label}</span>
                          <span className="font-medium text-gray-900 whitespace-nowrap">
                            {formatDate(item.date)}
                          </span>
                        </li>
                      ))}
                  </ol>
                </div>

                {(round.contact_email || round.contact_phone) && (
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Mail className="w-4 h-4 text-blue-500" />
                      Contact
                    </h3>
                    <div className="space-y-3">
                      {round.contact_email && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <a
                            href={`mailto:${round.contact_email}`}
                            className="text-blue-600 hover:underline truncate"
                          >
                            {round.contact_email}
                          </a>
                        </div>
                      )}
                      {round.contact_phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <a
                            href={`tel:${round.contact_phone}`}
                            className="text-blue-600 hover:underline"
                          >
                            {round.contact_phone}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        </>
      )}

      <Footer />

    </div>
  );
}
