'use client';

const TEMPLATE = 'https://raw.githubusercontent.com/debeaux13-cloud/scaling-palm-tree/main/Main%20Character%20Studios%20webpage.png';

export function Hero() {
  return (
    <section className="hero-section" aria-label="Main Character Studios storefront">
      <img src={TEMPLATE} alt="Main Character Studios by Tiffani storefront design" className="template-reference" />
      <div className="hero-live-actions">
        <a href="#creator" className="hero-live-primary">START YOUR STORY</a>
        <a href="#demos" className="hero-live-secondary">WATCH DEMOS</a>
      </div>
    </section>
  );
}
