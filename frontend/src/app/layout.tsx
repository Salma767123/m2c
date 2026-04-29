import type { Metadata } from "next";
import { Outfit, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/UI/Toaster";
import PageTracker from "@/components/Analytics/PageTracker";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
      >
        <PageTracker />
        {children}
        <Toaster />
      </body>
    </html>
  );
}