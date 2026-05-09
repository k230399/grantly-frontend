import Image from "next/image";
import {
  ArrowRight,
  CheckCircle,
  FileText,
  Search,
  BarChart3,
  Users,
} from "lucide-react";
import Footer from "./components/Footer";
import PublicNav from "./components/PublicNav";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-white">

      <PublicNav />

      <main className="flex-1">

        {/* ── Hero ────────────────────────────────────────────────────── */}
        <section className="bg-gradient-to-b from-blue-50 to-white py-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">

            <div className="flex justify-center">
              <Image src={'/grantly-logo.png'} width={150} height={150} alt="Grantly Logo"></Image>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-1.5 text-sm font-medium text-blue-700 mb-8">
              <span className="font-bold">Grantly:</span> Community Grant Portal
            </div>

            <h1 className="text-5xl font-bold tracking-tight text-gray-900 leading-tight mb-6">
              Grant funding,{" "}
              <span className="text-blue-600">made simple</span>
            </h1>

            <p className="text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto mb-10">
              Grantly connects Australian organisations with community grant funding.
              Browse open rounds, submit applications, and track your progress, all in one place.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-4 text-base font-semibold text-white hover:bg-blue-700 transition-colors shadow-sm"
              >
                Start your application
                <ArrowRight className="w-5 h-5" />
              </a>
              <a
                href="/grants"
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-8 py-4 text-base font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Search className="w-5 h-5 text-gray-500" />
                Browse open rounds
              </a>
            </div>

          </div>
        </section>

        {/* ── How it works ────────────────────────────────────────────── */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
          <div className="max-w-6xl mx-auto">

            <div className="text-center mb-14">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">How it works</h2>
              <p className="text-lg text-gray-600 max-w-xl mx-auto">
                From first look to funded — here's the process.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

              {/* Step 1: Browse */}
              <div className="flex flex-col items-start p-6 rounded-2xl border border-gray-100 bg-gray-50">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-sm mb-5">
                  1
                </div>
                <Search className="w-7 h-7 text-blue-600 mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Browse open rounds</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Explore currently open grant rounds. Each listing shows the funding amount,
                  eligibility criteria, and closing date so you can find the right fit.
                </p>
              </div>

              {/* Step 2: Apply */}
              <div className="flex flex-col items-start p-6 rounded-2xl border border-gray-100 bg-gray-50">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-sm mb-5">
                  2
                </div>
                <FileText className="w-7 h-7 text-blue-600 mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Submit your application</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Fill in your project details, attach supporting documents, and submit.
                  Save drafts and return any time before the deadline.
                </p>
              </div>

              {/* Step 3: Track */}
              <div className="flex flex-col items-start p-6 rounded-2xl border border-gray-100 bg-gray-50">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-sm mb-5">
                  3
                </div>
                <BarChart3 className="w-7 h-7 text-blue-600 mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Track your status</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Get email notifications as your application moves through review.
                  Log in any time to see the latest status and any feedback.
                </p>
              </div>

            </div>
          </div>
        </section>

        {/* ── Features split — applicants vs administrators ───────────── */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
          <div className="max-w-6xl mx-auto">

            <div className="text-center mb-14">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Built for everyone involved</h2>
              <p className="text-lg text-gray-600 max-w-xl mx-auto">
                Whether you're applying for funding or managing rounds, Grantly replaces
                scattered spreadsheets and email threads with one clear system.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

              {/* Applicant features */}
              <div className="rounded-2xl bg-white border border-gray-200 p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-700" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">For applicants</h3>
                </div>

                <ul className="space-y-3">
                  {[
                    "Browse all open grant rounds in one place",
                    "Save drafts and return before the deadline",
                    "Upload supporting documents securely",
                    "Real-time status updates via email",
                    "Full application history in your dashboard",
                  ].map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm text-gray-700">
                      <CheckCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <a
                  href="#"
                  className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-800 transition-colors"
                >
                  Go to applicant portal <ArrowRight className="w-4 h-4" />
                </a>
              </div>

              {/* Admin features */}
              <div className="rounded-2xl bg-white border border-gray-200 p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-blue-700" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">For administrators</h3>
                </div>

                <ul className="space-y-3">
                  {[
                    "Create and manage grant rounds end-to-end",
                    "Publish, close, and archive rounds with one click",
                    "Review all submitted applications in a dashboard",
                    "Approve, reject, and add internal review notes",
                    "Full audit trail — every status change is logged",
                  ].map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm text-gray-700">
                      <CheckCircle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <a
                  href="/admin"
                  className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-800 transition-colors"
                >
                  Go to admin portal <ArrowRight className="w-4 h-4" />
                </a>
              </div>

            </div>
          </div>
        </section>

        {/* ── Bottom CTA banner ───────────────────────────────────────── */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-blue-600">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to apply?
            </h2>
            <p className="text-blue-100 text-lg mb-8 max-w-xl mx-auto">
              Create a free account, explore open grant rounds, and submit your application today.
            </p>
            <a
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-semibold text-blue-700 hover:bg-blue-50 transition-colors shadow-sm"
            >
              Get started for free
              <ArrowRight className="w-5 h-5" />
            </a>
          </div>
        </section>

      </main>

      <Footer />

    </div>
  );
}
