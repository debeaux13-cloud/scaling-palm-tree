import type { Metadata } from 'next';
import './styles.css';

export const metadata: Metadata = {
  title: 'MCS Studio Lab',
  description: 'A private workspace for story, sound, and motion production.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
