"use client";
// Client component: reads the JWT from localStorage to authenticate the API calls
// and manages async loading state for the application + status history fetches.

// Application detail page — accessible at /admin/applications/[id].
// Read-only view of a single application: project details, applicant, grant round,
// custom form answers, documents, and status-change audit trail.
// Action buttons (approve / under review / reject) are placeholder-only for now —
// the wire-up to PATCH /applications/{id}/status comes in a follow-up step.

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  FileText,
  Mail,
  Calendar,
  DollarSign,
  Clock,
  Download,
} from "lucide-react";
import FormRenderer, { type FormData } from "@/app/components/FormRenderer";
import type { ApplicationFormSchema } from "@/components/admin/FormSchemaBuilder";

// One uploaded supporting document attached to the application.
interface ApplicationDocument {
  id: string;
  file_name: string;
  file_type: string;
  storage_path: string;
  document_type: string | null;
  file_size_bytes: number;
  uploaded_at: string;
}

// One row in the status-change audit trail.
interface StatusHistoryEntry {
  id: string;
  previous_status: string | null;
  new_status: string;
  notes: string | null;
  changed_by: string | null;
  changed_at: string;
}

// Full application shape returned by GET /api/v1/applications/{id}.
// Includes the relations that the admin detail view needs to render.
interface ApplicationDetail {
  id: string;
  reference_number: string;
  project_name: string;
  project_description: string;
  funding_requested: number;
  total_project_budget: number;
  declaration_accepted: boolean;
  form_data: FormData | null;
  status: "draft" | "submitted" | "under_review" | "approved" | "rejected";
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
  grant_round: {
    id: string;
    title: string;
    status: string;
    application_form_schema: ApplicationFormSchema | null;
  };
  applicant: {
    id: string;
    full_name: string;
    email: string;
    organisation_name?: string | null;
  } | null;
  documents?: ApplicationDocument[];
}

function getStatusBadge(status: ApplicationDetail["status"]): { className: string; label: string } {
  switch (status) {
    case "draft":        return { className: "bg-gray-100 text-gray-600",   label: "Draft" };
    case "submitted":    return { className: "bg-blue-100 text-blue-700",   label: "Submitted" };
    case "under_review": return { className: "bg-amber-100 text-amber-700", label: "Under Review" };
    case "approved":     return { className: "bg-green-100 text-green-700", label: "Approved" };
    case "rejected":     return { className: "bg-red-100 text-red-600",     label: "Rejected" };
  }
}

// Used by the status history timeline to colour the dot for each transition.
function getStatusDotColour(status: string): string {
  switch (status) {
    case "draft":        return "bg-gray-400";
    case "submitted":    return "bg-blue-500";
    case "under_review": return "bg-amber-500";
    case "approved":     return "bg-green-500";
    case "rejected":     return "bg-red-500";
    default:             return "bg-gray-400";
  }
}

// Maps a status value (incl. the unknown ones that might appear in older history rows)
// to a human-readable label.
function statusLabel(status: string): string {
  switch (status) {
    case "draft":        return "Draft";
    case "submitted":    return "Submitted";
    case "under_review": return "Under Review";
    case "approved":     return "Approved";
    case "rejected":     return "Rejected";
    default:             return status;
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Converts file size in bytes to a short human-readable string.
// e.g. 1024 → "1 KB", 1500000 → "1.4 MB"
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ApplicationDetailPage() {
  const params = useParams<{ id: string }>();
  const applicationId = params.id;

  const [application, setApplication] = useState<ApplicationDetail | null>(null);
  const [history, setHistory] = useState<StatusHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetches the application detail and status history in parallel on mount and
  // whenever the URL id changes (rare, but covers client-side nav between siblings).
  useEffect(() => {
    async function fetchApplication() {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("grantly_token");
      if (!token) return;

      const base = process.env.NEXT_PUBLIC_API_BASE_URL;
      const headers = { Authorization: `Bearer ${token}` };

      try {
        const [detailRes, historyRes] = await Promise.all([
          fetch(`${base}/api/v1/applications/${applicationId}`, { headers }),
          fetch(`${base}/api/v1/applications/${applicationId}/status-history`, { headers }),
        ]);

        const detailData = await detailRes.json();

        if (!detailRes.ok) {
          setError(detailData.error?.message ?? "Failed to load application.");
          setLoading(false);
          return;
        }

        setApplication(detailData.data ?? detailData);

        // History is non-critical — if it fails we still show the detail.
        if (historyRes.ok) {
          const historyData = await historyRes.json();
          setHistory(historyData.data ?? []);
        }
      } catch {
        setError("Could not reach the server. Please check your connection.");
      } finally {
        setLoading(false);
      }
    }

    fetchApplication();
  }, [applicationId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 gap-2 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Loading application…</span>
      </div>
    );
  }

  if (error || !application) {
    return (
      <div>
        <Link
          href="/admin/applications"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to applications
        </Link>

        <div className="flex items-center justify-center py-20">
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 max-w-md">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error ?? "Application not found."}</span>
          </div>
        </div>
      </div>
    );
  }

  const badge = getStatusBadge(application.status);
  const schema = application.grant_round.application_form_schema;
  const hasCustomAnswers =
    schema && schema.fields.length > 0 && application.form_data;
  // The API may omit `documents` when there are none — fall back to an empty list.
  const documents = application.documents ?? [];

  return (
    <div>

      {/* ── Back link ─────────────────────────────────────────────── */}
      <Link
        href="/admin/applications"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to applications
      </Link>

      {/* ── Page header: project name, reference, status, action buttons ── */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
        <div className="min-w-0">
          <p className="text-xs font-mono text-gray-400 mb-1">
            {application.reference_number}
          </p>
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">
            {application.project_name}
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}
            >
              {badge.label}
            </span>
            <span className="text-xs text-gray-400">
              Submitted {formatDate(application.submitted_at)}
            </span>
          </div>
        </div>

        {/* Placeholder action buttons — wire-up comes in a follow-up step. */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-500 cursor-not-allowed"
            title="Coming soon"
          >
            <Eye className="w-4 h-4" />
            Mark Under Review
          </button>
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3.5 py-2 text-sm font-medium text-red-600 cursor-not-allowed opacity-60"
            title="Coming soon"
          >
            <XCircle className="w-4 h-4" />
            Reject
          </button>
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-3.5 py-2 text-sm font-medium text-white cursor-not-allowed opacity-60"
            title="Coming soon"
          >
            <CheckCircle className="w-4 h-4" />
            Approve
          </button>
        </div>
      </div>

      {/* ── Two-column layout: main content (2/3) + sidebar (1/3) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Main column ────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Project details card */}
          <Card title="Project Details">
            <DetailField label="Project Name" value={application.project_name} />
            <DetailField
              label="Description"
              value={application.project_description}
              multiline
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DetailField
                label="Funding Requested"
                value={formatCurrency(application.funding_requested)}
              />
              <DetailField
                label="Total Project Budget"
                value={formatCurrency(application.total_project_budget)}
              />
            </div>
            <DetailField
              label="Declaration"
              value={application.declaration_accepted ? "Accepted" : "Not accepted"}
            />
          </Card>

          {/* Custom form answers — only shown when the round has a custom schema */}
          {hasCustomAnswers && (
            <Card title="Application Questions">
              <FormRenderer
                schema={schema}
                value={application.form_data ?? {}}
                onChange={() => { /* read-only */ }}
                readOnly
              />
            </Card>
          )}

          {/* Documents list */}
          <Card
            title="Documents"
            subtitle={`${documents.length} file${documents.length !== 1 ? "s" : ""} uploaded`}
          >
            {documents.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No documents uploaded.</p>
            ) : (
              <ul className="divide-y divide-gray-100 -mx-5">
                {documents.map((doc) => (
                  <li
                    key={doc.id}
                    className="flex items-center justify-between gap-3 px-5 py-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4 text-gray-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {doc.file_name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {doc.document_type ? `${doc.document_type} · ` : ""}
                          {formatFileSize(doc.file_size_bytes)} ·{" "}
                          {formatDate(doc.uploaded_at)}
                        </p>
                      </div>
                    </div>
                    {/* Placeholder — signed-URL download lands when the documents API is wired. */}
                    <button
                      type="button"
                      disabled
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-400 cursor-not-allowed"
                      title="Coming soon"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

        </div>

        {/* ── Sidebar ──────────────────────────────────────────────── */}
        <div className="space-y-5">

          {/* Applicant card */}
          <Card title="Applicant">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-medium text-gray-600">
                  {(application.applicant?.full_name ?? "?")
                    .split(" ")
                    .map((s) => s[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {application.applicant?.full_name ?? "—"}
                </p>
                {application.applicant?.organisation_name && (
                  <p className="text-xs text-gray-500 truncate">
                    {application.applicant.organisation_name}
                  </p>
                )}
              </div>
            </div>
            {application.applicant?.email && (
              <a
                href={`mailto:${application.applicant.email}`}
                className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-700 transition-colors"
              >
                <Mail className="w-3.5 h-3.5" />
                {application.applicant.email}
              </a>
            )}
          </Card>

          {/* Grant round card */}
          <Card title="Grant Round">
            <Link
              href={`/admin/grant-rounds/${application.grant_round.id}/edit`}
              className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors block leading-snug"
            >
              {application.grant_round.title}
            </Link>
            <p className="text-xs text-gray-400 capitalize">
              {application.grant_round.status.replace("_", " ")}
            </p>
          </Card>

          {/* Application metadata card */}
          <Card title="Application Info">
            <MetaRow
              icon={<DollarSign className="w-3.5 h-3.5" />}
              label="Requested"
              value={formatCurrency(application.funding_requested)}
            />
            <MetaRow
              icon={<Calendar className="w-3.5 h-3.5" />}
              label="Submitted"
              value={formatDateTime(application.submitted_at)}
            />
            <MetaRow
              icon={<Clock className="w-3.5 h-3.5" />}
              label="Last updated"
              value={formatDateTime(application.updated_at)}
            />
          </Card>

          {/* Status history timeline */}
          <Card title="Status History">
            {history.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No status changes yet.</p>
            ) : (
              <ol className="relative border-l border-gray-200 ml-1.5 space-y-4">
                {history.map((entry) => (
                  <li key={entry.id} className="ml-4">
                    <span
                      className={`absolute -left-[5px] mt-1 w-2.5 h-2.5 rounded-full ring-2 ring-white ${getStatusDotColour(entry.new_status)}`}
                    />
                    <p className="text-sm text-gray-900">
                      {entry.previous_status ? (
                        <>
                          <span className="text-gray-500">{statusLabel(entry.previous_status)}</span>
                          <span className="text-gray-400 mx-1.5">→</span>
                          <span className="font-medium">{statusLabel(entry.new_status)}</span>
                        </>
                      ) : (
                        <span className="font-medium">{statusLabel(entry.new_status)}</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatDateTime(entry.changed_at)}
                    </p>
                    {entry.notes && (
                      <p className="text-xs text-gray-600 mt-1.5 bg-gray-50 rounded p-2 whitespace-pre-wrap">
                        {entry.notes}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </Card>

        </div>

      </div>
    </div>
  );
}

// Card wrapper used by every section on this page. Title bar with optional subtitle.
function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

// One labelled value pair used inside the Project Details card.
function DetailField({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <p
        className={`text-sm text-gray-900 ${multiline ? "whitespace-pre-wrap leading-relaxed" : ""}`}
      >
        {value || <span className="text-gray-400 italic">Not provided</span>}
      </p>
    </div>
  );
}

// Compact icon-label-value row used in the sidebar metadata card.
function MetaRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="flex items-center gap-1.5 text-gray-500">
        {icon}
        {label}
      </span>
      <span className="text-gray-900 font-medium text-right">{value}</span>
    </div>
  );
}
