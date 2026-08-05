import type { Metadata } from "next";
import { Outfit, Poppins } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/UI/Toaster";
import PageTracker from "@/components/Analytics/PageTracker";
import { ExchangeRateLoader } from "@/components/Shared/ExchangeRateLoader";
import DocViewerProvider from "@/components/Shared/DocViewerProvider";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

// Headings use Poppins. The variable name is kept as --font-playfair so every existing
// `font-playfair` usage across the site switches to Poppins with no per-component edits.
const playfair = Poppins({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "M2C-Direct From Manufacturer To Customer",
  description: "Wholesale products directly from manufacturers to customers with M2C's streamlined platform.",
  icons: {
    icon: [
      {
        url: "/assets/logo/dark.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/assets/logo/light.png",
        media: "(prefers-color-scheme: light)",
      },
    ],
    apple: [
      {
        url: "/assets/logo/light.png",
        sizes: "180x180",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`${outfit.variable} ${playfair.variable} font-outfit antialiased h-full`}
        suppressHydrationWarning
      >
        <PageTracker />
        <ExchangeRateLoader />
        {children}
        <Toaster />
        <DocViewerProvider />
      </body>
    </html>
  );
}