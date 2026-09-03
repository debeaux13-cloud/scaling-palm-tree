'use client';

const TEMPLATE = 'https://raw.githubusercontent.com/debeaux13-cloud/scaling-palm-tree/main/Main%20Character%20Studios%20webpage.png';

export function Hero() {
  return (
    <section className="hero-section" aria-label="Main Character Studios storefront">
      <img src={TEMPLATE} alt="Main Character Studios by Tiffani storefront design" className="template-reference" />
      <nav className="template-hotspots" aria-label="Storefront navigation">
        <a className="hotspot home" href="#top" aria-label="Home" />
        <a className="hotspot how" href="#how-it-works" aria-label="How It Works" />
        <a className="hotspot examples" href="#demos" aria-label="Examples" />
        <a className="hotspot pricing" href="#pricing" aria-label="Pricing" />
        <a className="hotspot orders" href="#creator" aria-label="My Orders" />
        <a className="hotspot about" href="#about" aria-label="About Us" />
      </nav>
      <div className="hero-live-actions">
        <a href="#creator" className="hero-live-primary">START YOUR STORY</a>
        <a href="#demos" className="hero-live-secondary">WATCH REAL DEMOS</a>
      </div>
    </section>
  );
}
