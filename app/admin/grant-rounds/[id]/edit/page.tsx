"use client";
// Needs client rendering for localStorage token access, async data fetching, and file uploads.

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Plus,
  X,
  DollarSign,
  Calendar,
  FileText,
  Settings,
  Users,
  MapPin,
  Mail,
  Phone,
  ImagePlus,
  Check,
} from "lucide-react";
import FormSchemaBuilder, {
  type ApplicationFormSchema,
} from "@/components/admin/FormSchemaBuilder";
import { useToast } from "@/contexts/ToastContext";

interface GrantRound {
  id: string;
  title: string;
  short_description: string | null;
  description: string;
  cover_image_url: string | null;
  status: "draft" | "open" | "closed" | "completed";
  is_published: boolean;
  is_featured: boolean;
  allow_multiple_applications: boolean;
  max_applications_per_user: number;
  min_funding_amount: number | null;
  max_funding_amount: number;
  total_funding_pool: number | null;
  eligibility_criteria: string;
  eligible_organisation_types: string | null;
  geographic_restrictions: string | null;
  required_documents: string[] | null;
  key_focus_areas: string[] | null;
  assessment_criteria: string | null;
  opens_at: string | null;
  closes_at: string | null;
  assessment_period_start: string | null;
  notification_date: string | null;
  funding_release_date: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  application_form_schema: ApplicationFormSchema | null;
}

// Number fields stored as strings so <input> elements work naturally; parsed on submit
interface GrantRoundFormData {
  status: "draft" | "open" | "closed" | "completed";
  title: string;
  short_description: string;
  description: string;
  min_funding_amount: string;
  max_funding_amount: string;
  total_funding_pool: string;
  eligibility_criteria: string;
  eligible_organisation_types: string;
  geographic_restrictions: string;
  required_documents: string[];
  key_focus_areas: string[];
  assessment_criteria: string;
  opens_at: string;
  closes_at: string;
  assessment_period_start: string;
  notification_date: string;
  funding_release_date: string;
  contact_email: string;
  contact_phone: string;
  is_published: boolean;
  is_featured: boolean;
  allow_multiple_applications: boolean;
  max_applications_per_user: string;
  application_form_schema: ApplicationFormSchema | null;
}

// Converts an ISO timestamp (e.g. "2025-09-30T23:59:59+00:00") to "YYYY-MM-DD" for <input type="date">
function isoToDateInput(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

// Maps the API response into the form shape, converting nulls to empty strings/arrays
function roundToForm(round: GrantRound): GrantRoundFormData {
  return {
    status: round.status,
    title: round.title,
    short_description: round.short_description ?? "",
    description: round.description,
    min_funding_amount: round.min_funding_amount != null ? String(round.min_funding_amount) : "",
    max_funding_amount: String(round.max_funding_amount),
    total_funding_pool: round.total_funding_pool != null ? String(round.total_funding_pool) : "",
    eligibility_criteria: round.eligibility_criteria,
    eligible_organisation_types: round.eligible_organisation_types ?? "",
    geographic_restrictions: round.geographic_restrictions ?? "",
    required_documents: round.required_documents ?? [],
    key_focus_areas: round.key_focus_areas ?? [],
    assessment_criteria: round.assessment_criteria ?? "",
    opens_at: isoToDateInput(round.opens_at),
    closes_at: isoToDateInput(round.closes_at),
    assessment_period_start: isoToDateInput(round.assessment_period_start),
    notification_date: isoToDateInput(round.notification_date),
    funding_release_date: isoToDateInput(round.funding_release_date),
    contact_email: round.contact_email ?? "",
    contact_phone: round.contact_phone ?? "",
    is_published: round.is_published,
    is_featured: round.is_featured,
    allow_multiple_applications: round.allow_multiple_applications,
    max_applications_per_user: String(round.max_applications_per_user),
    application_form_schema: round.application_form_schema ?? null,
  };
}

function getStatusBadge(status: GrantRound["status"]): { className: string; dotClass: string; label: string } {
  switch (status) {
    case "draft":     return { className: "bg-gray-100 text-gray-600",   dotClass: "bg-gray-400",   label: "Draft" };
    case "open":      return { className: "bg-green-100 text-green-700", dotClass: "bg-green-500",  label: "Open" };
    case "closed":    return { className: "bg-amber-100 text-amber-700", dotClass: "bg-amber-500",  label: "Closed" };
    case "completed": return { className: "bg-blue-100 text-blue-700",   dotClass: "bg-blue-500",   label: "Completed" };
    default:          return { className: "bg-gray-100 text-gray-500",   dotClass: "bg-gray-400",   label: String(status) };
  }
}

// Edit Grant Round form — /admin/grant-rounds/[id]/edit
export default function EditGrantRoundPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { showToast } = useToast();

  const [round, setRound] = useState<GrantRound | null>(null);
  const [form, setForm] = useState<GrantRoundFormData | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // Only used for the initial page-load failure — form submit errors go through showToast
  const [error, setError] = useState<string | null>(null);
  const [currentCoverImageUrl, setCurrentCoverImageUrl] = useState<string | null>(null);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const [docInput, setDocInput] = useState("");
  const [focusInput, setFocusInput] = useState("");

  // Fetch the existing grant round on mount so we can pre-fill the form
  useEffect(() => {
    async function fetchRound() {
      const token = localStorage.getItem("grantly_token");
      if (!token) { router.replace("/login"); return; }

      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/grant-rounds/${id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (res.status === 404) { router.replace("/admin/grant-rounds"); return; }

        const data = await res.json();

        if (!res.ok) {
          setError(data.error?.message ?? "Failed to load grant round.");
          setPageLoading(false);
          return;
        }

        // Laravel wraps single resources in a "data" key; handle both shapes
        const fetched: GrantRound = data.data ?? data;
        setRound(fetched);
        setForm(roundToForm(fetched));
        setCurrentCoverImageUrl(fetched.cover_image_url);
      } catch {
        setError("Could not reach the server. Please check your connection.");
      } finally {
        setPageLoading(false);
      }
    }

    fetchRound();
  }, [id, router]);

  // Re-initialise Preline after the async fetch — PrelineScript only runs on route changes
  // and won't pick up elements that appear after a fetch completes.
  useEffect(() => {
    if (!round) return;
    import("preline").then(({ HSStaticMethods }) => HSStaticMethods.autoInit());
  }, [round]);

  function updateField<K extends keyof GrantRoundFormData>(field: K, value: GrantRoundFormData[K]) {
    setForm((prev) => prev ? { ...prev, [field]: value } : prev);
  }

  function handleCoverImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png"].includes(file.type)) {
      showToast("Cover image must be a JPG or PNG file.", "error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast("Cover image must be smaller than 5 MB.", "error");
      return;
    }

    if (coverImagePreview) URL.revokeObjectURL(coverImagePreview);
    setCoverImageFile(file);
    setCoverImagePreview(URL.createObjectURL(file));
  }

  function removeNewCoverImage() {
    if (coverImagePreview) URL.revokeObjectURL(coverImagePreview);
    setCoverImageFile(null);
    setCoverImagePreview(null);
  }

  function removeExistingCoverImage() {
    setCurrentCoverImageUrl(null);
  }

  function addDocument() {
    const trimmed = docInput.trim();
    if (!trimmed || !form || form.required_documents.includes(trimmed)) return;
    updateField("required_documents", [...form.required_documents, trimmed]);
    setDocInput("");
  }

  function removeDocument(doc: string) {
    if (!form) return;
    updateField("required_documents", form.required_documents.filter((d) => d !== doc));
  }

  function addFocusArea() {
    const trimmed = focusInput.trim();
    if (!trimmed || !form || form.key_focus_areas.includes(trimmed)) return;
    updateField("key_focus_areas", [...form.key_focus_areas, trimmed]);
    setFocusInput("");
  }

  function removeFocusArea(area: string) {
    if (!form) return;
    updateField("key_focus_areas", form.key_focus_areas.filter((a) => a !== area));
  }

  // Submits changes via PATCH /api/v1/grant-rounds/{id}.
  // Uses multipart/form-data when a cover image is attached (binary files can't go in JSON),
  // otherwise sends plain JSON.
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form || !round) return;

    setSaving(true);

    const token = localStorage.getItem("grantly_token");
    if (!token) { router.replace("/login"); return; }

    // Only include optional fields that have values
    const sharedOptional = {
      ...(form.short_description           && { short_description:           form.short_description }),
      ...(form.eligible_organisation_types && { eligible_organisation_types: form.eligible_organisation_types }),
      ...(form.geographic_restrictions     && { geographic_restrictions:     form.geographic_restrictions }),
      ...(form.assessment_criteria         && { assessment_criteria:         form.assessment_criteria }),
      ...(form.contact_email               && { contact_email:               form.contact_email }),
      ...(form.contact_phone               && { contact_phone:               form.contact_phone }),
      ...(form.opens_at                    && { opens_at:                    form.opens_at }),
      ...(form.closes_at                   && { closes_at:                   form.closes_at }),
      ...(form.assessment_period_start     && { assessment_period_start:     form.assessment_period_start }),
      ...(form.notification_date           && { notification_date:           form.notification_date }),
      ...(form.funding_release_date        && { funding_release_date:        form.funding_release_date }),
      ...(form.min_funding_amount          && { min_funding_amount:          parseFloat(form.min_funding_amount) }),
      ...(form.total_funding_pool          && { total_funding_pool:          parseFloat(form.total_funding_pool) }),
      ...(form.required_documents.length   && { required_documents:          form.required_documents }),
      ...(form.key_focus_areas.length      && { key_focus_areas:             form.key_focus_areas }),
    };

    let fetchOptions: RequestInit;

    if (coverImageFile) {
      const fd = new FormData();

      fd.append("title",                     form.title);
      fd.append("description",               form.description);
      fd.append("max_funding_amount",        form.max_funding_amount);
      fd.append("eligibility_criteria",      form.eligibility_criteria);
      // Only send status if it changed — avoids triggering side effects on every save
      if (form.status !== round.status) fd.append("status", form.status);
      // FormData booleans must be "1"/"0" — Laravel rejects the strings "true" and "false"
      fd.append("is_published",               form.is_published               ? "1" : "0");
      fd.append("is_featured",                form.is_featured                ? "1" : "0");
      fd.append("allow_multiple_applications", form.allow_multiple_applications ? "1" : "0");
      fd.append("max_applications_per_user", form.max_applications_per_user);

      Object.entries(sharedOptional).forEach(([key, val]) => {
        if (Array.isArray(val)) {
          (val as string[]).forEach((item) => fd.append(`${key}[]`, item));
        } else {
          fd.append(key, String(val));
        }
      });

      fd.append("cover_image", coverImageFile);

      // JSON.stringify the schema because FormData can't carry nested objects
      if (form.application_form_schema && form.application_form_schema.fields.length > 0) {
        fd.append("application_form_schema", JSON.stringify(form.application_form_schema));
      }

      // Laravel doesn't parse multipart bodies on PATCH — method spoofing sends it as POST
      // with _method=PATCH so Laravel routes it correctly while still parsing the file upload
      fd.append("_method", "PATCH");

      fetchOptions = {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      };
    } else {
      const body: Record<string, unknown> = {
        title:                     form.title,
        description:               form.description,
        max_funding_amount:        parseFloat(form.max_funding_amount),
        eligibility_criteria:      form.eligibility_criteria,
        ...(form.status !== round.status && { status: form.status }),
        is_published:              form.is_published,
        is_featured:               form.is_featured,
        allow_multiple_applications: form.allow_multiple_applications,
        max_applications_per_user: parseInt(form.max_applications_per_user, 10),
        ...sharedOptional,
        application_form_schema:
          form.application_form_schema && form.application_form_schema.fields.length > 0
            ? form.application_form_schema
            : null,
      };

      // Sending cover_image_url: "" tells the backend to remove the existing image
      if (currentCoverImageUrl === null) body.cover_image_url = "";

      fetchOptions = {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      };
    }

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/grant-rounds/${id}`,
        fetchOptions
      );
      const data = await res.json();

      if (!res.ok) {
        showToast(data.error?.message ?? "Something went wrong. Please try again.", "error");
        setSaving(false);
        return;
      }

      const saved: GrantRound = data.data ?? data;
      setRound(saved);
      setForm(roundToForm(saved));
      setCurrentCoverImageUrl(saved.cover_image_url);

      if (coverImagePreview) URL.revokeObjectURL(coverImagePreview);
      setCoverImageFile(null);
      setCoverImagePreview(null);

      showToast("Changes saved successfully.", "success");
    } catch {
      showToast("Could not reach the server. Please check your connection.", "error");
    } finally {
      setSaving(false);
    }
  }

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center py-32 gap-2 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Loading grant round…</span>
      </div>
    );
  }

  if (!form || !round) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 max-w-md">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error ?? "Something went wrong. Please try again."}</span>
        </div>
      </div>
    );
  }

  const statusBadge = getStatusBadge(form.status);
  // Newly selected file takes priority; falls back to the existing URL from the API
  const previewSrc = coverImagePreview ?? currentCoverImageUrl;

  return (
    <div className="max-w-5xl mx-auto">

      <div className="mb-8">
        <Link
          href="/admin/grant-rounds"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Grant Rounds
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 leading-tight">{round.title}</h1>
            <p className="text-sm text-gray-500 mt-1">Edit grant round details.</p>
          </div>

          {/* Status dropdown — Preline JS handles open/close via the hs-dropdown classes.
              The change is local until "Save Changes" is clicked. */}
          <div className="hs-dropdown [--auto-close:inside] relative inline-flex flex-shrink-0 mt-1">
            <button
              id="hs-status-dropdown"
              type="button"
              className="hs-dropdown-toggle inline-flex items-center gap-x-2 py-1.5 px-3 text-sm font-medium rounded-lg bg-white border border-gray-200 text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none disabled:opacity-50 disabled:pointer-events-none"
              aria-haspopup="menu"
              aria-expanded="false"
              aria-label="Change status"
            >
              <span className={`size-2 rounded-full ${statusBadge.dotClass}`} />
              {statusBadge.label}
              <svg className="hs-dropdown-open:rotate-180 size-4 transition-transform duration-150" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 9 6 6 6-6"/>
              </svg>
            </button>

            <div
              className="hs-dropdown-menu transition-[opacity,margin] duration-150 hs-dropdown-open:opacity-100 opacity-0 hidden min-w-44 bg-white border border-gray-200 shadow-md rounded-lg mt-2 z-10"
              role="menu"
              aria-orientation="vertical"
              aria-labelledby="hs-status-dropdown"
            >
              <div className="p-1 space-y-0.5">
                {(["draft", "open", "closed", "completed"] as const).map((s) => {
                  const badge = getStatusBadge(s);
                  const isSelected = form.status === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => updateField("status", s)}
                      className={`flex w-full items-center gap-x-3 py-2 px-3 rounded-lg text-sm text-gray-700 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 ${isSelected ? "font-semibold" : "font-normal"}`}
                    >
                      <span className={`inline-block h-2 w-2 rounded-full flex-shrink-0 ${badge.dotClass}`} />
                      {badge.label}
                      {isSelected && <Check className="ml-auto w-3.5 h-3.5 text-blue-600 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Basic Details */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-400" />
                <h2 className="text-base font-semibold text-gray-900">Basic Details</h2>
              </div>
            </div>

            <div className="p-6 space-y-5">

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={255}
                  value={form.title}
                  onChange={(e) => updateField("title", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Short Description
                  <span className="text-xs font-normal text-gray-400 ml-2">Shown on listing cards — max 200 characters</span>
                </label>
                <input
                  type="text"
                  maxLength={200}
                  value={form.short_description}
                  onChange={(e) => updateField("short_description", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <p className="text-xs text-gray-400 mt-1 text-right">{form.short_description.length}/200</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={6}
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Cover Image
                  <span className="text-xs font-normal text-gray-400 ml-2">JPG or PNG — max 5 MB</span>
                </label>

                {previewSrc ? (
                  <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previewSrc} alt="Cover image preview" className="w-full h-48 object-cover" />
                    <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-3 py-2 bg-black/50 backdrop-blur-sm">
                      <span className="text-xs text-white truncate max-w-[50%]">
                        {coverImageFile ? coverImageFile.name : "Current cover image"}
                      </span>
                      <div className="flex items-center gap-3">
                        <label className="text-xs text-white/80 hover:text-white transition-colors cursor-pointer">
                          Replace
                          <input type="file" accept="image/jpeg,image/png" className="sr-only" onChange={handleCoverImageChange} />
                        </label>
                        <button
                          type="button"
                          onClick={coverImageFile ? removeNewCoverImage : removeExistingCoverImage}
                          className="flex items-center gap-1 text-xs text-white/80 hover:text-white transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-2 w-full h-36 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/50 transition-colors cursor-pointer">
                    <ImagePlus className="w-7 h-7 text-gray-400" />
                    <div className="text-center">
                      <span className="text-sm font-medium text-blue-600">Click to upload</span>
                      <span className="text-sm text-gray-500"> or drag and drop</span>
                    </div>
                    <p className="text-xs text-gray-400">JPG or PNG up to 5 MB</p>
                    <input type="file" accept="image/jpeg,image/png" className="sr-only" onChange={handleCoverImageChange} />
                  </label>
                )}
              </div>

            </div>
          </div>

          {/* Funding */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-gray-400" />
                <h2 className="text-base font-semibold text-gray-900">Funding</h2>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Minimum Amount (AUD)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
                    <input type="number" min="0" step="1" value={form.min_funding_amount}
                      onChange={(e) => updateField("min_funding_amount", e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white pl-7 pr-4 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Maximum Amount (AUD) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
                    <input type="number" required min="0" step="1" value={form.max_funding_amount}
                      onChange={(e) => updateField("max_funding_amount", e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white pl-7 pr-4 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Total Funding Pool (AUD)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
                    <input type="number" min="0" step="1" value={form.total_funding_pool}
                      onChange={(e) => updateField("total_funding_pool", e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white pl-7 pr-4 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Eligibility */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-400" />
                <h2 className="text-base font-semibold text-gray-900">Eligibility</h2>
              </div>
            </div>

            <div className="p-6 space-y-5">

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Eligibility Criteria <span className="text-red-500">*</span>
                </label>
                <textarea required rows={4} value={form.eligibility_criteria}
                  onChange={(e) => updateField("eligibility_criteria", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Eligible Organisation Types</label>
                <input type="text" value={form.eligible_organisation_types}
                  onChange={(e) => updateField("eligible_organisation_types", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    Geographic Restrictions
                  </div>
                </label>
                <input type="text" value={form.geographic_restrictions}
                  onChange={(e) => updateField("geographic_restrictions", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>

              {/* Tag input — press Enter or + to add, × to remove */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Required Documents
                  <span className="text-xs font-normal text-gray-400 ml-2">Press Enter or + to add each one</span>
                </label>
                {form.required_documents.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {form.required_documents.map((doc) => (
                      <span key={doc} className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-medium text-blue-700">
                        {doc}
                        <button type="button" onClick={() => removeDocument(doc)} className="text-blue-400 hover:text-blue-600 transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input type="text" placeholder="e.g. Project Budget, Annual Report…" value={docInput}
                    onChange={(e) => setDocInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addDocument(); } }}
                    className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                  <button type="button" onClick={addDocument} className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                    <Plus className="w-4 h-4" /> Add
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Key Focus Areas
                  <span className="text-xs font-normal text-gray-400 ml-2">Topic tags for this round</span>
                </label>
                {form.key_focus_areas.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {form.key_focus_areas.map((area) => (
                      <span key={area} className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 border border-purple-200 px-3 py-1 text-xs font-medium text-purple-700">
                        {area}
                        <button type="button" onClick={() => removeFocusArea(area)} className="text-purple-400 hover:text-purple-600 transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input type="text" placeholder="e.g. Arts & Culture, Environment…" value={focusInput}
                    onChange={(e) => setFocusInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addFocusArea(); } }}
                    className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                  <button type="button" onClick={addFocusArea} className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                    <Plus className="w-4 h-4" /> Add
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Assessment Criteria</label>
                <textarea rows={3} value={form.assessment_criteria}
                  onChange={(e) => updateField("assessment_criteria", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none" />
              </div>

            </div>
          </div>

          {/* Custom application form questions */}
          <FormSchemaBuilder
            value={form.application_form_schema}
            onChange={(next) => updateField("application_form_schema", next)}
          />

          {/* Timeline */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <h2 className="text-base font-semibold text-gray-900">Timeline</h2>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Applications Open</label>
                  <input type="date" value={form.opens_at} onChange={(e) => updateField("opens_at", e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Applications Close</label>
                  <input type="date" value={form.closes_at} onChange={(e) => updateField("closes_at", e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Assessment Begins</label>
                  <input type="date" value={form.assessment_period_start} onChange={(e) => updateField("assessment_period_start", e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Notification Date</label>
                  <input type="date" value={form.notification_date} onChange={(e) => updateField("notification_date", e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Funding Release</label>
                  <input type="date" value={form.funding_release_date} onChange={(e) => updateField("funding_release_date", e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>

              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400" />
                <h2 className="text-base font-semibold text-gray-900">Contact</h2>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    <div className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-gray-400" />Contact Email</div>
                  </label>
                  <input type="email" maxLength={255} value={form.contact_email}
                    onChange={(e) => updateField("contact_email", e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    <div className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-gray-400" />Contact Phone</div>
                  </label>
                  <input type="tel" maxLength={20} value={form.contact_phone}
                    onChange={(e) => updateField("contact_phone", e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>

              </div>
            </div>
          </div>

          {/* Settings */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-gray-400" />
                <h2 className="text-base font-semibold text-gray-900">Settings</h2>
              </div>
            </div>

            <div className="p-6 divide-y divide-gray-50">

              <div className="flex items-start justify-between gap-4 py-4 first:pt-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">Published</p>
                  <p className="text-xs text-gray-500 mt-0.5">Makes this round visible to applicants on the browse page.</p>
                </div>
                <button type="button" role="switch" aria-checked={form.is_published}
                  onClick={() => updateField("is_published", !form.is_published)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${form.is_published ? "bg-blue-600" : "bg-gray-200"}`}>
                  <span className="sr-only">Published</span>
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${form.is_published ? "translate-x-5" : "translate-x-0"}`} />
                </button>
              </div>

              <div className="flex items-start justify-between gap-4 py-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">Featured</p>
                  <p className="text-xs text-gray-500 mt-0.5">Pins this round to the top of the applicant browse page.</p>
                </div>
                <button type="button" role="switch" aria-checked={form.is_featured}
                  onClick={() => updateField("is_featured", !form.is_featured)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${form.is_featured ? "bg-blue-600" : "bg-gray-200"}`}>
                  <span className="sr-only">Featured</span>
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${form.is_featured ? "translate-x-5" : "translate-x-0"}`} />
                </button>
              </div>

              <div className="flex items-start justify-between gap-4 py-4 last:pb-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">Allow Multiple Applications</p>
                  <p className="text-xs text-gray-500 mt-0.5">Lets a single account submit more than one application for this round.</p>
                </div>
                <button type="button" role="switch" aria-checked={form.allow_multiple_applications}
                  onClick={() => updateField("allow_multiple_applications", !form.allow_multiple_applications)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${form.allow_multiple_applications ? "bg-blue-600" : "bg-gray-200"}`}>
                  <span className="sr-only">Allow multiple applications</span>
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${form.allow_multiple_applications ? "translate-x-5" : "translate-x-0"}`} />
                </button>
              </div>

              {form.allow_multiple_applications && (
                <div className="py-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Max Applications Per User</label>
                  <input type="number" min="1" step="1" value={form.max_applications_per_user}
                    onChange={(e) => updateField("max_applications_per_user", e.target.value)}
                    className="w-28 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
              )}

            </div>
          </div>

          <div className="flex items-center justify-between pt-2 pb-8">
            <Link href="/admin/grant-rounds"
              className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              Cancel
            </Link>
            <button type="submit" disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
