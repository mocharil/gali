import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { AssumptionBar } from "@/components/AssumptionBar";
import { Footer } from "@/components/Footer";
import { Providers } from "./providers";

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
    "batubara",
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
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#080c14] text-slate-100 antialiased min-h-screen flex flex-col selection:bg-amber-500/30 selection:text-amber-200">
        <Providers>
          <Navbar />
          <AssumptionBar />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
