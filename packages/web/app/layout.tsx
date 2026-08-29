import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { AssumptionBar } from "@/components/AssumptionBar";
import { Footer } from "@/components/Footer";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "GALI — Ground-Truth Fundamental Intelligence for IDX Mining",
  description:
    "Valuation and risk analytics engine connecting IDX mining companies to geological reserves, concession lifespans, and real-time macroeconomic shock simulations.",
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
