import type { Metadata } from "next";
import type { ReactNode } from "react";

import { OnboardingProvider } from "@/components/providers/onboarding-provider";

import "./globals.css";

export const metadata: Metadata = {
  title: "Proof",
  description: "Execution accountability system for ambitious people.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <OnboardingProvider>{children}</OnboardingProvider>
      </body>
    </html>
  );
}
