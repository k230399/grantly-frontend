"use client";
// This file needs to be a client component because it uses useState and setTimeout
// to manage the toast queue. It provides a context that lets any component in the app
// trigger a floating toast notification without managing its own local state.

import { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";

// The shape of a single toast message in the queue
interface Toast {
  id: string;                // unique identifier — used as the React key and to target the right toast for removal
  message: string;           // the text displayed inside the toast pill
  type: "success" | "error"; // "success" renders green, "error" renders red
}

// The value every consumer of this context receives when they call useToast()
interface ToastContextValue {
  // Call this from any component to show a floating toast.
  // - message: the text to display
  // - type: "success" (green tick) or "error" (red warning)
  // - duration: milliseconds before the toast disappears (defaults to 3000 ms)
  showToast: (message: string, type: Toast["type"], duration?: number) => void;
}

// The context object — null before any ToastProvider wraps the tree
const ToastContext = createContext<ToastContextValue | null>(null);

// Internal component: renders all active toasts as a stacked floating overlay.
// Defined here instead of a separate file to avoid a circular import
// (ToastContainer needs Toast + ToastContext; ToastProvider needs ToastContainer).
function ToastContainer({ toasts }: { toasts: Toast[] }) {
  // Nothing to render when the queue is empty — avoids an empty DOM node
  if (toasts.length === 0) return null;

  return (
    // Fixed position + translate trick centers the stack horizontally at the top of the viewport.
    // z-50 keeps toasts above all page content including modals and dropdowns.
    // pointer-events-none on the wrapper lets mouse clicks pass through empty gaps between toasts.
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-none">
      {toasts.map((toast) => (
        // pointer-events-auto re-enables interaction on the toast pill itself (ready for a dismiss button later)
        <div
          key={toast.id}
          className={`flex items-center gap-3 rounded-xl px-5 py-3.5 text-sm shadow-lg whitespace-nowrap pointer-events-auto ${
            toast.type === "success"
              ? "bg-green-50 border border-green-200 text-green-700"
              : "bg-red-50 border border-red-200 text-red-700"
          }`}
        >
          {/* Icon reflects the type — green tick for success, red circle for errors */}
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

// ToastProvider wraps the root layout so every page in the app can call useToast().
// It manages the active toast queue and renders the ToastContainer overlay.
export function ToastProvider({ children }: { children: React.ReactNode }) {
  // The list of toasts currently visible on screen.
  // Entries are added by showToast() and removed automatically when their timer fires.
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Creates a new toast, adds it to the queue, and removes it after `duration` ms.
  // useCallback keeps the function reference stable so consumers don't re-render
  // unnecessarily if they receive showToast as a prop.
  const showToast = useCallback(
    (message: string, type: Toast["type"], duration = 3000) => {
      // Combine timestamp + random to get a unique enough ID for a short-lived UI queue
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev, { id, message, type }]);

      // After `duration` ms, filter this specific toast out of the queue
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    },
    []
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* ToastContainer sits after children so it renders on top of all page content */}
      <ToastContainer toasts={toasts} />
    </ToastContext.Provider>
  );
}

// useToast — call this hook inside any client component to get the showToast function.
//
// Usage:
//   const { showToast } = useToast();
//   showToast("Saved successfully.", "success");
//   showToast("Something went wrong.", "error");
//
// Throws if called outside a <ToastProvider> so wiring mistakes surface immediately.
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error(
      "useToast must be used inside a <ToastProvider>. Wrap your app in <ToastProvider> in the root layout."
    );
  }
  return ctx;
}
