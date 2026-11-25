import type { Metadata } from "next";
import { AppProviders } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "CCI STEM Connect — Professional Engagement & Impact Measurement",
  description:
    "Event intelligence, participant impact assessment, reflective question cards, and longitudinal outcome tracking for CCI STEM Connect.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
