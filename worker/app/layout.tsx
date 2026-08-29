import type { Metadata } from 'next';
import './styles.css';

export const metadata: Metadata = {
  title: 'Main Characters Studios by Tiffani',
  description: 'Personalized AI movies and matching storybooks made from your people, pets, memories, and ideas.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
