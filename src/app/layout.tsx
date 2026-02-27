import type { Metadata } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "VoltMatch — Incentives in Seconds. Energy Plans in Minutes.",
  description:
    "Find every energy incentive program your building qualifies for in 60 seconds. Free self-serve building energy assessment. No vendors, no pressure.",
  openGraph: {
    type: "website",
    url: "https://voltmatch.ca/",
    title: "VoltMatch — Find Your Building's Energy Incentives in 60 Seconds",
    description:
      "Search 100+ incentive programs across Canada. Free self-serve building energy assessment. No vendors, no pressure.",
    locale: "en_CA",
    siteName: "VoltMatch",
  },
  twitter: {
    card: "summary_large_image",
    title: "VoltMatch — Find Your Building's Energy Incentives in 60 Seconds",
    description:
      "Search 100+ incentive programs across Canada. Free. Self-serve. No vendors.",
  },
  alternates: {
    canonical: "https://voltmatch.ca/",
    languages: { "en-CA": "https://voltmatch.ca/" },
  },
  other: {
    "geo.region": "CA-ON",
    "geo.placename": "Ontario, Canada",
  },
};

const jsonLdOrganization = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "VoltMatch",
  url: "https://voltmatch.ca",
  description:
    "Energy incentive matching and building assessment platform for commercial buildings in Canada.",
  foundingDate: "2026",
  areaServed: { "@type": "Country", name: "Canada" },
  sameAs: [],
};

const jsonLdWebApp = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "VoltMatch",
  description:
    "Find every energy incentive program your commercial building qualifies for. Free self-serve energy assessment with savings estimates, CO₂ baseline, and project recommendations.",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web-based",
  browserRequirements: "Requires modern web browser with JavaScript",
  url: "https://voltmatch.ca",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "CAD",
    description: "Free - all three assessment tiers",
  },
  author: { "@type": "Organization", name: "VoltMatch" },
  featureList: [
    "Incentive program matching across 100+ federal, provincial, and utility programs",
    "Self-serve building energy assessment",
    "CO₂ baseline calculation",
    "Savings estimates and project recommendations",
    "No account required for initial search",
  ],
};

const jsonLdFaq = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Is VoltMatch really free?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. All three tiers — Incentive Match, Building Discovery, and Energy Planner — are completely free. No credit card, no hidden fees.",
      },
    },
    {
      "@type": "Question",
      name: "How does VoltMatch find incentive programs for my building?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "VoltMatch searches across 100+ federal, provincial, utility, and municipal incentive programs using your postal code and building type. We track programs from SaveOnEnergy, Enbridge Gas, federal tax credits, and 60+ local utility programs across Canada.",
      },
    },
    {
      "@type": "Question",
      name: "Do I need to talk to a vendor or salesperson?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. VoltMatch is 100% self-serve. You get your results directly — no vendor calls, no sales pitches. When you're ready to talk to someone, that's on your terms.",
      },
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLdOrganization),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdWebApp) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
