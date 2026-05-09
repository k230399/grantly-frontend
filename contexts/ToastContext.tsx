"use client";
// Client component: needs useState/setTimeout to manage the toast queue.

import { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error";
}

interface ToastContextValue {
  // duration defaults to 3000 ms.
  showToast: (message: string, type: Toast["type"], duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

// Defined in this file to avoid a circular import with ToastProvider.
function ToastContainer({ toasts }: { toasts: Toast[] }) {
  if (toasts.length === 0) return null;

  return (
    // pointer-events-none on the wrapper lets clicks pass through empty gaps between toasts;
    // pointer-events-auto on each pill re-enables interaction on the toast itself.
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center gap-3 rounded-xl px-5 py-3.5 text-sm shadow-lg whitespace-nowrap pointer-events-auto ${
            toast.type === "success"
              ? "bg-green-50 border border-green-200 text-green-700"
              : "bg-red-50 border border-red-200 text-red-700"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      ))}
    </div>
  );
}

// Wrap the root layout so every page can call useToast().
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  // useCallback keeps the reference stable so consumers don't re-render when showToast is passed as a prop.
  const showToast = useCallback(
    (message: string, type: Toast["type"], duration = 3000) => {
      // Timestamp + random is unique enough for a short-lived UI queue — no need for crypto.randomUUID.
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev, { id, message, type }]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    },
    []
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Rendered after children so toasts paint on top of all page content. */}
      <ToastContainer toasts={toasts} />
    </ToastContext.Provider>
  );
}

// Usage:
//   const { showToast } = useToast();
//   showToast("Saved successfully.", "success");
//   showToast("Something went wrong.", "error");
// Throws outside a <ToastProvider> so wiring mistakes fail loudly instead of silently no-op'ing.
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error(
      "useToast must be used inside a <ToastProvider>. Wrap your app in <ToastProvider> in the root layout."
    );
  }
  return ctx;
}
