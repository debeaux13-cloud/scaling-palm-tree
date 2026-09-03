'use client';

const LOGO = 'https://raw.githubusercontent.com/debeaux13-cloud/scaling-palm-tree/main/1788448191055.png';

export function Hero() {
  return (
    <>
      <header className="mcs-header">
        <a href="#top" className="mcs-brand"><img src={LOGO} alt="Main Character Studios by Tiffani" /><div><strong>Main Character Studios</strong><span>by Tiffani</span><small>WHERE YOUR STORY BECOMES A MOVIE</small></div></a>
        <nav><a href="#top">Home</a><a href="#how-it-works">How It Works</a><a href="#demos">Examples</a><a href="#pricing">Pricing</a><a href="#creator">Create Your Story</a></nav>
      </header>
      <section className="hero-section">
        <div className="hero-copy"><p className="eyebrow">PHOTOS IN. MOVIE MAGIC OUT.</p><h1>Turn Your Photos Into Unforgettable <em>Animated Stories</em></h1><p className="hero-sub">Cinematic. Emotional. One-of-a-kind. Starring you, your loved ones, or your pets.</p><div className="hero-points"><span>✦ AI-powered storytelling + animation</span><span>◷ 3-minute movie · $49</span><span>∞ Make as many stories as you want</span></div><div className="hero-actions"><a href="#creator" className="hero-live-primary">START YOUR STORY</a><a href="#demos" className="hero-live-secondary">WATCH REAL DEMOS</a></div><p className="preview-note">Get 1 free 60-second preview · No payment required · $79 5-minute movie coming soon</p></div>
        <div className="hero-art" aria-label="Main Character Studios cinematic world"><img src={LOGO} alt="Main Character Studios by Tiffani logo" /></div>
      </section>
    </>
  );
}
