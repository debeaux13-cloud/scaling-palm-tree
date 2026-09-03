'use client';

export function Hero() {
  return (
    <section className="hero-section">
      <div className="hero-background">
        <img 
          src="/images/hero-main.jpg" 
          alt="Family with treehouse and pets in magical adventure"
          className="hero-image"
        />
      </div>
      <div className="hero-content">
        <div className="hero-text">
          <p className="hero-eyebrow">Photos In. Movie Magic Out.</p>
          <h1 className="hero-title">Turn Your Photos Into Unforgettable <em>Animated Stories</em></h1>
          <p className="hero-subtitle">Cinematic. Emotional. One-of-a-kind. Starring you, your loved ones, or your pets.</p>
          
          <div className="hero-features">
            <div className="feature">
              <span className="feature-icon">✦</span>
              <div>
                <p className="feature-title">AI-Powered</p>
                <p className="feature-text">Advanced storytelling and animation</p>
              </div>
            </div>
            <div className="feature">
              <span className="feature-icon">⏱</span>
              <div>
                <p className="feature-title">3 or 5 Minutes</p>
                <p className="feature-text">Choose the perfect length for your story</p>
              </div>
            </div>
            <div className="feature">
              <span className="feature-icon">📖</span>
              <div>
                <p className="feature-title">PDF Storybook</p>
                <p className="feature-text">Beautiful matching storybook included</p>
              </div>
            </div>
          </div>

          <div className="hero-cta">
            <a href="#creator" className="btn-primary">✦ START YOUR STORY</a>
            <a href="#demos" className="btn-secondary">▶ WATCH DEMOS</a>
          </div>
          <p className="hero-note">Get 1 free 60-second preview • No payment required</p>
        </div>
      </div>
    </section>
  );
}
