import type { Metadata } from 'next';
import {
  Outfit,
  Hind_Siliguri,
  JetBrains_Mono,
} from 'next/font/google';
import './globals.css';

const outfitDisplay = Outfit({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800', '900'],
  variable: '--font-display',
  display: 'swap',
});

const outfitSans = Outfit({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

const hindSiliguri = Hind_Siliguri({
  subsets: ['bengali'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-bn',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-mono',
  display: 'swap',
});

const appUrl = process.env.APP_URL || 'https://krishivumi-erp.bd';

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: 'KrishiVumi Enterprise — Dynamic Multi-Business Agro ERP',
    template: '%s | KrishiVumi Enterprise Agro ERP',
  },
  description:
    'Production-grade multi-business agro ERP platform for Poultry, Cattle, Goat, Aquaculture, Transport, Double-Entry Accounting, and Inventory operations in Bangladesh and beyond.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'KrishiVumi Enterprise — Dynamic Multi-Business Agro ERP',
    description:
      'Production-grade multi-business agro ERP platform for Poultry, Cattle, Goat, Aquaculture, Transport, Double-Entry Accounting, and Inventory operations in Bangladesh and beyond.',
    url: appUrl,
    siteName: 'KrishiVumi Enterprise',
    type: 'website',
    locale: 'en_BD',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KrishiVumi Enterprise — Dynamic Multi-Business Agro ERP',
    description:
      'Production-grade multi-business agro ERP platform for Poultry, Cattle, Goat, Aquaculture, Transport, Double-Entry Accounting, and Inventory operations in Bangladesh and beyond.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'KrishiVumi Enterprise Agro ERP',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description:
      'Enterprise Dynamic Multi-Business Agro ERP system managing Poultry, Cattle, Goat, Fish Farming, Transport Logistics, Double-Entry Accounting, and Inventory in Bangladesh.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'BDT',
    },
  };

  return (
    <html
      lang="en"
      className={`${outfitDisplay.variable} ${outfitSans.variable} ${hindSiliguri.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className="bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 antialiased selection:bg-emerald-600 selection:text-white"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
