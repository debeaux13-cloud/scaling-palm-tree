import { Creator } from './creator';

export default function Home() {
  return (
    <main className="site-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">MCS</span>
          <div>
            <p className="brand-name">Main Characters Studios</p>
            <p className="brand-byline">by Tiffani</p>
          </div>
        </div>
        <div className="topbar-note">Personalized AI movies + storybooks</div>
      </header>

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow">Your story. Your character. Your movie.</p>
          <h1 id="hero-title">Main Characters Studios <span>by Tiffani</span></h1>
          <p className="intro">
            Turn a favorite person, pet, memory, or wild idea into a personalized cinematic story made just for you.
          </p>
          <div className="hero-pills" aria-label="Product highlights">
            <span>Personalized stories</span>
            <span>Animated movies</span>
            <span>Matching storybooks</span>
          </div>
        </div>

        <div className="hero-card" aria-hidden="true">
          <div className="film-frame frame-one" />
          <div className="film-frame frame-two" />
          <div className="film-frame frame-three" />
          <div className="hero-card-copy">
            <span>YOUR STORY</span>
            <strong>TAKES CENTER STAGE</strong>
          </div>
        </div>
      </section>

      <section className="value-strip" aria-label="How it works">
        <div><strong>1</strong><span>Tell us the story</span></div>
        <div><strong>2</strong><span>Watch it come alive</span></div>
        <div><strong>3</strong><span>Keep the movie + book</span></div>
      </section>

      <section className="studio-panel" aria-labelledby="studio-title">
        <div className="studio-heading">
          <p className="eyebrow">Create your movie</p>
          <h2 id="studio-title">Step into the studio</h2>
          <p>Build your story below and watch your character become the main event.</p>
        </div>
        <Creator />
      </section>

      <aside className="delivery-card">
        <div className="delivery-icon" aria-hidden="true">✦</div>
        <div>
          <strong>Your finished story stays yours.</strong>
          <p>Completed movies are delivered privately, with your matching storybook kept together with your project.</p>
        </div>
      </aside>

      <footer>
        <p>Main Characters Studios <span>by Tiffani</span></p>
        <small>Make yourself the main character.</small>
      </footer>
    </main>
  );
}
