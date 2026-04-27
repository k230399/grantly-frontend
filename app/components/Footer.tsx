// Footer component — rendered at the bottom of every page except /login and /register.
// Shows the Grantly logo wordmark and a copyright line.

import Image from "next/image";

// Server component: no interactivity needed — purely presentational
export default function Footer() {
  return (
    <footer className="bg-gray-900 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">

        {/* Logo wordmark — matches the navbar logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center">
            <Image src="/grantly-logo.png" width={100} height={100} alt="Grantly Logo" />
          </div>
          <span className="text-white font-semibold">Grantly</span>
        </div>

        {/* Copyright line — year is computed at render time */}
        <p className="text-sm text-gray-500">
          © {new Date().getFullYear()} Grantly. Community Grant Application Portal, Australia.
        </p>

      </div>
    </footer>
  );
}
