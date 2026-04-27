// Initialises Preline UI's JavaScript on every page load and client-side navigation.
// Preline components (dropdowns, modals, tabs, etc.) rely on JS to wire up their
// behaviour. In Next.js App Router, pages navigate without a full browser reload, so
// we need to manually re-run Preline's init after each route change.
"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// PrelineScript must be placed inside the root layout so it runs on every page.
// It renders nothing visible — it only handles Preline JS initialisation.
export default function PrelineScript() {
  // usePathname returns the current URL path (e.g. "/apply", "/admin/rounds").
  // We include it in the useEffect dependency array so the effect re-runs
  // every time the user navigates to a new page.
  const path = usePathname();

  // useEffect runs after the component mounts (and again when `path` changes).
  // We dynamically import Preline here so it only runs in the browser, not on
  // the server — Preline reads the DOM, which doesn't exist server-side.
  useEffect(() => {
    const initPreline = async () => {
      // Dynamically import the Preline module (client-side only).
      // We import from "preline" (the main package entry point) because Preline v4
      // no longer has a separate /preline sub-path — everything is in the root export.
      const { HSStaticMethods } = await import("preline");

      // autoInit scans the page for Preline data-* attributes and wires up
      // interactive behaviour (dropdowns, accordions, modals, etc.)
      HSStaticMethods.autoInit();
    };

    initPreline();
  }, [path]); // Re-run every time the route changes

  // This component renders nothing — it only runs the side-effect above
  return null;
}
