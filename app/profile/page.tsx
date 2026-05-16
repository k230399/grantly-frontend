"use client";
// "use client" because this page reads the JWT from localStorage,
// fetches the profile on mount, and tracks form state in React.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, AlertCircle, User as UserIcon } from "lucide-react";
import Footer from "../components/Footer";
import ApplicantNav from "../components/ApplicantNav";
import { useToast } from "@/contexts/ToastContext";

interface StoredUser {
  id: string;
  email: string;
  full_name: string;
  role: "applicant" | "admin";
}

interface Profile {
  id: string;
  email: string;
  full_name: string;
  organisation_name: string | null;
  abn: string | null;
  phone: string | null;
  address: string | null;
  state: string | null;
  postcode: string | null;
  role: "applicant" | "admin";
}

// AU state/territory codes used by the state <select>.
const AU_STATES = ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "NT", "ACT"] as const;

// Preline advanced-select config for the state dropdown. No hasSearch — the list is short.
const STATE_SELECT_CONFIG = JSON.stringify({
  placeholder: "Select a state",
  toggleTag: '<button type="button" aria-expanded="false"></button>',
  toggleClasses:
    "hs-select-disabled:pointer-events-none hs-select-disabled:opacity-50 relative w-full py-2.5 px-4 pe-9 flex text-nowrap cursor-pointer bg-white border border-gray-200 rounded-xl text-start text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 before:absolute before:inset-0 before:z-[1]",
  dropdownClasses:
    "mt-2 z-50 w-full max-h-72 p-1 space-y-0.5 bg-white border border-gray-200 rounded-xl overflow-hidden overflow-y-auto shadow-md",
  optionClasses:
    "py-2 px-3 w-full text-sm text-gray-800 cursor-pointer hover:bg-gray-100 rounded-md focus:outline-none focus:bg-gray-100",
  optionTemplate:
    '<div class="flex justify-between items-center w-full"><span data-title></span><span class="hidden hs-selected:block"><svg class="shrink-0 size-3.5 text-blue-600" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span></div>',
  extraMarkup:
    '<div class="absolute top-1/2 end-3 -translate-y-1/2"><svg class="shrink-0 size-3.5 text-gray-500" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/></svg></div>',
});

// The editable subset of Profile — every field is a string so empty inputs map cleanly to "".
type FormState = {
  full_name: string;
  organisation_name: string;
  abn: string;
  phone: string;
  address: string;
  state: string;
  postcode: string;
};

const EMPTY_FORM: FormState = {
  full_name: "",
  organisation_name: "",
  abn: "",
  phone: "",
  address: "",
  state: "",
  postcode: "",
};

// Maps a Profile API response to the editable form shape (null → "").
function profileToForm(p: Profile): FormState {
  return {
    full_name: p.full_name ?? "",
    organisation_name: p.organisation_name ?? "",
    abn: p.abn ?? "",
    phone: p.phone ?? "",
    address: p.address ?? "",
    state: p.state ?? "",
    postcode: p.postcode ?? "",
  };
}

export default function ProfilePage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [user, setUser] = useState<StoredUser | null>(null);
  const [email, setEmail] = useState<string>("");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // On mount: verify session, then fetch the profile.
  useEffect(() => {
    async function init() {
      const raw = localStorage.getItem("grantly_user");
      const token = localStorage.getItem("grantly_token");

      if (!raw || !token) {
        router.replace("/login");
        return;
      }

      try {
        setUser(JSON.parse(raw) as StoredUser);
      } catch {
        localStorage.removeItem("grantly_user");
        localStorage.removeItem("grantly_token");
        router.replace("/login");
        return;
      }

      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/profile`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await res.json();

        if (!res.ok) {
          setLoadError(data.error?.message ?? "Failed to load your profile.");
          return;
        }

        const profile = data.data as Profile;
        setEmail(profile.email);
        setForm(profileToForm(profile));
      } catch {
        setLoadError("Could not reach the server. Please check your connection.");
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [router]);

  // Initialises Preline on the state select once the form mounts.
  useEffect(() => {
    if (loading || loadError) return;
    import("preline").then(({ HSStaticMethods }) => {
      HSStaticMethods.autoInit(["select"]);
    });
  }, [loading, loadError]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    // Clear any per-field error the user is currently fixing so the red ring goes away as they type.
    if (fieldErrors[key]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const token = localStorage.getItem("grantly_token");
    if (!token) {
      router.replace("/login");
      return;
    }

    setSaving(true);
    setFieldErrors({});

    // Send every editable field; null-empty strings so they clear server-side rather than save "".
    const payload = {
      full_name: form.full_name.trim(),
      organisation_name: form.organisation_name.trim() || null,
      abn: form.abn.trim() || null,
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
      state: form.state || null,
      postcode: form.postcode.trim() || null,
    };

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/profile`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        if (data.error?.code === "validation_error" && data.error.details) {
          setFieldErrors(data.error.details);
        }
        showToast(
          data.error?.message ?? "Failed to save your profile.",
          "error"
        );
        return;
      }

      const profile = data.data as Profile;
      setForm(profileToForm(profile));

      // Keep the cached user object in localStorage in sync so the dashboard greeting
      // and avatar initial reflect the new full_name without needing a fresh login.
      if (user) {
        const next = { ...user, full_name: profile.full_name };
        setUser(next);
        localStorage.setItem("grantly_user", JSON.stringify(next));
      }

      showToast("Profile updated.", "success");
    } catch {
      showToast("Could not reach the server. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  }

  // Initial auth check spinner.
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="w-8 h-8 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
      </div>
    );
  }

  const backHref = user.role === "admin" ? "/admin" : "/dashboard";

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">

      <ApplicantNav user={user} />

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-10">

        {/* Back link */}
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to dashboard
        </Link>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
          <p className="mt-1 text-sm text-gray-500">
            Your details are used to identify your organisation on grant applications.
          </p>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex items-center gap-2 text-gray-400 py-10">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Loading your profile…</span>
          </div>
        )}

        {/* Failed-to-load state */}
        {!loading && loadError && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{loadError}</span>
          </div>
        )}

        {/* Profile form */}
        {!loading && !loadError && (
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl border border-gray-200 shadow-sm divide-y divide-gray-100"
          >

            {/* Account section — read-only Supabase-owned fields */}
            <section className="p-6 sm:p-8">
              <div className="flex items-center gap-2 mb-5">
                <UserIcon className="w-4 h-4 text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                  Account
                </h2>
              </div>

              <FormField label="Email" hint="Email changes are managed by your account provider contact support if you need to change it.">
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-500 cursor-not-allowed"
                />
              </FormField>
            </section>

            {/* Personal details */}
            <section className="p-6 sm:p-8">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-5">
                Personal details
              </h2>

              <FormField label="Full name" required error={fieldErrors.full_name?.[0]}>
                <TextInput
                  value={form.full_name}
                  onChange={(v) => updateField("full_name", v)}
                  hasError={Boolean(fieldErrors.full_name)}
                  placeholder="Your full name"
                />
              </FormField>

              <FormField label="Phone" error={fieldErrors.phone?.[0]}>
                <TextInput
                  value={form.phone}
                  onChange={(v) => updateField("phone", v)}
                  hasError={Boolean(fieldErrors.phone)}
                  placeholder="e.g. 0412 345 678"
                />
              </FormField>
            </section>

            {/* Organisation details */}
            <section className="p-6 sm:p-8">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-5">
                Organisation
              </h2>

              <FormField label="Organisation name" error={fieldErrors.organisation_name?.[0]}>
                <TextInput
                  value={form.organisation_name}
                  onChange={(v) => updateField("organisation_name", v)}
                  hasError={Boolean(fieldErrors.organisation_name)}
                  placeholder="e.g. Greenfield Community Trust"
                />
              </FormField>

              <FormField
                label="ABN"
                hint="11 digits. Australian Business Number lookup will be added in a future update."
                error={fieldErrors.abn?.[0]}
              >
                <TextInput
                  value={form.abn}
                  onChange={(v) => updateField("abn", v)}
                  hasError={Boolean(fieldErrors.abn)}
                  placeholder="11 digits"
                  inputMode="numeric"
                  maxLength={11}
                />
              </FormField>
            </section>

            {/* Address */}
            <section className="p-6 sm:p-8">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-5">
                Address
              </h2>

              <FormField label="Street address" error={fieldErrors.address?.[0]}>
                <textarea
                  value={form.address}
                  onChange={(e) => updateField("address", e.target.value)}
                  rows={2}
                  placeholder="e.g. 12 Smith Street, Newtown"
                  className={`w-full rounded-xl border px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-colors ${
                    fieldErrors.address
                      ? "border-red-300 focus:ring-red-200"
                      : "border-gray-200 focus:ring-blue-200 focus:border-blue-400"
                  }`}
                />
              </FormField>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0">
                <FormField label="State" error={fieldErrors.state?.[0]}>
                  {/* Preline replaces this hidden native select with its own styled toggle on mount. */}
                  <div className="relative">
                    <select
                      value={form.state}
                      onChange={(e) => updateField("state", e.target.value)}
                      data-hs-select={STATE_SELECT_CONFIG}
                      className="hidden"
                    >
                      <option value="">Select a state</option>
                      {AU_STATES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </FormField>

                <FormField label="Postcode" error={fieldErrors.postcode?.[0]}>
                  <TextInput
                    value={form.postcode}
                    onChange={(v) => updateField("postcode", v)}
                    hasError={Boolean(fieldErrors.postcode)}
                    placeholder="4 digits"
                    inputMode="numeric"
                    maxLength={4}
                  />
                </FormField>
              </div>
            </section>

            {/* Save row */}
            <div className="flex items-center justify-end gap-3 p-6 sm:p-8 bg-gray-50 rounded-b-2xl">
              <Link
                href={backHref}
                className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>

          </form>
        )}
      </main>

      <Footer />
    </div>
  );
}

// Small layout helper so every field gets the same label / hint / error styling.
function FormField({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5 last:mb-0">
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-gray-400">{hint}</p>
      ) : null}
    </div>
  );
}

// Plain text input wrapper — keeps the styling consistent across every text field.
function TextInput({
  value,
  onChange,
  hasError,
  placeholder,
  inputMode,
  maxLength,
}: {
  value: string;
  onChange: (v: string) => void;
  hasError?: boolean;
  placeholder?: string;
  inputMode?: "text" | "numeric";
  maxLength?: number;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      inputMode={inputMode}
      maxLength={maxLength}
      className={`w-full rounded-xl border px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-colors ${
        hasError
          ? "border-red-300 focus:ring-red-200"
          : "border-gray-200 focus:ring-blue-200 focus:border-blue-400"
      }`}
    />
  );
}
