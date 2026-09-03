'use client';

export function Hero() {
  return (
    <section className="hero-section">
      <div className="hero-background"><img src="/Main Character Studios webpage.png" alt="Main Character Studios animated story template" className="hero-image" /></div>
      <div className="hero-content"><div className="hero-text">
        <p className="hero-eyebrow">Photos In. Movie Magic Out.</p>
        <h1 className="hero-title">Turn Your Photos Into Unforgettable <em>Animated Stories</em></h1>
        <p className="hero-subtitle">Cinematic. Emotional. One-of-a-kind. Starring you, your loved ones, or your pets.</p>
        <div className="hero-features">
          <div className="feature"><span className="feature-icon">✦</span><div><p className="feature-title">AI-Powered</p><p className="feature-text">Storytelling + animation</p></div></div>
          <div className="feature"><span className="feature-icon">⏱</span><div><p className="feature-title">3-Minute Movie</p><p className="feature-text">$49</p></div></div>
          <div className="feature"><span className="feature-icon">∞</span><div><p className="feature-title">Make More Anytime</p><p className="feature-text">Buy as many stories as you want</p></div></div>
        </div>
        <div className="hero-cta"><a href="#creator" className="btn-primary">✦ START YOUR STORY</a><a href="#demos" className="btn-secondary">▶ WATCH DEMOS</a></div>
        <p className="hero-note">Get 1 free 1-minute preview • No payment required • 5-minute movie $79 coming soon</p>
      </div></div>
    </section>
  );
}
