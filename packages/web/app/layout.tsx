import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { Providers } from "./providers";
import { datasetStatus } from "@/lib/simulation/dataset";
import { DatasetNotice } from "@/components/DatasetContext";

export const dynamic = "force-dynamic";

const jakarta = localFont({
  src: "./fonts/PlusJakartaSans-Variable.ttf",
  variable: "--font-gali",
  display: "swap",
  weight: "200 800",
});

const SITE_URL = "https://gali-web.vercel.app";
const TITLE = "GALI — Ground-Truth Fundamental Intelligence for IDX Mining";
const DESCRIPTION =
  "Valuation and risk analytics engine connecting IDX mining companies to geological reserves, concession lifespans, and real-time macroeconomic shock simulations.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s · GALI",
  },
  description: DESCRIPTION,
  keywords: [
    "IDX",
    "mining",
    "coal",
    "reserve life index",
    "market intelligence",
    "Sectors Hackathon",
  ],
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: "GALI",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const dataset = datasetStatus();
  return (
    <html lang="en" className={jakarta.variable}>
      <body data-dataset-mode={dataset.mode} data-dataset-as-of={dataset.as_of ?? ""} className="bg-canvas text-ink font-sans antialiased min-h-screen selection:bg-brand-soft selection:text-brand">
        <Providers dataset={dataset}>
          <AppShell>
            <main className="flex-1 bg-ambient-radial"><DatasetNotice />{children}</main>
          </AppShell>
        </Providers>
      </body>
    </html>
  );
}
