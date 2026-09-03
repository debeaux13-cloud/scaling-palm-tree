import { Creator } from './creator';
import { OneMinuteCopy } from './one-minute-copy';
import { Hero } from './hero';
import { DemoGallery } from './demo-gallery';
import './storefront-template.css';
import './hero.css';
import './demo-gallery.css';
import './launch-final.css';

export default function Home() {
  return (
    <main>
      <Hero />
      <DemoGallery />
      <Creator />
    </main>
  );
}
