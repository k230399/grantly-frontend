"use client";
// "use client" because this nav uses Preline's hs-dropdown JS, usePathname,
// and writes to localStorage on sign out.

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ChevronDown } from "lucide-react";

interface StoredUser {
  id: string;
  email: string;
  full_name: string;
  role: "applicant" | "admin";
}

// Shared top navigation for the applicant flow (dashboard, profile, etc.).
// Renders the Grantly brand on the left and a Preline dropdown with the user's
// avatar + name on the right. The dropdown's primary link flips between
// "Profile" and "Dashboard" based on the current route.
export default function ApplicantNav({ user }: { user: StoredUser }) {
  const router = useRouter();
  const pathname = usePathname();

  const avatarInitial = user.full_name.charAt(0).toUpperCase();
  const dashboardHref = user.role === "admin" ? "/admin" : "/dashboard";
  const isOnProfile = pathname === "/profile";

  function handleSignOut() {
    localStorage.removeItem("grantly_token");
    localStorage.removeItem("grantly_user");
    router.push("/login");
  }

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">

        {/* Brand */}
        <Link href={dashboardHref} className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0">
            <Image
              src="/grantly-logo.png"
              width={32}
              height={32}
              alt="Grantly Logo"
            />
          </div>
          <span className="text-lg font-semibold text-gray-900">Grantly</span>
        </Link>

        {/* User menu. Preline dropdown handles open/close on click and outside-click. */}
        <div className="hs-dropdown relative inline-flex">
          {/* Ghost button. Transparent by default; gains a soft gray background on hover and while open. */}
          <button
            id="hs-user-dropdown"
            type="button"
            className="hs-dropdown-toggle flex items-center gap-2.5 pl-1.5 pr-2.5 py-1 rounded-full hover:bg-gray-100 hs-dropdown-open:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-colors cursor-pointer"
            aria-haspopup="menu"
            aria-expanded="false"
            aria-label="Open user menu"
          >
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <span className="text-blue-700 font-semibold text-sm">{avatarInitial}</span>
            </div>
            <span className="text-sm font-medium text-gray-700 hidden sm:block">
              {user.full_name}
            </span>
            {/* Chevron rotates 180deg when the dropdown is open. */}
            <ChevronDown className="w-4 h-4 text-gray-400 hs-dropdown-open:rotate-180 transition-transform" />
          </button>

          <div
            className="hs-dropdown-menu transition-[opacity,margin] duration-150 hs-dropdown-open:opacity-100 opacity-0 hidden min-w-48 bg-white border border-gray-200 shadow-md rounded-xl mt-2 z-20"
            role="menu"
            aria-orientation="vertical"
            aria-labelledby="hs-user-dropdown"
          >
            <div className="p-1">
              <Link
                href={isOnProfile ? dashboardHref : "/profile"}
                className="flex w-full items-center gap-2 py-2 px-3 rounded-lg text-sm text-gray-700 hover:bg-gray-100 focus:outline-none focus:bg-gray-100"
              >
                {isOnProfile ? "Dashboard" : "Profile"}
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="flex w-full items-center gap-2 py-2 px-3 rounded-lg text-sm text-gray-700 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 cursor-pointer"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>

      </div>
    </header>
  );
}
