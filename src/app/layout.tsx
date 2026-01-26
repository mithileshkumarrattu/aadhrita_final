import type { Metadata } from 'next';
import { AuthProvider } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';
import BottomNav from '@/components/BottomNav';
import './globals.css';
import { Toaster } from 'sonner';
import SmoothScroll from '@/components/SmoothScroll';
import Script from 'next/script';
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: 'Aadhrita 2026',
  description: 'Join us at Aadhrita 2026, the National Level Techno-Cultural Fest of MVGR College of Engineering. Experience the Weightless Kingdom.',
  keywords: ['Aadhrita', 'MVGR', 'Fest', 'Hackathon', 'Cultural', 'Technical', '2026'],
  openGraph: {
    title: 'Aadhrita 2026',
    description: 'Join us at Aadhrita 2026, the National Level Techno-Cultural Fest of MVGR College of Engineering.',
    type: 'website',
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="google-site-verification" content="Q8JbTmyQdlx9thG97r5X618Yl3UREtpLyS3UTbk3oY8" />
        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-QLPD9F8FPK"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-QLPD9F8FPK');
          `}
        </Script>
      </head>
      <body suppressHydrationWarning={true} className="bg-background text-foreground">
        <AuthProvider>
          <AuthGuard>
            <SmoothScroll />
            {children}
            <Analytics />
            <BottomNav />
            <Toaster position="top-center" richColors />
          </AuthGuard>
        </AuthProvider>
      </body>
    </html>
  );
}

