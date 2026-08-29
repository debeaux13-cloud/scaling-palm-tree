import type { Metadata } from 'next';
import './styles.css';
import { ClerkProvider } from '@clerk/nextjs';

export const metadata: Metadata = { title: 'Main Characters Studios by Tiffani', description: 'Personalized movies and matching Storybooks for children.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <ClerkProvider><html lang="en"><body>{children}</body></html></ClerkProvider>; }
