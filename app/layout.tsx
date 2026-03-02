import type { Metadata, Viewport } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { ConditionalLayout } from '@/components/ConditionalLayout'
import { OrganizationSchema, WebSiteSchema } from '@/components/JsonLd'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
}

export const metadata: Metadata = {
  title: {
    default: 'Dumpster Rental San Diego | Affordable Roll Off Containers | SD Dumping Solutions',
    template: '%s | SD Dumping Solutions'
  },
  description: 'Affordable dumpster rental San Diego with same day delivery. Roll off containers, residential & commercial dumpster rental, construction debris removal. Call (760) 270-0312 for a free quote!',
  keywords: [
    'container rental',
    'dumpster rental',
    'construction waste',
    'renovation debris',
    'waste management',
    'San Diego',
    'construction containers',
    'roll-off containers',
    'debris removal',
    'construction cleanup'
  ],
  authors: [{ name: 'SD Dumping Solutions' }],
  creator: 'SD Dumping Solutions',
  publisher: 'SD Dumping Solutions',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://www.sddumpingsolutions.com'),
  alternates: {
    canonical: '/',
  },
      openGraph: {
      type: 'website',
      locale: 'en_US',
      url: 'https://www.sddumpingsolutions.com',
      siteName: 'SD Dumping Solutions',
      title: 'SD Dumping Solutions - Dumpster Rental San Diego',
      description: 'Affordable dumpster rental San Diego with same day delivery. Roll off containers, residential & commercial dumpster rental. Call (760) 270-0312!',
      images: [
        {
          url: 'https://res.cloudinary.com/dku1gnuat/image/upload/f_auto,q_auto/sddumps/miniature.png',
          width: 1200,
          height: 630,
          alt: 'SD Dumping Solutions - Dumpster Rental San Diego',
        },
      ],
    },
      twitter: {
      card: 'summary_large_image',
      title: 'SD Dumping Solutions - Professional Container Rental Services',
      description: 'Professional container rental services for construction, renovation, and waste management. Fast delivery, competitive pricing, and reliable service across San Diego.',
      images: ['https://res.cloudinary.com/dku1gnuat/image/upload/f_auto,q_auto/sddumps/miniature.png'],
      creator: '@sddumps',
    },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: '', // Add your Google Search Console verification code
  },
  category: 'construction services',
  classification: 'business',
  referrer: 'origin-when-cross-origin',
  icons: {
    icon: [
      { url: '/favicon/favicon.ico', sizes: '32x32' },
      { url: '/favicon/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/favicon/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/favicon/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: [
      { url: '/favicon/favicon.ico' },
    ],
    other: [
      { rel: 'mask-icon', url: '/favicon/favicon.svg', color: '#000000' },
    ],
  },
  manifest: '/site.webmanifest',
  other: {
    'msapplication-TileColor': '#000000',
    'msapplication-config': '/browserconfig.xml',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        {/* Google Tag Manager */}
        <script dangerouslySetInnerHTML={{__html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-PZQT5B2J');`}} />
        {/* End Google Tag Manager */}
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
        `}</style>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <meta name="application-name" content="SD Dumping Solutions" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="SD Dumping Solutions" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        <meta name="msapplication-TileColor" content="#000000" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="theme-color" content="#ffffff" />
        <script src="https://analytics.ahrefs.com/analytics.js" data-key="YQSE9IfTg0mSXOmHceksBA" async></script>
        <OrganizationSchema />
        <WebSiteSchema />
      </head>
      <body suppressHydrationWarning>
        {/* Google Tag Manager (noscript) */}
        <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-PZQT5B2J"
height="0" width="0" style={{display:'none',visibility:'hidden'}}></iframe></noscript>
        {/* End Google Tag Manager (noscript) */}
        <ConditionalLayout>
          {children}
        </ConditionalLayout>
      </body>
    </html>
  )
}
