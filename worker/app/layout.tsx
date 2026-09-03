import type { Metadata } from 'next';
import './styles.css';
import './storefront.css';
import { ClerkProvider } from '@clerk/nextjs';
import { SpeedInsights } from '@vercel/speed-insights/next';

export const metadata: Metadata = { title: 'Main Character Studios by Tiffani', description: 'Personalized cinematic animated movies and matching digital Storybooks starring the people and pets you love.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <ClerkProvider><html lang="en"><body>{children}<SpeedInsights /></body></html></ClerkProvider>; }
