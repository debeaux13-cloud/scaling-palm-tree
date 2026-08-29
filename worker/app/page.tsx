import { Creator } from './creator';

export default function Home() {
  return <main>
    <p className="eyebrow">Private build workspace</p>
    <h1>MCS Studio Lab</h1>
    <p className="intro">Create story direction, then turn approved prompts into character video with synced audio. This workspace remains separate from the live Main Characters Studios website.</p>
    <Creator />
    <aside><strong>Private delivery</strong><p>Completed videos are held in Worker’s private Vercel Blob store. This first screen confirms creation and status; sharing/download controls come next.</p></aside>
  </main>;
}
