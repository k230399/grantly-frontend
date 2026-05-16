"use client";
// Client component: needs localStorage for the JWT and useState for controlled form state.

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle,
  DollarSign,
  FileText,
  ListChecks,
  Hash,
  Send,
  Save,
  CalendarDays,
} from "lucide-react";
import FormRenderer, { type FormData as CustomFormData } from "@/app/components/FormRenderer";
import Chatbot from "@/app/components/Chatbot";
import type { ApplicationFormSchema } from "@/components/admin/FormSchemaBuilder";
import { useToast } from "@/contexts/ToastContext";

// ── Types matching the API responses ─────────────────────────────────────────

interface GrantRoundSummary {
  id: string;
  title: string;
  status: "draft" | "open" | "closed" | "completed";
  max_funding_amount?: number;
  required_documents?: string[] | null;
  application_form_schema: ApplicationFormSchema | null;
  closes_at?: string | null;
}

interface Application {
  id: string;
  reference_number: string;
  applicant_id: string;
  grant_round_id: string;
  project_name: string;
  project_description: string;
  funding_requested: number;
  total_project_budget: number;
  declaration_accepted: boolean;
  form_data: CustomFormData | null;
  status: "draft" | "submitted" | "under_review" | "approved" | "rejected";
  submitted_at: string | null;
  grant_round: GrantRoundSummary;
  created_at: string;
  updated_at: string;
}

// Numeric fields are stored as strings so <input> behaves naturally; parsed on save.
interface ApplicationFormState {
  project_name: string;
  project_description: string;
  funding_requested: string;
  total_project_budget: string;
  declaration_accepted: boolean;
  form_data: CustomFormData;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

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

function statusBadge(status: Application["status"]): { label: string; classes: string } {
  switch (status) {
    case "draft":         return { label: "Draft",          classes: "bg-amber-100 text-amber-800" };
    case "submitted":     return { label: "Submitted",      classes: "bg-blue-100 text-blue-800" };
    case "under_review":  return { label: "Under Review",   classes: "bg-indigo-100 text-indigo-800" };
    case "approved":      return { label: "Approved",       classes: "bg-green-100 text-green-800" };
    case "rejected":      return { label: "Unsuccessful",   classes: "bg-red-100 text-red-800" };
  }
}

// Distinctive placeholder strings posted by /grants/[id] when starting a draft.
// The backend's create validation rejects empty strings for required text fields,
// so we send these and clear them on hydrate so the applicant sees empty inputs.
const DRAFT_NAME_PLACEHOLDER = "Untitled application";
const DRAFT_DESCRIPTION_PLACEHOLDER = "Draft — please update before submitting.";

function hydrateForm(app: Application): ApplicationFormState {
  return {
    project_name: app.project_name === DRAFT_NAME_PLACEHOLDER ? "" : (app.project_name ?? ""),
    project_description:
      app.project_description === DRAFT_DESCRIPTION_PLACEHOLDER ? "" : (app.project_description ?? ""),
    funding_requested: app.funding_requested ? String(app.funding_requested) : "",
    total_project_budget: app.total_project_budget ? String(app.total_project_budget) : "",
    declaration_accepted: !!app.declaration_accepted,
    form_data: app.form_data ?? {},
  };
}

// ── Page component ───────────────────────────────────────────────────────────

export default function ApplyFormPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();

  const id = params.id as string;

  const [application, setApplication] = useState<Application | null>(null);
  const [form, setForm] = useState<ApplicationFormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Loads the application on mount. 403/404 fall through to the error state, which links back to the dashboard.
  useEffect(() => {
    async function load() {
      const token = localStorage.getItem("grantly_token");
      if (!token) {
        router.replace("/login");
        return;
      }

      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/applications/${id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();

        if (!res.ok) {
          setError(data.error?.message ?? "Failed to load this application.");
          return;
        }

        const app = (data.data ?? data) as Application;
        setApplication(app);
        setForm(hydrateForm(app));
      } catch {
        setError("Could not reach the server. Please check your connection.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id, router]);

  function updateField<K extends keyof ApplicationFormState>(field: K, value: ApplicationFormState[K]) {
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  }

  function buildPayload() {
    if (!form) return {};
    return {
      project_name: form.project_name,
      project_description: form.project_description,
      funding_requested: form.funding_requested ? parseFloat(form.funding_requested) : 0,
      total_project_budget: form.total_project_budget ? parseFloat(form.total_project_budget) : 0,
      declaration_accepted: form.declaration_accepted,
      form_data: form.form_data,
    };
  }

  async function handleSaveDraft() {
    if (!form || !application) return;
    setSaving(true);

    const token = localStorage.getItem("grantly_token");
    if (!token) { router.replace("/login"); return; }

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/applications/${id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(buildPayload()),
        }
      );
      const data = await res.json();

      if (!res.ok) {
        showToast(data.error?.message ?? "Could not save your changes.", "error");
        return;
      }

      const next = (data.data ?? data) as Application;
      setApplication(next);
      setForm(hydrateForm(next));
      showToast("Draft saved.", "success");
    } catch {
      showToast("Could not reach the server. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit() {
    if (!form || !application) return;

    // Basic client-side checks — the backend re-validates and may return more.
    const missing: string[] = [];
    if (!form.project_name.trim()) missing.push("project name");
    if (!form.project_description.trim()) missing.push("project description");
    if (!form.funding_requested || parseFloat(form.funding_requested) <= 0) missing.push("funding requested");
    if (!form.total_project_budget || parseFloat(form.total_project_budget) <= 0) missing.push("total project budget");
    if (!form.declaration_accepted) missing.push("declaration");

    if (missing.length > 0) {
      showToast(`Please complete: ${missing.join(", ")}.`, "error");
      return;
    }

    setSubmitting(true);
    const token = localStorage.getItem("grantly_token");
    if (!token) { router.replace("/login"); return; }

    try {
      // PATCH and submit are separate API actions, so save the latest values before calling submit.
      const patchRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/applications/${id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(buildPayload()),
        }
      );
      if (!patchRes.ok) {
        const data = await patchRes.json();
        showToast(data.error?.message ?? "Could not save before submitting.", "error");
        return;
      }

      const submitRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/applications/${id}/submit`,
        { method: "POST", headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await submitRes.json();

      if (!submitRes.ok) {
        showToast(data.error?.message ?? "Could not submit your application.", "error");
        return;
      }

      const next = (data.data ?? data) as Application;
      setApplication(next);
      setForm(hydrateForm(next));
      showToast("Application submitted.", "success");
    } catch {
      showToast("Could not reach the server. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render states ──

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center gap-2 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading your application…</span>
        </div>
      </div>
    );
  }

  if (error || !application || !form) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 max-w-md">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error ?? "Application not found."}</span>
        </div>
        <Link href="/dashboard" className="mt-4 text-sm text-blue-600 hover:underline inline-flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to dashboard
        </Link>
      </div>
    );
  }

  const isDraft = application.status === "draft";
  const readOnly = !isDraft;
  const badge = statusBadge(application.status);
  const schema = application.grant_round.application_form_schema;
  const requiredDocs = application.grant_round.required_documents ?? [];

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to dashboard
          </Link>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badge.classes}`}>
            {badge.label}
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Page title — round title + reference */}
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
            {application.grant_round.title}
          </p>
          <h1 className="text-2xl font-bold text-gray-900">
            {readOnly ? "Your application" : "Application form"}
          </h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1">
              <Hash className="w-3.5 h-3.5" />
              {application.reference_number}
            </span>
            {application.submitted_at && (
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="w-3.5 h-3.5" />
                Submitted {formatDate(application.submitted_at)}
              </span>
            )}
          </div>
        </div>

        {/* Read-only banner */}
        {readOnly && (
          <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>
              This application has been submitted and can no longer be edited.
            </span>
          </div>
        )}

        {/* Project Details */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-1 flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-400" />
            Project Details
          </h2>
          <p className="text-xs text-gray-400 mb-5">
            Tell us about the project you want funded.
          </p>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Project name <span className="text-red-500">*</span>
              </label>
              {readOnly ? (
                <p className="text-sm text-gray-800">{application.project_name}</p>
              ) : (
                <input
                  type="text"
                  value={form.project_name}
                  onChange={(e) => updateField("project_name", e.target.value)}
                  placeholder="e.g. Riverside community garden expansion"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Project description <span className="text-red-500">*</span>
              </label>
              {readOnly ? (
                <p className="text-sm text-gray-800 whitespace-pre-wrap">
                  {application.project_description || "—"}
                </p>
              ) : (
                <textarea
                  value={form.project_description}
                  onChange={(e) => updateField("project_description", e.target.value)}
                  rows={6}
                  placeholder="Describe what the project will achieve, who it benefits, and how the funding will be used."
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              )}
            </div>
          </div>
        </section>

        {/* Funding */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-1 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-gray-400" />
            Funding
          </h2>
          {application.grant_round.max_funding_amount && (
            <p className="text-xs text-gray-400 mb-5">
              This grant round funds up to {formatCurrency(application.grant_round.max_funding_amount)} per application.
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Funding requested (AUD) <span className="text-red-500">*</span>
              </label>
              {readOnly ? (
                <p className="text-sm text-gray-800">{formatCurrency(application.funding_requested)}</p>
              ) : (
                <input
                  type="number"
                  min={0}
                  value={form.funding_requested}
                  onChange={(e) => updateField("funding_requested", e.target.value)}
                  placeholder="0"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Total project budget (AUD) <span className="text-red-500">*</span>
              </label>
              {readOnly ? (
                <p className="text-sm text-gray-800">{formatCurrency(application.total_project_budget)}</p>
              ) : (
                <input
                  type="number"
                  min={0}
                  value={form.total_project_budget}
                  onChange={(e) => updateField("total_project_budget", e.target.value)}
                  placeholder="0"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              )}
              {!readOnly && (
                <p className="text-xs text-gray-400 mt-1">Must be at least the amount you&apos;re requesting.</p>
              )}
            </div>
          </div>
        </section>

        {/* Custom questions — only rendered when the round defines a schema */}
        {schema && schema.fields.length > 0 && (
          <section className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-1 flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-gray-400" />
              Additional Questions
            </h2>
            <p className="text-xs text-gray-400 mb-5">
              Specific to this grant round.
            </p>
            <FormRenderer
              schema={schema}
              value={form.form_data}
              onChange={(next) => updateField("form_data", next)}
              readOnly={readOnly}
            />
          </section>
        )}

        {/* Required documents — read-only list with a "coming soon" notice */}
        {requiredDocs.length > 0 && (
          <section className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-1 flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-400" />
              Required Documents
            </h2>
            <p className="text-xs text-gray-400 mb-4">
              You&apos;ll be able to upload these in the next release.
            </p>
            <ul className="space-y-2.5">
              {requiredDocs.map((doc) => (
                <li key={doc} className="flex items-center gap-3 text-sm text-gray-700">
                  <CheckCircle className="w-4 h-4 text-gray-300 flex-shrink-0" />
                  {doc}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Declaration */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-1">Declaration</h2>
          <p className="text-xs text-gray-400 mb-4">
            Required before you can submit.
          </p>

          {readOnly ? (
            <div className="flex items-start gap-2.5 text-sm text-gray-700">
              {application.declaration_accepted ? (
                <>
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>You confirmed that the information provided is accurate and complete.</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <span>Declaration was not accepted.</span>
                </>
              )}
            </div>
          ) : (
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.declaration_accepted}
                onChange={(e) => updateField("declaration_accepted", e.target.checked)}
                className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                I confirm that the information provided in this application is accurate and complete to the best of my knowledge.
              </span>
            </label>
          )}
        </section>

        {/* AI assistant — only available while the application is editable */}
        {!readOnly && <Chatbot contextType="apply" applicationId={application.id} />}

        {/* Action buttons — only when editable */}
        {!readOnly && (
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={saving || submitting}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Draft
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving || submitting}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Submit Application
            </button>
          </div>
        )}

      </main>
    </div>
  );
}
