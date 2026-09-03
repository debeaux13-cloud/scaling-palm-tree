import { Creator } from './creator';
import { Hero } from './hero';
import { DemoGallery } from './demo-gallery';
import './storefront-template.css';
import './hero.css';
import './demo-gallery.css';
import './launch-final.css';

export default function Home() {
  return (
    <main id="top">
      <Hero />
      <section id="how-it-works" className="live-note"><h2>How It Works</h2><p>Upload your photo, choose the vibe, watch your free 1-minute preview, then unlock the rest of the same cohesive movie.</p></section>
      <section id="pricing" className="live-note"><h2>$49 · 3-Minute Movie</h2><p>Includes the free 1-minute preview. $79 · 5-Minute Movie — coming soon.</p></section>
      <DemoGallery />
      <section id="about" className="live-note"><h2>Everyone deserves a story where they’re the star.</h2><p>Create as many different Main Character Studios stories as you want.</p></section>
      <Creator />
    </main>
  );
}
