"use client";
// Client component: holds chat state, streams SSE, and needs localStorage for the JWT.

import { useEffect, useRef, useState } from "react";
import { X, Send, Loader2, Sparkles } from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

type ContextType =
  | "apply"
  | "browse"
  | "dashboard"
  | "admin_review"
  | "admin_overview"
  | "admin_round_compose";

interface ChatbotProps {
  contextType: ContextType;
  // Required when contextType is "apply".
  applicationId?: string;
  // Optional for "browse" — if set, the bot is grounded in that specific round.
  grantRoundId?: string;
  // Override the launcher button label, panel title, and greeting if desired.
  buttonLabel?: string;
  panelTitle?: string;
  greeting?: string;
}

// Per-surface defaults. Centralised here so adding a new surface is a one-stop change.
const DEFAULTS: Record<ContextType, { buttonLabel: string; panelTitle: string; greeting: string }> = {
  apply: {
    buttonLabel: "Ask Grantly Assistant",
    panelTitle: "Grantly Assistant",
    greeting:
      "Hi! I can help you fill out this application. Ask me anything about the grant round, what to write in a field, or how to phrase your project.",
  },
  browse: {
    buttonLabel: "Ask Grantly Assistant",
    panelTitle: "Grantly Assistant",
    greeting:
      "Hi! I can help you understand this grant round, check whether your organisation might be eligible, or compare options. What would you like to know?",
  },
  dashboard: {
    buttonLabel: "Ask Grantly Assistant",
    panelTitle: "Grantly Assistant",
    greeting:
      "Hi! I can answer questions about the applications you've started, their status, what's still needed, or upcoming close dates. What would you like to know?",
  },
  admin_review: {
    buttonLabel: "Ask Grantly Assistant",
    panelTitle: "Grantly Assistant",
    greeting:
      "Hi! I can summarise this application, score it against the assessment criteria, flag missing info, or help you draft a reviewer note. What do you need?",
  },
  admin_overview: {
    buttonLabel: "Ask Grantly Assistant",
    panelTitle: "Grantly Assistant",
    greeting:
      "Hi! I can give you a snapshot of the application queue, status counts, recent submissions, and which rounds are busiest. What would you like to know?",
  },
  admin_round_compose: {
    buttonLabel: "Ask Grantly Assistant",
    panelTitle: "Grantly Assistant",
    greeting:
      "Hi! I can help you write the round's description, eligibility, assessment criteria, or suggest required documents and focus areas. Want me to draft something or refine what you've got?",
  },
};

export default function Chatbot(props: ChatbotProps) {
  const defaults = DEFAULTS[props.contextType];
  const buttonLabel = props.buttonLabel ?? defaults.buttonLabel;
  const panelTitle  = props.panelTitle  ?? defaults.panelTitle;
  const greeting    = props.greeting    ?? defaults.greeting;

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: "assistant", content: greeting }]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasToken, setHasToken] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Read the token after mount so the launcher doesn't render for anonymous visitors.
  // Doing this in an effect (rather than during render) avoids a hydration mismatch.
  useEffect(() => {
    setHasToken(!!localStorage.getItem("grantly_token"));
  }, []);

  // Auto-scroll to the bottom whenever a new chunk arrives or the panel opens.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || streaming) return;

    setError(null);
    setInput("");

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages([...nextMessages, { role: "assistant", content: "" }]);
    setStreaming(true);

    const token = localStorage.getItem("grantly_token");
    if (!token) {
      setError("Please log in to use the assistant.");
      setStreaming(false);
      return;
    }

    try {
      const body: Record<string, unknown> = {
        context_type: props.contextType,
        // Strip the seeded greeting so the model sees only the real conversation.
        messages: nextMessages.filter((m, i) => !(i === 0 && m.role === "assistant" && m.content === greeting)),
      };
      if (props.applicationId) body.application_id = props.applicationId;
      if (props.grantRoundId)  body.grant_round_id = props.grantRoundId;

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/ai/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          Accept: "text/event-stream",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error?.message ?? `Request failed (${res.status}).`);
      }

      // Parse OpenAI-style SSE: each event is a `data: {...}` line, terminated by `\n\n`.
      // Accumulate the delta `.choices[0].delta.content` strings into the last message.
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const event of events) {
          const line = event.split("\n").find((l) => l.startsWith("data: "));
          if (!line) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") continue;
          try {
            const json = JSON.parse(payload);
            const delta = json.choices?.[0]?.delta?.content ?? "";
            if (delta) {
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                return [...prev.slice(0, -1), { ...last, content: last.content + delta }];
              });
            }
          } catch {
            // OpenRouter sometimes sends keep-alive comments like `: OPENROUTER PROCESSING` — ignore.
          }
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong.";
      setError(msg);
      // Drop the empty assistant bubble we appended so the UI isn't blank.
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last.role === "assistant" && last.content === "") return prev.slice(0, -1);
        return prev;
      });
    } finally {
      setStreaming(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  // Hide the launcher entirely for logged-out visitors — the API requires auth.
  if (!hasToken) return null;

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-blue-700 transition-colors cursor-pointer"
          aria-label={buttonLabel}
        >
          <Sparkles className="w-4 h-4" />
          {buttonLabel}
        </button>
      )}

      {open && (
        <div className="fixed bottom-6 right-6 z-40 w-[min(380px,calc(100vw-2rem))] h-[min(560px,calc(100vh-3rem))] flex flex-col rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden">
          <header className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-semibold text-gray-900">{panelTitle}</span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
              aria-label="Close assistant"
            >
              <X className="w-4 h-4" />
            </button>
          </header>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap ${
                    m.role === "user" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {m.content || (
                    <span className="inline-flex items-center gap-1 text-gray-400">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Thinking…
                    </span>
                  )}
                </div>
              </div>
            ))}
            {error && <div className="text-xs text-red-600 px-1">{error}</div>}
          </div>

          <footer className="border-t border-gray-200 p-3 bg-white">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder="Ask a question…"
                disabled={streaming}
                className="flex-1 resize-none rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
              />
              <button
                type="button"
                onClick={sendMessage}
                disabled={streaming || !input.trim()}
                className="inline-flex items-center justify-center rounded-xl bg-blue-600 p-2.5 text-white hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                aria-label="Send message"
              >
                {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5 text-center">
              AI suggestions can be wrong. Always double-check important details.
            </p>
          </footer>
        </div>
      )}
    </>
  );
}

export type { ChatMessage };
