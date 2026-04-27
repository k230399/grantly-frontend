// Admin dashboard overview — accessible at /admin
// The home page of the admin surface. Shows a high-level snapshot of platform activity:
// how many grant rounds are open, total applications received, and current review status.
// All numbers and table rows are placeholder data for now — real API calls come in a later step.

import {
  Award,
  FileText,
  Clock,
  CheckCircle,
  ArrowRight,
  TrendingUp,
  Users,
} from "lucide-react";

// Describes one row in the recent applications table
interface ApplicationRow {
  id: string;
  applicant: string;   // name of the organisation that submitted the application
  round: string;       // name of the grant round they applied for
  amount: number;      // funding amount they requested, in AUD
  status: "draft" | "submitted" | "under_review" | "approved" | "rejected";
  submitted: string;   // human-readable submission date, e.g. "12 Jan 2025"
}

// Placeholder rows — replaced with real API data in a later build step
const placeholderApplications: ApplicationRow[] = [
  {
    id: "1",
    applicant: "Sunrise Community Centre",
    round: "Community Arts Fund 2024",
    amount: 25000,
    status: "under_review",
    submitted: "12 Jan 2025",
  },
  {
    id: "2",
    applicant: "Riverdale Youth Foundation",
    round: "Regional Development Grant",
    amount: 48000,
    status: "submitted",
    submitted: "10 Jan 2025",
  },
  {
    id: "3",
    applicant: "Coastal Wildlife Trust",
    round: "Environmental Action Fund",
    amount: 32000,
    status: "approved",
    submitted: "8 Jan 2025",
  },
  {
    id: "4",
    applicant: "Northern Arts Collective",
    round: "Community Arts Fund 2024",
    amount: 15000,
    status: "submitted",
    submitted: "7 Jan 2025",
  },
  {
    id: "5",
    applicant: "Mulgrave Community Hub",
    round: "Regional Development Grant",
    amount: 22000,
    status: "rejected",
    submitted: "5 Jan 2025",
  },
];

// Returns the Tailwind colour classes and display label for a given application status.
// Each status gets a distinct colour so reviewers can scan the table at a glance.
function getStatusBadge(status: ApplicationRow["status"]): {
  className: string;
  label: string;
} {
  switch (status) {
    case "draft":        return { className: "bg-gray-100 text-gray-600",   label: "Draft" };
    case "submitted":    return { className: "bg-blue-100 text-blue-700",   label: "Submitted" };
    case "under_review": return { className: "bg-amber-100 text-amber-700", label: "Under Review" };
    case "approved":     return { className: "bg-green-100 text-green-700", label: "Approved" };
    case "rejected":     return { className: "bg-red-100 text-red-600",     label: "Rejected" };
  }
}

// Formats a number as Australian dollars without decimal places.
// e.g. formatCurrency(25000) → "$25,000"
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
  }).format(amount);
}

// Server component: renders the admin dashboard overview page at /admin
export default function AdminDashboardPage() {
  return (
    <div>

      {/* ── Page header ───────────────────────────────────────────────
          Title and description shown at the top of the main content area. */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          An overview of grant rounds and application activity.
        </p>
      </div>

      {/* ── Stat cards ────────────────────────────────────────────────
          Four summary numbers that give the admin a quick pulse on the platform.
          On small screens they stack; on large screens they sit in a row of four.  */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">

        {/* Active Grant Rounds — how many rounds are currently open */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-gray-500">Active Rounds</p>
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <Award className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">3</p>
          <p className="text-xs text-gray-400 mt-1">Currently open to applicants</p>
        </div>

        {/* Total Applications — all applications received across every round */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-gray-500">Total Applications</p>
            <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center">
              <FileText className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">47</p>
          <p className="text-xs text-gray-400 mt-1">Across all rounds</p>
        </div>

        {/* Pending Review — applications that are submitted or under review (need a decision) */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-gray-500">Pending Review</p>
            <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">12</p>
          <p className="text-xs text-gray-400 mt-1">Awaiting a decision</p>
        </div>

        {/* Approved This Month — successful applications in the current calendar month */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-gray-500">Approved</p>
            <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">8</p>
          <p className="text-xs text-gray-400 mt-1">This month</p>
        </div>

      </div>

      {/* ── Lower content: recent applications table + quick actions ──────
          Two-column grid on large screens.
          The table takes 2/3 of the width; quick actions take the remaining 1/3. */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Recent Applications table ────────────────────────────────
            Lists the 5 most recently submitted applications.
            Spans 2 columns on the lg grid so it gets more horizontal space. */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">

          {/* Table card header row: title on the left, "View all" link on the right */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">Recent Applications</h2>
            <a
              href="/admin/applications"
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
              View all
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Horizontally scrollable in case the table is wider than the container */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">

              {/* Column headers */}
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Applicant</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Grant Round</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Amount</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Submitted</th>
                </tr>
              </thead>

              <tbody>
                {placeholderApplications.map((app) => {
                  // Look up the colour class and label for this row's status
                  const badge = getStatusBadge(app.status);

                  return (
                    <tr
                      key={app.id}
                      className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                    >
                      {/* Applicant organisation name */}
                      <td className="px-5 py-3.5 font-medium text-gray-900 whitespace-nowrap">
                        {app.applicant}
                      </td>

                      {/* Grant round name — truncated at a max width to prevent overflow */}
                      <td className="px-5 py-3.5 text-gray-500 max-w-[180px] truncate">
                        {app.round}
                      </td>

                      {/* Requested funding amount, formatted as AUD currency */}
                      <td className="px-5 py-3.5 text-gray-700 font-medium whitespace-nowrap">
                        {formatCurrency(app.amount)}
                      </td>

                      {/* Status badge — pill with a colour matched to the status value */}
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      </td>

                      {/* Submission date */}
                      <td className="px-5 py-3.5 text-gray-400 whitespace-nowrap">
                        {app.submitted}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Quick Actions panel ──────────────────────────────────────
            Shortcuts to the most common admin tasks.
            Each action card links to the relevant page.             */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">

          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">Quick Actions</h2>
          </div>

          <div className="p-4 space-y-2">

            {/* Create a new grant round */}
            <a
              href="/admin/grant-rounds/new"
              className="flex items-center justify-between p-3.5 rounded-lg border border-gray-200 hover:border-blue-200 hover:bg-blue-50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Award className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">New Grant Round</p>
                  <p className="text-xs text-gray-500">Create and configure a round</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors flex-shrink-0" />
            </a>

            {/* Review submitted/pending applications */}
            <a
              href="/admin/applications?status=submitted"
              className="flex items-center justify-between p-3.5 rounded-lg border border-gray-200 hover:border-amber-200 hover:bg-amber-50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Review Applications</p>
                  <p className="text-xs text-gray-500">12 applications need a decision</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-amber-600 transition-colors flex-shrink-0" />
            </a>

            {/* View all applicants / full application list */}
            <a
              href="/admin/applications"
              className="flex items-center justify-between p-3.5 rounded-lg border border-gray-200 hover:border-purple-200 hover:bg-purple-50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <Users className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">All Applications</p>
                  <p className="text-xs text-gray-500">Browse the full list</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-purple-600 transition-colors flex-shrink-0" />
            </a>

            {/* Manage grant rounds */}
            <a
              href="/admin/grant-rounds"
              className="flex items-center justify-between p-3.5 rounded-lg border border-gray-200 hover:border-green-200 hover:bg-green-50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Grant Rounds</p>
                  <p className="text-xs text-gray-500">Manage open and draft rounds</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-green-600 transition-colors flex-shrink-0" />
            </a>

          </div>
        </div>

      </div>
    </div>
  );
}
