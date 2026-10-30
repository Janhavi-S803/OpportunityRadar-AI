import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/components/providers/theme-provider';

export const metadata: Metadata = {
  title: {
    template: '%s | OpportunityRadar AI',
    default: 'OpportunityRadar AI — Your Next Opportunity Is Out There. We\'ll Find It.',
  },
  description: 'AI-powered opportunity discovery platform for students and early-career professionals. Find internships, scholarships, hackathons, research programs and jobs matched to your profile.',
  keywords: ['internship', 'scholarship', 'hackathon', 'research', 'opportunities', 'AI', 'career'],
  openGraph: {
    title: 'OpportunityRadar AI',
    description: 'Discover opportunities matched to your profile with AI-powered research.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          {children}
          <Toaster position="top-right" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
