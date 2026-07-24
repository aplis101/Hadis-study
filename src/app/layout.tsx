import type { Metadata, Viewport } from "next"
import { Amiri, Inter, IBM_Plex_Sans_Arabic } from "next/font/google"
import "./globals.css"
import { Navbar } from "@/components/layout/Navbar"
import { ToastProvider } from "@/components/ui/Toast"
import { SupabaseListener } from "@/components/layout/SupabaseListener"

const amiri = Amiri({
  subsets: ["arabic"],
  weight: ["400", "700"],
  variable: "--font-amiri",
  display: "swap",
})

const ibmPlexSansArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "600", "700"],
  variable: "--font-plex-sans-arabic",
  display: "swap",
})

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
})

export const metadata: Metadata = {
  title: "منصة الحديث الشريف",
  description: "منصة تفاعلية لحفظ وضبط نطق الحديث الشريف",
  manifest: "/manifest.json",
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
  },
}

export const viewport: Viewport = {
  themeColor: "#047857",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      dir="rtl"
      lang="ar"
      className={`${amiri.variable} ${ibmPlexSansArabic.variable} ${inter.variable} h-full`}
    >
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body className="min-h-full flex flex-col bg-stone-50 text-stone-900 font-sans antialiased">
        <ToastProvider>
          <SupabaseListener />
          <Navbar />
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}
