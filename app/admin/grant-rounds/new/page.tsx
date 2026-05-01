"use client";
// Needs client rendering for form state, localStorage token access, and file uploads.

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
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
import FormSchemaBuilder, {
  type ApplicationFormSchema,
} from "@/components/admin/FormSchemaBuilder";
import { useToast } from "@/contexts/ToastContext";

// All form fields stored as strings so <input> elements work naturally.
// Number fields like max_funding_amount are parsed to numbers only on submit.
interface GrantRoundFormData {
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
  application_form_schema: null,
};

// New Grant Round form — /admin/grant-rounds/new
export default function NewGrantRoundPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [form, setForm] = useState<GrantRoundFormData>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const [docInput, setDocInput] = useState("");
  const [focusInput, setFocusInput] = useState("");

  function updateField<K extends keyof GrantRoundFormData>(field: K, value: GrantRoundFormData[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
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

    // Revoke the old blob URL to free browser memory before creating a new one
    if (coverImagePreview) URL.revokeObjectURL(coverImagePreview);
    setCoverImageFile(file);
    // createObjectURL makes a temporary local URL the browser can use as an <img> src
    setCoverImagePreview(URL.createObjectURL(file));
  }

  function removeCoverImage() {
    if (coverImagePreview) URL.revokeObjectURL(coverImagePreview);
    setCoverImageFile(null);
    setCoverImagePreview(null);
  }

  function addDocument() {
    const trimmed = docInput.trim();
    if (!trimmed || form.required_documents.includes(trimmed)) return;
    updateField("required_documents", [...form.required_documents, trimmed]);
    setDocInput("");
  }

  function removeDocument(doc: string) {
    updateField("required_documents", form.required_documents.filter((d) => d !== doc));
  }

  function addFocusArea() {
    const trimmed = focusInput.trim();
    if (!trimmed || form.key_focus_areas.includes(trimmed)) return;
    updateField("key_focus_areas", [...form.key_focus_areas, trimmed]);
    setFocusInput("");
  }

  function removeFocusArea(area: string) {
    updateField("key_focus_areas", form.key_focus_areas.filter((a) => a !== area));
  }

  // Submits the form via POST /api/v1/grant-rounds.
  // Uses multipart/form-data when a cover image is attached (binary files can't go in JSON),
  // otherwise sends plain JSON which is simpler and avoids multipart parsing overhead.
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const token = localStorage.getItem("grantly_token");
    if (!token) { router.replace("/login"); return; }

    // Spread only the optional fields that have values — omitting empty ones keeps the payload clean
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

      fd.append("title",                form.title);
      fd.append("description",          form.description);
      fd.append("max_funding_amount",   form.max_funding_amount);
      fd.append("eligibility_criteria", form.eligibility_criteria);

      // FormData booleans must be "1"/"0" — Laravel rejects the strings "true" and "false"
      fd.append("is_published",               form.is_published               ? "1" : "0");
      fd.append("is_featured",                form.is_featured                ? "1" : "0");
      fd.append("allow_multiple_applications", form.allow_multiple_applications ? "1" : "0");
      fd.append("max_applications_per_user",  form.max_applications_per_user);

      Object.entries(sharedOptional).forEach(([key, val]) => {
        // Arrays need one append per item using the key[] convention Laravel expects
        if (Array.isArray(val)) {
          (val as string[]).forEach((item) => fd.append(`${key}[]`, item));
        } else {
          fd.append(key, String(val));
        }
      });

      fd.append("cover_image", coverImageFile);

      // JSON.stringify the schema because FormData can't carry nested objects.
      // The backend's prepareForValidation() decodes it before validation runs.
      if (form.application_form_schema && form.application_form_schema.fields.length > 0) {
        fd.append("application_form_schema", JSON.stringify(form.application_form_schema));
      }

      fetchOptions = {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }, // no Content-Type — browser sets it with the multipart boundary
        body: fd,
      };
    } else {
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
        ...(form.application_form_schema && form.application_form_schema.fields.length > 0
          ? { application_form_schema: form.application_form_schema }
          : {}),
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
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/grant-rounds`,
        fetchOptions
      );
      const data = await res.json();

      if (!res.ok) {
        showToast(data.error?.message ?? "Something went wrong. Please try again.", "error");
        setLoading(false);
        return;
      }

      router.push("/admin/grant-rounds");
    } catch {
      showToast("Could not reach the server. Please check your connection and try again.", "error");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto">

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

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Basic Details */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-400" />
              <h2 className="text-base font-semibold text-gray-900">Basic Details</h2>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">Required information about this grant round.</p>
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
                placeholder="e.g. Community Arts Fund 2025"
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
                placeholder="A brief summary of what this round funds"
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
                placeholder="Describe the purpose of this grant round, who it's for, and what kinds of projects will be funded..."
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

              {coverImagePreview ? (
                <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={coverImagePreview}
                    alt="Cover image preview"
                    className="w-full h-48 object-cover"
                  />
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
                <label className="flex flex-col items-center justify-center gap-2 w-full h-36 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/50 transition-colors cursor-pointer">
                  <ImagePlus className="w-7 h-7 text-gray-400" />
                  <div className="text-center">
                    <span className="text-sm font-medium text-blue-600">Click to upload</span>
                    <span className="text-sm text-gray-500"> or drag and drop</span>
                  </div>
                  <p className="text-xs text-gray-400">JPG or PNG up to 5 MB</p>
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

        {/* Funding */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-gray-400" />
              <h2 className="text-base font-semibold text-gray-900">Funding</h2>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">How much each applicant can request and the total pool available.</p>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Minimum Amount (AUD)
                </label>
                <div className="relative">
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

        {/* Eligibility */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-400" />
              <h2 className="text-base font-semibold text-gray-900">Eligibility</h2>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">Who can apply and what they need to submit.</p>
          </div>

          <div className="p-6 space-y-5">

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

            {/* Tag input — press Enter or click + to add, × to remove */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Required Documents
                <span className="text-xs font-normal text-gray-400 ml-2">Press Enter or + to add each one</span>
              </label>
              {form.required_documents.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {form.required_documents.map((doc) => (
                    <span
                      key={doc}
                      className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-medium text-blue-700"
                    >
                      {doc}
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
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Project Budget, Annual Report, Constitution..."
                  value={docInput}
                  onChange={(e) => setDocInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addDocument(); } }}
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
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addFocusArea(); } }}
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
            <p className="text-xs text-gray-400 mt-0.5">Key dates — all optional but recommended so applicants know what to expect.</p>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Applications Open</label>
                <input
                  type="date"
                  value={form.opens_at}
                  onChange={(e) => updateField("opens_at", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Applications Close</label>
                <input
                  type="date"
                  value={form.closes_at}
                  onChange={(e) => updateField("closes_at", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Assessment Begins</label>
                <input
                  type="date"
                  value={form.assessment_period_start}
                  onChange={(e) => updateField("assessment_period_start", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Notification Date</label>
                <input
                  type="date"
                  value={form.notification_date}
                  onChange={(e) => updateField("notification_date", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Funding Release</label>
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

        {/* Contact */}
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

        {/* Settings */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-gray-400" />
              <h2 className="text-base font-semibold text-gray-900">Settings</h2>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">Control who can see this round and how many applications are allowed.</p>
          </div>

          <div className="p-6 divide-y divide-gray-50">

            <div className="flex items-start justify-between gap-4 py-4 first:pt-0">
              <div>
                <p className="text-sm font-medium text-gray-900">Publish Immediately</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Make this round visible to applicants as soon as it&apos;s saved.
                  Leave off to save as a draft first.
                </p>
              </div>
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
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                    form.is_published ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

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

        <div className="flex items-center justify-between pt-2 pb-8">
          <Link
            href="/admin"
            className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
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
