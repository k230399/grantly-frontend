"use client";
// This page needs to be a client component because it contains a form with lots of
// interactive state: text inputs, toggles, tag inputs, a loading spinner, and error messages.
// None of that can run on the server — it all depends on what the user types and clicks.

import { useState } from "react";
import { useRouter } from "next/navigation";
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
} from "lucide-react";

// The shape of all the fields in the "create grant round" form.
// We use strings for number fields so plain <input type="number"> works naturally
// (empty string = blank field, rather than 0 showing up in every box by default).
interface GrantRoundFormData {
  title: string;                         // displayed name of the grant round
  short_description: string;             // brief summary shown on listing cards (max 200 chars)
  description: string;                   // full body text shown on the detail page
  min_funding_amount: string;            // minimum applicants can request, in AUD
  max_funding_amount: string;            // maximum applicants can request, in AUD — required
  total_funding_pool: string;            // total budget available across all applicants in this round
  eligibility_criteria: string;          // who is allowed to apply — required
  eligible_organisation_types: string;   // free-text description of which org types can apply
  geographic_restrictions: string;       // e.g. "Queensland and NSW only"
  required_documents: string[];          // list of document names applicants must upload
  key_focus_areas: string[];             // topic tags for this round (e.g. "Arts & Culture")
  assessment_criteria: string;           // how applications will be evaluated
  opens_at: string;                      // date when applications open (YYYY-MM-DD from date input)
  closes_at: string;                     // date when applications close
  assessment_period_start: string;       // date when the review panel begins
  notification_date: string;             // date when applicants hear the outcome
  funding_release_date: string;          // date when approved funds will be distributed
  contact_email: string;                 // email address applicants can write to with questions
  contact_phone: string;                 // phone number applicants can call
  is_published: boolean;                 // if true, round is visible to applicants on save
  is_featured: boolean;                  // if true, round is highlighted on the browse page
  allow_multiple_applications: boolean;  // if true, one account can submit more than one application
  max_applications_per_user: string;     // cap on how many applications one user can submit
}

// Blank starting values — every text field is empty, every toggle is off
const emptyForm: GrantRoundFormData = {
  title: "",
  short_description: "",
  description: "",
  min_funding_amount: "",
  max_funding_amount: "",
  total_funding_pool: "",
  eligibility_criteria: "",
  eligible_organisation_types: "",
  geographic_restrictions: "",
  required_documents: [],
  key_focus_areas: [],
  assessment_criteria: "",
  opens_at: "",
  closes_at: "",
  assessment_period_start: "",
  notification_date: "",
  funding_release_date: "",
  contact_email: "",
  contact_phone: "",
  is_published: false,
  is_featured: false,
  allow_multiple_applications: false,
  max_applications_per_user: "1",
};

// Client component: the "New Grant Round" form at /admin/grant-rounds/new.
// Admins fill this in to create a grant round. The backend always starts it in "draft" status
// regardless of is_published — publishing just controls applicant visibility.
export default function NewGrantRoundPage() {
  const router = useRouter();

  // The current values of every form field — starts empty
  const [form, setForm] = useState<GrantRoundFormData>(emptyForm);

  // true while the API request is in flight — shows a spinner and disables the submit button
  const [loading, setLoading] = useState(false);

  // An error message to show below the header — null means no error is displayed
  const [error, setError] = useState<string | null>(null);

  // The image file the admin has selected for the cover — null means no file chosen yet
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);

  // A temporary browser-local URL that lets us show a preview of the selected image.
  // Created with URL.createObjectURL() when a file is chosen; null when no file is selected.
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);

  // The text currently typed into the "Required Documents" tag input,
  // separate from the saved tags already in form.required_documents
  const [docInput, setDocInput] = useState("");

  // The text currently typed into the "Key Focus Areas" tag input
  const [focusInput, setFocusInput] = useState("");

  // Updates one field in the form state without touching the others.
  // TypeScript's "keyof" makes sure we can only name fields that actually exist in the interface.
  function updateField<K extends keyof GrantRoundFormData>(
    field: K,
    value: GrantRoundFormData[K]
  ) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // Called when the admin picks a file in the cover image input.
  // Validates the type (JPG/PNG only) and size (max 5 MB), then stores the file
  // and creates a temporary preview URL so the admin can see what they've chosen.
  function handleCoverImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type — only JPG and PNG are accepted by the API
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setError("Cover image must be a JPG or PNG file.");
      return;
    }

    // Check file size — max 5 MB (5 * 1024 * 1024 bytes)
    if (file.size > 5 * 1024 * 1024) {
      setError("Cover image must be smaller than 5 MB.");
      return;
    }

    setError(null); // clear any previous file-type error

    // Revoke the old preview URL to free up browser memory before creating a new one
    if (coverImagePreview) URL.revokeObjectURL(coverImagePreview);

    setCoverImageFile(file);
    // createObjectURL makes a temporary local URL (like blob:// ...) that the browser
    // can use as an <img> src — it only exists in this browser tab
    setCoverImagePreview(URL.createObjectURL(file));
  }

  // Clears the selected cover image and its preview
  function removeCoverImage() {
    if (coverImagePreview) URL.revokeObjectURL(coverImagePreview);
    setCoverImageFile(null);
    setCoverImagePreview(null);
  }

  // Adds the current docInput text as a new tag in required_documents.
  // Called when the user presses Enter in the field or clicks the + button.
  function addDocument() {
    const trimmed = docInput.trim();
    // Do nothing if the field is blank or the tag is already in the list
    if (!trimmed || form.required_documents.includes(trimmed)) return;
    updateField("required_documents", [...form.required_documents, trimmed]);
    setDocInput(""); // clear the input ready for the next entry
  }

  // Removes a tag from required_documents by filtering it out of the array
  function removeDocument(doc: string) {
    updateField(
      "required_documents",
      form.required_documents.filter((d) => d !== doc)
    );
  }

  // Adds the current focusInput text as a new tag in key_focus_areas
  function addFocusArea() {
    const trimmed = focusInput.trim();
    if (!trimmed || form.key_focus_areas.includes(trimmed)) return;
    updateField("key_focus_areas", [...form.key_focus_areas, trimmed]);
    setFocusInput("");
  }

  // Removes a tag from key_focus_areas
  function removeFocusArea(area: string) {
    updateField(
      "key_focus_areas",
      form.key_focus_areas.filter((a) => a !== area)
    );
  }

  // Handles form submission — POSTs to POST /api/v1/grant-rounds.
  //
  // Strategy: use plain JSON when no cover image is selected (simpler, avoids multipart
  // overhead, and matches the API spec which says "JSON body is fine when no file is attached").
  // Switch to multipart/form-data only when a cover image file has been chosen, because
  // binary files can't be encoded inside a JSON body.
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const token = localStorage.getItem("grantly_token");
    if (!token) { router.replace("/login"); return; }

    // Build the shared fields object — used in both the JSON and FormData paths below
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
      // ── Path A: multipart/form-data — used only when a cover image is attached ──
      // Binary files can't go in JSON, so we build a FormData object instead.
      // The browser sets the Content-Type header automatically (including the boundary string),
      // so we must NOT set it ourselves.
      const fd = new FormData();

      // Required fields
      fd.append("title",                form.title);
      fd.append("description",          form.description);
      fd.append("max_funding_amount",   form.max_funding_amount);
      fd.append("eligibility_criteria", form.eligibility_criteria);

      // Booleans must be sent as "1" or "0" in FormData — Laravel's boolean validation rule
      // accepts true/false/1/0/"1"/"0" but NOT the strings "true" or "false".
      fd.append("is_published",               form.is_published               ? "1" : "0");
      fd.append("is_featured",                form.is_featured                ? "1" : "0");
      fd.append("allow_multiple_applications", form.allow_multiple_applications ? "1" : "0");
      fd.append("max_applications_per_user",  form.max_applications_per_user);

      // Optional text/date/amount fields
      Object.entries(sharedOptional).forEach(([key, val]) => {
        // Arrays need one append() call per item, using the key[] convention Laravel expects
        if (Array.isArray(val)) {
          (val as string[]).forEach((item) => fd.append(`${key}[]`, item));
        } else {
          fd.append(key, String(val));
        }
      });

      fd.append("cover_image", coverImageFile);

      fetchOptions = {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }, // no Content-Type — browser sets it
        body: fd,
      };
    } else {
      // ── Path B: plain JSON — used when no cover image is attached ──
      // Simpler and avoids any multipart parsing issues on the backend.
      const body = {
        title:                     form.title,
        description:               form.description,
        max_funding_amount:        parseFloat(form.max_funding_amount),
        eligibility_criteria:      form.eligibility_criteria,
        is_published:              form.is_published,
        is_featured:               form.is_featured,
        allow_multiple_applications: form.allow_multiple_applications,
        max_applications_per_user: parseInt(form.max_applications_per_user, 10),
        ...sharedOptional,
      };

      fetchOptions = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      };
    }

    try {
      // POST to /api/v1/grant-rounds — creates the round (always starts as draft)
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/grant-rounds`,
        fetchOptions
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data.error?.message ?? "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      // Success — go to the grant rounds list
      router.push("/admin/grant-rounds");
    } catch {
      setError("Could not reach the server. Please check your connection and try again.");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto">

      {/* ── Page header ──────────────────────────────────────────────────
          Back link sits above the title so the admin can escape without scrolling. */}
      <div className="mb-8">

        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        <h1 className="text-2xl font-bold text-gray-900">New Grant Round</h1>
        <p className="text-sm text-gray-500 mt-1">
          Fill in the details below. The round will be saved as a draft — you can publish it when it&apos;s ready.
        </p>
      </div>

      {/* ── Error banner ─────────────────────────────────────────────────
          Only rendered when the API returns an error after the form is submitted.
          The condition `error &&` means nothing shows when error is null. */}
      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-6">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Main form ────────────────────────────────────────────────────
          All six sections live inside one <form> element so that pressing
          Enter or clicking the Save button submits everything at once. */}
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ════════════════════════════════════════════════════════════════
            SECTION 1 — Basic Details
            The required fields every grant round must have before it can be saved.
            ════════════════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">

          {/* Section header row */}
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-400" />
              <h2 className="text-base font-semibold text-gray-900">Basic Details</h2>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">Required information about this grant round.</p>
          </div>

          <div className="p-6 space-y-5">

            {/* Title — the public-facing name of this grant round (required) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={255}
                placeholder="e.g. Community Arts Fund 2025"
                value={form.title}
                onChange={(e) => updateField("title", e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Short description — one-liner shown on listing cards, max 200 characters */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Short Description
                <span className="text-xs font-normal text-gray-400 ml-2">Shown on listing cards — max 200 characters</span>
              </label>
              <input
                type="text"
                maxLength={200}
                placeholder="A brief summary of what this round funds"
                value={form.short_description}
                onChange={(e) => updateField("short_description", e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              {/* Live character counter so the admin can see how close they are to the limit */}
              <p className="text-xs text-gray-400 mt-1 text-right">{form.short_description.length}/200</p>
            </div>

            {/* Full description — the main body shown on the grant round detail page (required) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={6}
                placeholder="Describe the purpose of this grant round, who it's for, and what kinds of projects will be funded..."
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
              />
            </div>

            {/* Cover image — file upload, JPG or PNG, max 5 MB.
                The file is sent as multipart/form-data; Laravel uploads it to Supabase Storage
                and stores the resulting public URL as cover_image_url on the grant round. */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Cover Image
                <span className="text-xs font-normal text-gray-400 ml-2">JPG or PNG — max 5 MB</span>
              </label>

              {/* Show the image preview when a file has been selected */}
              {coverImagePreview ? (
                <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                  {/* Preview of the chosen image — constrained height so it doesn't take over the form */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={coverImagePreview}
                    alt="Cover image preview"
                    className="w-full h-48 object-cover"
                  />
                  {/* Overlay bar at the bottom showing the filename and a Remove button */}
                  <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-3 py-2 bg-black/50 backdrop-blur-sm">
                    <span className="text-xs text-white truncate max-w-[70%]">
                      {coverImageFile?.name}
                    </span>
                    <button
                      type="button"
                      onClick={removeCoverImage}
                      className="flex items-center gap-1 text-xs text-white/80 hover:text-white transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                /* Upload dropzone — shown when no file is selected yet */
                <label className="flex flex-col items-center justify-center gap-2 w-full h-36 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/50 transition-colors cursor-pointer">
                  <ImagePlus className="w-7 h-7 text-gray-400" />
                  <div className="text-center">
                    <span className="text-sm font-medium text-blue-600">Click to upload</span>
                    <span className="text-sm text-gray-500"> or drag and drop</span>
                  </div>
                  <p className="text-xs text-gray-400">JPG or PNG up to 5 MB</p>
                  {/* Hidden file input — clicking the label above triggers this */}
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    className="sr-only"
                    onChange={handleCoverImageChange}
                  />
                </label>
              )}
            </div>

          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════
            SECTION 2 — Funding
            How much applicants can request, and the total budget for the round.
            ════════════════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">

          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-gray-400" />
              <h2 className="text-base font-semibold text-gray-900">Funding</h2>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">How much each applicant can request and the total pool available.</p>
          </div>

          <div className="p-6">
            {/* Three amount fields side by side on wider screens, stacked on mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">

              {/* Minimum funding amount — the lowest amount an applicant can request */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Minimum Amount (AUD)
                </label>
                <div className="relative">
                  {/* $ symbol inset on the left side of the input */}
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    value={form.min_funding_amount}
                    onChange={(e) => updateField("min_funding_amount", e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white pl-7 pr-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              {/* Maximum funding amount — required; the most any one applicant can request */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Maximum Amount (AUD) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
                  <input
                    type="number"
                    required
                    min="0"
                    step="1"
                    placeholder="50,000"
                    value={form.max_funding_amount}
                    onChange={(e) => updateField("max_funding_amount", e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white pl-7 pr-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              {/* Total funding pool — the overall budget for the whole round */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Total Funding Pool (AUD)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="500,000"
                    value={form.total_funding_pool}
                    onChange={(e) => updateField("total_funding_pool", e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white pl-7 pr-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════
            SECTION 3 — Eligibility
            Who can apply, geographic scope, and what documents they need to submit.
            ════════════════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">

          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-400" />
              <h2 className="text-base font-semibold text-gray-900">Eligibility</h2>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">Who can apply and what they need to submit.</p>
          </div>

          <div className="p-6 space-y-5">

            {/* Eligibility criteria — the rules about who qualifies to apply (required) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Eligibility Criteria <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={4}
                placeholder="e.g. Open to incorporated not-for-profit organisations operating in Australia for at least 2 years..."
                value={form.eligibility_criteria}
                onChange={(e) => updateField("eligibility_criteria", e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
              />
            </div>

            {/* Eligible organisation types — optional free-text clarifying which org types can apply */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Eligible Organisation Types
              </label>
              <input
                type="text"
                placeholder="e.g. Not-for-profits, Charities, Local councils"
                value={form.eligible_organisation_types}
                onChange={(e) => updateField("eligible_organisation_types", e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Geographic restrictions — optional location constraints on who can apply */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-gray-400" />
                  Geographic Restrictions
                </div>
              </label>
              <input
                type="text"
                placeholder="e.g. Queensland and NSW only — leave blank for nationwide"
                value={form.geographic_restrictions}
                onChange={(e) => updateField("geographic_restrictions", e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Required documents — tag input.
                The admin types a document name and presses Enter or clicks + to add it as a tag.
                Each saved tag has an × button to remove it. */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Required Documents
                <span className="text-xs font-normal text-gray-400 ml-2">Press Enter or + to add each one</span>
              </label>

              {/* Show the saved tags (only rendered if at least one tag exists) */}
              {form.required_documents.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {form.required_documents.map((doc) => (
                    <span
                      key={doc}
                      className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-medium text-blue-700"
                    >
                      {doc}
                      {/* Remove this tag when the × is clicked */}
                      <button
                        type="button"
                        onClick={() => removeDocument(doc)}
                        className="text-blue-400 hover:text-blue-600 transition-colors"
                        aria-label={`Remove ${doc}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Text input + Add button sit side by side */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Project Budget, Annual Report, Constitution..."
                  value={docInput}
                  onChange={(e) => setDocInput(e.target.value)}
                  // Pressing Enter in this tag input adds the tag instead of submitting the form
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault(); // stop the Enter from submitting the whole form
                      addDocument();
                    }
                  }}
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <button
                  type="button"
                  onClick={addDocument}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-400 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              </div>
            </div>

            {/* Key focus areas — same tag input pattern as required documents, but purple chips */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Key Focus Areas
                <span className="text-xs font-normal text-gray-400 ml-2">Topic tags that describe this round</span>
              </label>

              {form.key_focus_areas.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {form.key_focus_areas.map((area) => (
                    <span
                      key={area}
                      className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 border border-purple-200 px-3 py-1 text-xs font-medium text-purple-700"
                    >
                      {area}
                      <button
                        type="button"
                        onClick={() => removeFocusArea(area)}
                        className="text-purple-400 hover:text-purple-600 transition-colors"
                        aria-label={`Remove ${area}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Arts & Culture, Environment, Youth..."
                  value={focusInput}
                  onChange={(e) => setFocusInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addFocusArea();
                    }
                  }}
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <button
                  type="button"
                  onClick={addFocusArea}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-400 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              </div>
            </div>

            {/* Assessment criteria — explains how applications will be scored (optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Assessment Criteria
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Applications will be assessed on community impact, project viability, and budget reasonableness..."
                value={form.assessment_criteria}
                onChange={(e) => updateField("assessment_criteria", e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
              />
            </div>

          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════
            SECTION 4 — Timeline
            Key dates for the grant round — all optional but recommended.
            ════════════════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">

          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <h2 className="text-base font-semibold text-gray-900">Timeline</h2>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">Key dates — all optional but recommended so applicants know what to expect.</p>
          </div>

          <div className="p-6">
            {/* Five date pickers in a responsive grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">

              {/* Opens at — when applications become available to applicants */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Applications Open
                </label>
                <input
                  type="date"
                  value={form.opens_at}
                  onChange={(e) => updateField("opens_at", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Closes at — the submission deadline */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Applications Close
                </label>
                <input
                  type="date"
                  value={form.closes_at}
                  onChange={(e) => updateField("closes_at", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Assessment period start — when the review panel begins evaluating */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Assessment Begins
                </label>
                <input
                  type="date"
                  value={form.assessment_period_start}
                  onChange={(e) => updateField("assessment_period_start", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Notification date — when applicants will hear the outcome */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Notification Date
                </label>
                <input
                  type="date"
                  value={form.notification_date}
                  onChange={(e) => updateField("notification_date", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Funding release date — when approved funds will be paid out */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Funding Release
                </label>
                <input
                  type="date"
                  value={form.funding_release_date}
                  onChange={(e) => updateField("funding_release_date", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════
            SECTION 5 — Contact
            How applicants can reach someone if they have questions.
            ════════════════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">

          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-400" />
              <h2 className="text-base font-semibold text-gray-900">Contact</h2>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">How applicants can reach you with questions about this round.</p>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

              {/* Contact email — shown on the grant round detail page */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                    Contact Email
                  </div>
                </label>
                <input
                  type="email"
                  maxLength={255}
                  placeholder="grants@example.gov.au"
                  value={form.contact_email}
                  onChange={(e) => updateField("contact_email", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Contact phone — optional phone number shown on the detail page */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    Contact Phone
                  </div>
                </label>
                <input
                  type="tel"
                  maxLength={20}
                  placeholder="+61 7 1234 5678"
                  value={form.contact_phone}
                  onChange={(e) => updateField("contact_phone", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════
            SECTION 6 — Settings
            Toggles that control visibility and application limits.
            ════════════════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">

          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-gray-400" />
              <h2 className="text-base font-semibold text-gray-900">Settings</h2>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">Control who can see this round and how many applications are allowed.</p>
          </div>

          <div className="p-6 divide-y divide-gray-50">

            {/* Publish Immediately toggle.
                When on, the round will be visible to applicants as soon as it's saved.
                When off (the default), it's saved as a draft that only admins can see. */}
            <div className="flex items-start justify-between gap-4 py-4 first:pt-0">
              <div>
                <p className="text-sm font-medium text-gray-900">Publish Immediately</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Make this round visible to applicants as soon as it&apos;s saved.
                  Leave off to save as a draft first.
                </p>
              </div>
              {/* Toggle switch — an accessible button styled to look like a sliding pill */}
              <button
                type="button"
                role="switch"
                aria-checked={form.is_published}
                onClick={() => updateField("is_published", !form.is_published)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  form.is_published ? "bg-blue-600" : "bg-gray-200"
                }`}
              >
                <span className="sr-only">Publish immediately</span>
                {/* The white dot that slides left (off) or right (on) */}
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                    form.is_published ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Featured Round toggle — highlights this round at the top of the browse page */}
            <div className="flex items-start justify-between gap-4 py-4">
              <div>
                <p className="text-sm font-medium text-gray-900">Featured Round</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Pin this round to the top of the applicant browse page to give it more visibility.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={form.is_featured}
                onClick={() => updateField("is_featured", !form.is_featured)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  form.is_featured ? "bg-blue-600" : "bg-gray-200"
                }`}
              >
                <span className="sr-only">Featured round</span>
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                    form.is_featured ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Allow Multiple Applications toggle.
                By default, one account can only submit one application per round.
                Turning this on reveals the cap field below. */}
            <div className="flex items-start justify-between gap-4 py-4 last:pb-0">
              <div>
                <p className="text-sm font-medium text-gray-900">Allow Multiple Applications</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  If enabled, a single applicant account can submit more than one application for this round.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={form.allow_multiple_applications}
                onClick={() => updateField("allow_multiple_applications", !form.allow_multiple_applications)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  form.allow_multiple_applications ? "bg-blue-600" : "bg-gray-200"
                }`}
              >
                <span className="sr-only">Allow multiple applications</span>
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                    form.allow_multiple_applications ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Max applications per user — only shown when the toggle above is on.
                This conditional stops the field appearing when it's not relevant. */}
            {form.allow_multiple_applications && (
              <div className="py-4 last:pb-0">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Max Applications Per User
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={form.max_applications_per_user}
                  onChange={(e) => updateField("max_applications_per_user", e.target.value)}
                  className="w-28 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <p className="text-xs text-gray-400 mt-1">The maximum number of applications a single user can submit.</p>
              </div>
            )}

          </div>
        </div>

        {/* ── Form action buttons ──────────────────────────────────────────
            Sit below the last section. Cancel on the left, Save on the right. */}
        <div className="flex items-center justify-between pt-2 pb-8">

          {/* Cancel — goes back to the dashboard without saving anything */}
          <Link
            href="/admin"
            className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </Link>

          {/* Primary submit button.
              Label switches to "Publish Round" when the publish toggle is on,
              and shows a spinner while the request is in flight. */}
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {/* Loader2 spins with CSS animation while loading is true */}
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading
              ? "Saving…"
              : form.is_published
              ? "Publish Round"
              : "Save as Draft"}
          </button>

        </div>
      </form>
    </div>
  );
}
