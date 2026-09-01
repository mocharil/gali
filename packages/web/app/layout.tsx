import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { AssumptionBar } from "@/components/AssumptionBar";
import { Footer } from "@/components/Footer";
import { Providers } from "./providers";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
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
  return (
    <html lang="en" className={`dark ${plusJakarta.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-[#060911] text-slate-100 font-sans antialiased min-h-screen flex flex-col selection:bg-amber-500/30 selection:text-amber-200 bg-ambient-radial">
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
