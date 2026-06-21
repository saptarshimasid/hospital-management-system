import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Health Copilot | Clinical Command Center & AI Decision Support",
  description: "Next-generation AI clinical decision support platform for high-stakes medical environments. Powered by Google Gemini and OpenAI to assist hospital staff in diagnostics, patient triage, and workflow management.",
  keywords: ["AI medical assistant", "clinical decision support", "hospital command center", "clinical copilot", "healthcare automation"],
  authors: [{ name: "Health Copilot Systems" }],
  openGraph: {
    title: "Health Copilot | Clinical Command Center",
    description: "Futuristic clinical coordination portal powered by multi-agent AI networks.",
    url: "https://github.com/saptarshimasid/hospital-management-system",
    siteName: "Health Copilot",
    images: [
      {
        url: "https://lh3.googleusercontent.com/aida-public/AB6AXuDtYyYVa3FO9vaPrSmBZelDD_KjbHR9c0d1sFS2ODZT3zokO4XbsJeqP096Xkr0RoDzPiQ8-lkbZpHJyvvJ7j21EGO7lGSTMeCeT7hhi6oyx73Eli3DNRBQnSLTnDVcZMxJpb_M3MECQI7qTjL70ix4Gxu1TP0f8N6RqMwmjNpCRHb8fKAFNds0YE3kmFNu6WbBu6ChXmq4c1uxQcoG1h7yt6xPbGwGEWyJGfzjpEtSLYrApKCoZaKLZLuqiyiSPJIcExvIpS7Qf8o",
        width: 1200,
        height: 630,
        alt: "Health Copilot Clinical Dashboard",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Health Copilot | Clinical Command Center",
    description: "Next-gen AI clinical decision support platform.",
    images: ["https://lh3.googleusercontent.com/aida-public/AB6AXuDtYyYVa3FO9vaPrSmBZelDD_KjbHR9c0d1sFS2ODZT3zokO4XbsJeqP096Xkr0RoDzPiQ8-lkbZpHJyvvJ7j21EGO7lGSTMeCeT7hhi6oyx73Eli3DNRBQnSLTnDVcZMxJpb_M3MECQI7qTjL70ix4Gxu1TP0f8N6RqMwmjNpCRHb8fKAFNds0YE3kmFNu6WbBu6ChXmq4c1uxQcoG1h7yt6xPbGwGEWyJGfzjpEtSLYrApKCoZaKLZLuqiyiSPJIcExvIpS7Qf8o"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full scroll-smooth dark" suppressHydrationWarning>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Geist:wght@400;500;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
        {/* JSON-LD Schema markup for SEO & AEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "MedicalBusiness",
              "name": "Health Copilot Systems",
              "image": "https://lh3.googleusercontent.com/aida-public/AB6AXuDtYyYVa3FO9vaPrSmBZelDD_KjbHR9c0d1sFS2ODZT3zokO4XbsJeqP096Xkr0RoDzPiQ8-lkbZpHJyvvJ7j21EGO7lGSTMeCeT7hhi6oyx73Eli3DNRBQnSLTnDVcZMxJpb_M3MECQI7qTjL70ix4Gxu1TP0f8N6RqMwmjNpCRHb8fKAFNds0YE3kmFNu6WbBu6ChXmq4c1uxQcoG1h7yt6xPbGwGEWyJGfzjpEtSLYrApKCoZaKLZLuqiyiSPJIcExvIpS7Qf8o",
              "description": "Multi-agent AI platform orchestrating clinical diagnostics, patient triage, and workflow management.",
              "url": "https://github.com/saptarshimasid/hospital-management-system",
              "knowsAbout": ["Clinical Decision Support System", "AI Medical Triage", "Medical Command Center Software"],
              "medicalSpecialty": "EmergencyMedicine",
            }),
          }}
        />
      </head>
      <body className="min-h-full bg-[#0b1326] text-[#dae2fd] antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
