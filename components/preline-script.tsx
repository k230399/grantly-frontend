"use client";
// App Router doesn't trigger full reloads on navigation, so Preline's JS init has to be
// re-run on every route change to wire up dropdowns/modals/etc. that appear on new pages.
// Mount this once inside the root layout.

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function PrelineScript() {
  const path = usePathname();

  // Dynamic import keeps Preline client-only — it reads the DOM, which doesn't exist on the server.
  useEffect(() => {
    const initPreline = async () => {
      // Preline v4 dropped the /preline sub-path — everything is in the root export now.
      const { HSStaticMethods } = await import("preline");
      HSStaticMethods.autoInit();
    };

    initPreline();
  }, [path]);

  return null;
}
