import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
// PrelineScript wires up Preline's interactive JS on every page and route change
import PrelineScript from "@/components/preline-script";
// ToastProvider makes the global floating toast system available to every page in the app
import { ToastProvider } from "@/contexts/ToastContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Page title shown in browser tab and search engine results
  title: "Grantly: Community Grant Application Portal",
  description:
    "Grantly connects Australian organisations with community grant funding. Browse open rounds, submit applications, and track your progress.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* ToastProvider wraps everything so any page can call useToast() to show a floating toast */}
        <ToastProvider>
          {children}
        </ToastProvider>
        {/* PrelineScript renders nothing visible — it only initialises Preline JS */}
        <PrelineScript />
      </body>
    </html>
  );
}
