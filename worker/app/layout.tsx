import type { Metadata } from 'next';
import './styles.css';

export const metadata: Metadata = { title: 'Main Characters Studios by Tiffani', description: 'Personalized movies and matching Storybooks for children.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
