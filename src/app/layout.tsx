import type { Metadata, Viewport } from "next";
import { Outfit, Inter } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-heading",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    template: "%s | Ruthva",
    default: "Ruthva | Treatment Continuity for Ayurveda Practices",
  },
  description: "Advanced continuous patient tracking and care management software designed for autonomous Ayurveda clinics.",
  keywords: ["Ayurveda software", "Patient tracking", "Clinic management", "Treatment continuity", "Ruthva"],
  authors: [{ name: "Ruthva" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://ruthva.com",
    title: "Ruthva | Treatment Continuity for Ayurveda Practices",
    description: "Advanced continuous patient tracking and care management software designed for autonomous Ayurveda clinics.",
    siteName: "Ruthva",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ruthva | Treatment Continuity for Ayurveda Practices",
    description: "Advanced continuous patient tracking and care management software designed for autonomous Ayurveda clinics.",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Ruthva",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#16a34a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${outfit.variable} ${inter.variable} antialiased`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
