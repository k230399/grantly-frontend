"use client";
// Client component: reads the JWT from localStorage to authenticate the API calls
// and manages async loading state for the application + status history fetches.

// Application detail page — accessible at /admin/applications/[id].
// Read-only view of a single application: project details, applicant, grant round,
// custom form answers, documents, and status-change audit trail.
// Action buttons open a confirmation modal that PATCHes /applications/{id}/status.

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
  MessageSquare,
  Pencil,
  Trash2,
  Send,
} from "lucide-react";
import FormRenderer, { type FormData } from "@/app/components/FormRenderer";
import type { ApplicationFormSchema } from "@/components/admin/FormSchemaBuilder";
import { useToast } from "@/contexts/ToastContext";

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

// One admin-only review note attached to this application.
interface ReviewNote {
  id: string;
  application_id: string;
  reviewer_id: string;
  note_content: string;
  created_at: string;
  updated_at: string;
  reviewer?: {
    id: string;
    full_name: string;
    email: string;
  };
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

// Targets for the admin's status-change buttons. Draft + submitted are not
// admin-driven transitions — applicants own those — so they're not exposed.
type ActionStatus = "under_review" | "approved" | "rejected";

export default function ApplicationDetailPage() {
  const params = useParams<{ id: string }>();
  const applicationId = params.id;
  const { showToast } = useToast();

  const [application, setApplication] = useState<ApplicationDetail | null>(null);
  const [history, setHistory] = useState<StatusHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Status-change modal state: which target status is being confirmed,
  // optional reviewer notes, in-flight + error state for the PATCH request.
  const [actionStatus, setActionStatus] = useState<ActionStatus | null>(null);
  const [actionNotes, setActionNotes] = useState("");
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Review notes state. currentUserId is read from localStorage so we can show
  // edit/delete controls only on the admin's own notes.
  const [reviewNotes, setReviewNotes] = useState<ReviewNote[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Fetches the application detail, status history, and review notes in parallel
  // on mount and whenever the URL id changes (rare, but covers client-side nav
  // between siblings). Also reads the signed-in admin's id from localStorage so
  // ownership-based edit/delete buttons can render correctly on review notes.
  useEffect(() => {
    async function fetchApplication() {
      setLoading(true);
      setError(null);

      // Pull the admin's id from the stored user payload — used to scope the
      // edit/delete affordances on review notes to the author of each note.
      const rawUser = localStorage.getItem("grantly_user");
      if (rawUser) {
        try {
          const parsed = JSON.parse(rawUser) as { id?: string };
          if (parsed.id) setCurrentUserId(parsed.id);
        } catch {
          // Corrupt localStorage — ignore; ownership checks will fail closed.
        }
      }

      const token = localStorage.getItem("grantly_token");
      if (!token) return;

      const base = process.env.NEXT_PUBLIC_API_BASE_URL;
      const headers = { Authorization: `Bearer ${token}` };

      try {
        const [detailRes, historyRes, notesRes] = await Promise.all([
          fetch(`${base}/api/v1/applications/${applicationId}`, { headers }),
          fetch(`${base}/api/v1/applications/${applicationId}/status-history`, { headers }),
          fetch(`${base}/api/v1/applications/${applicationId}/review-notes`, { headers }),
        ]);

        const detailData = await detailRes.json();

        if (!detailRes.ok) {
          setError(detailData.error?.message ?? "Failed to load application.");
          setLoading(false);
          return;
        }

        setApplication(detailData.data ?? detailData);

        // History and notes are non-critical — if either fails we still show the detail.
        if (historyRes.ok) {
          const historyData = await historyRes.json();
          setHistory(historyData.data ?? []);
        }
        if (notesRes.ok) {
          const notesData = await notesRes.json();
          setReviewNotes(notesData.data ?? []);
        }
      } catch {
        setError("Could not reach the server. Please check your connection.");
      } finally {
        setLoading(false);
      }
    }

    fetchApplication();
  }, [applicationId]);

  // ─── Review note handlers ──────────────────────────────────────────────

  // Posts a new admin-only review note on this application.
  async function createReviewNote(content: string): Promise<boolean> {
    const token = localStorage.getItem("grantly_token");
    const base = process.env.NEXT_PUBLIC_API_BASE_URL;
    try {
      const res = await fetch(`${base}/api/v1/applications/${applicationId}/review-notes`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ note_content: content }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error?.message ?? "Failed to post note.", "error");
        return false;
      }
      // Prepend so the newest note appears at the top of the list.
      setReviewNotes((prev) => [data.data ?? data, ...prev]);
      showToast("Note posted.", "success");
      return true;
    } catch {
      showToast("Could not reach the server. Please check your connection.", "error");
      return false;
    }
  }

  // Updates an existing note's content. Server enforces author-only edits.
  async function updateReviewNote(noteId: string, content: string): Promise<boolean> {
    const token = localStorage.getItem("grantly_token");
    const base = process.env.NEXT_PUBLIC_API_BASE_URL;
    try {
      const res = await fetch(`${base}/api/v1/review-notes/${noteId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ note_content: content }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error?.message ?? "Failed to update note.", "error");
        return false;
      }
      const updated: ReviewNote = data.data ?? data;
      setReviewNotes((prev) => prev.map((n) => (n.id === noteId ? updated : n)));
      showToast("Note updated.", "success");
      return true;
    } catch {
      showToast("Could not reach the server. Please check your connection.", "error");
      return false;
    }
  }

  // Deletes a note. Server enforces author-only deletion.
  async function deleteReviewNote(noteId: string): Promise<void> {
    const token = localStorage.getItem("grantly_token");
    const base = process.env.NEXT_PUBLIC_API_BASE_URL;
    try {
      const res = await fetch(`${base}/api/v1/review-notes/${noteId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok && res.status !== 204) {
        const data = await res.json().catch(() => ({}));
        showToast(data.error?.message ?? "Failed to delete note.", "error");
        return;
      }
      setReviewNotes((prev) => prev.filter((n) => n.id !== noteId));
      showToast("Note deleted.", "success");
    } catch {
      showToast("Could not reach the server. Please check your connection.", "error");
    }
  }

  // Re-fetches just the status history. Called after a successful status
  // change to pick up the new audit-log entry without a full page reload.
  async function refreshStatusHistory() {
    const token = localStorage.getItem("grantly_token");
    if (!token) return;

    const base = process.env.NEXT_PUBLIC_API_BASE_URL;
    try {
      const res = await fetch(`${base}/api/v1/applications/${applicationId}/status-history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data.data ?? []);
      }
    } catch {
      // Silent — the modal already closed and the application state is fresh.
    }
  }

  // Closes the status-change modal and resets its transient fields.
  function closeStatusModal() {
    setActionStatus(null);
    setActionNotes("");
    setActionError(null);
  }

  // Sends the PATCH /applications/{id}/status request, then refreshes
  // the page state so the badge, history timeline, and buttons all reflect
  // the new status.
  async function submitStatusChange() {
    if (!actionStatus) return;

    setActionSubmitting(true);
    setActionError(null);

    const token = localStorage.getItem("grantly_token");
    const base = process.env.NEXT_PUBLIC_API_BASE_URL;

    try {
      const res = await fetch(`${base}/api/v1/applications/${applicationId}/status`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          status: actionStatus,
          notes: actionNotes.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const message = data.error?.message ?? "Failed to update status.";
        setActionError(message);
        showToast(message, "error");
        setActionSubmitting(false);
        return;
      }

      // The PATCH response loads applicant + grantRound but not documents,
      // so merge the new fields onto the existing application state to keep
      // the documents list and any other related data intact.
      const updated = data.data ?? data;
      setApplication((prev) => (prev ? { ...prev, ...updated, documents: prev.documents } : updated));
      await refreshStatusHistory();
      closeStatusModal();
      showToast(`Application marked as ${statusLabel(actionStatus)}.`, "success");
    } catch {
      const message = "Could not reach the server. Please check your connection.";
      setActionError(message);
      showToast(message, "error");
    } finally {
      setActionSubmitting(false);
    }
  }

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

        {/* Status-change buttons — clicking opens a confirmation modal where
            the admin can add an optional reviewer note before submitting. The
            button matching the current status is disabled (the API would
            otherwise return no_status_change). */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setActionStatus("under_review")}
            disabled={application.status === "under_review"}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white cursor-pointer"
          >
            <Eye className="w-4 h-4" />
            Mark Under Review
          </button>
          <button
            type="button"
            onClick={() => setActionStatus("rejected")}
            disabled={application.status === "rejected"}
            className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3.5 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white cursor-pointer"
          >
            <XCircle className="w-4 h-4" />
            Reject
          </button>
          <button
            type="button"
            onClick={() => setActionStatus("approved")}
            disabled={application.status === "approved"}
            className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-green-600 cursor-pointer"
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

          {/* Review notes — admin-only internal scratchpad */}
          <ReviewNotesCard
            notes={reviewNotes}
            currentUserId={currentUserId}
            onCreate={createReviewNote}
            onUpdate={updateReviewNote}
            onDelete={deleteReviewNote}
          />

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

      {/* ── Status-change confirmation modal ─────────────────────────── */}
      {actionStatus && (
        <StatusChangeModal
          targetStatus={actionStatus}
          currentStatus={application.status}
          notes={actionNotes}
          onNotesChange={setActionNotes}
          submitting={actionSubmitting}
          error={actionError}
          onCancel={closeStatusModal}
          onConfirm={submitStatusChange}
        />
      )}
    </div>
  );
}

// Confirmation modal used by the three admin status-change buttons.
// Shows the current → target transition and exposes an optional notes field
// that gets recorded on the audit-log entry.
function StatusChangeModal({
  targetStatus,
  currentStatus,
  notes,
  onNotesChange,
  submitting,
  error,
  onCancel,
  onConfirm,
}: {
  targetStatus: ActionStatus;
  currentStatus: ApplicationDetail["status"];
  notes: string;
  onNotesChange: (next: string) => void;
  submitting: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const targetLabel = statusLabel(targetStatus);

  // Confirm button colour mirrors the trigger button so the action stays
  // visually consistent from click to confirm.
  const confirmClass =
    targetStatus === "approved"
      ? "bg-green-600 hover:bg-green-700 text-white"
      : targetStatus === "rejected"
        ? "bg-red-600 hover:bg-red-700 text-white"
        : "bg-gray-900 hover:bg-gray-800 text-white";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Click-outside backdrop — clicking dismisses the modal */}
      <button
        type="button"
        aria-label="Close"
        onClick={submitting ? undefined : onCancel}
        className="absolute inset-0 bg-black/40"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Confirm status change to ${targetLabel}`}
        className="relative w-full max-w-md bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            Change status to {targetLabel}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            <span className="capitalize">{statusLabel(currentStatus)}</span>
            <span className="mx-1.5 text-gray-400">→</span>
            <span className="font-medium">{targetLabel}</span>
          </p>
        </div>

        <div className="p-5 space-y-3">
          <label className="block">
            <span className="text-xs font-medium text-gray-700">
              Reviewer notes <span className="text-gray-400 font-normal">(optional)</span>
            </span>
            <textarea
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              rows={4}
              maxLength={2000}
              disabled={submitting}
              placeholder="Visible to the applicant on the audit trail."
              className="mt-1.5 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none focus:ring-0 disabled:bg-gray-50"
            />
          </label>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 bg-gray-50 border-t border-gray-100">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${confirmClass}`}
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Confirm
          </button>
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

// Review notes card — composes the new-note form and the existing-notes list.
// Notes are admin-only; there's no public/internal split.
function ReviewNotesCard({
  notes,
  currentUserId,
  onCreate,
  onUpdate,
  onDelete,
}: {
  notes: ReviewNote[];
  currentUserId: string | null;
  onCreate: (content: string) => Promise<boolean>;
  onUpdate: (noteId: string, content: string) => Promise<boolean>;
  onDelete: (noteId: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);

  async function handlePost() {
    if (!draft.trim()) return;
    setPosting(true);
    const ok = await onCreate(draft.trim());
    setPosting(false);
    if (ok) setDraft("");
  }

  return (
    <Card
      title="Review Notes"
      subtitle={`Internal · ${notes.length} note${notes.length !== 1 ? "s" : ""}`}
    >
      {/* New-note form */}
      <div className="space-y-2.5">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          maxLength={5000}
          disabled={posting}
          placeholder="Add a note about this application…"
          className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none focus:ring-0 disabled:bg-gray-50 resize-y"
        />
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={handlePost}
            disabled={posting || !draft.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {posting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            Post note
          </button>
        </div>
      </div>

      {/* Existing notes list — divider above when at least one exists */}
      {notes.length > 0 && (
        <ul className="divide-y divide-gray-100 -mx-5 border-t border-gray-100">
          {notes.map((note) => (
            <ReviewNoteItem
              key={note.id}
              note={note}
              isOwner={!!currentUserId && note.reviewer_id === currentUserId}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}

      {notes.length === 0 && (
        <div className="flex items-center gap-2 text-sm text-gray-400 italic">
          <MessageSquare className="w-4 h-4" />
          No notes yet.
        </div>
      )}
    </Card>
  );
}

// One row in the review-notes list. Toggles between read and edit mode locally;
// owner-only edit/delete buttons are gated by the `isOwner` prop from the parent.
function ReviewNoteItem({
  note,
  isOwner,
  onUpdate,
  onDelete,
}: {
  note: ReviewNote;
  isOwner: boolean;
  onUpdate: (noteId: string, content: string) => Promise<boolean>;
  onDelete: (noteId: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(note.note_content);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // Initials for the avatar — same pattern as the Applicant card on this page.
  const initials = (note.reviewer?.full_name ?? "?")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function saveEdit() {
    if (!editText.trim()) return;
    setSaving(true);
    const ok = await onUpdate(note.id, editText.trim());
    setSaving(false);
    if (ok) setEditing(false);
  }

  function cancelEdit() {
    setEditText(note.note_content);
    setEditing(false);
  }

  async function confirmDelete() {
    await onDelete(note.id);
    setConfirmingDelete(false);
  }

  return (
    <li className="px-5 py-4">
      <div className="flex items-start gap-3">
        {/* Reviewer avatar */}
        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-xs font-semibold text-gray-600">{initials}</span>
        </div>

        <div className="min-w-0 flex-1">
          {/* Header row: name, timestamp */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-900 truncate">
              {note.reviewer?.full_name ?? "Unknown reviewer"}
            </span>
            <span className="text-xs text-gray-400">
              {formatDateTime(note.created_at)}
            </span>
          </div>

          {/* Body — read mode vs edit mode */}
          {editing ? (
            <div className="mt-2 space-y-2">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={3}
                maxLength={5000}
                disabled={saving}
                className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-0 disabled:bg-gray-50 resize-y"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={cancelEdit}
                  disabled={saving}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveEdit}
                  disabled={saving || !editText.trim()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-700 whitespace-pre-wrap mt-1 leading-relaxed">
              {note.note_content}
            </p>
          )}

          {/* Owner-only edit/delete row, hidden while editing or confirming delete */}
          {isOwner && !editing && !confirmingDelete && (
            <div className="flex items-center gap-3 mt-2">
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
              >
                <Pencil className="w-3 h-3" />
                Edit
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-red-600 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                Delete
              </button>
            </div>
          )}

          {/* Inline delete confirmation — keeps the destructive action one click away */}
          {confirmingDelete && (
            <div className="flex items-center gap-2 mt-2 text-xs">
              <span className="text-gray-600">Delete this note?</span>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="rounded-lg bg-red-600 px-2.5 py-1 font-medium text-white hover:bg-red-700 transition-colors cursor-pointer"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
