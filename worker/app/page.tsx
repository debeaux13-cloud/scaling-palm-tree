import { Creator } from './creator';

export default function Home() {
  return <main>
    <nav className="nav">
      <a className="wordmark" href="#top" aria-label="Main Character Studios by Tiffani">
        <span>Main Character</span><strong>Studios</strong><em>by Tiffani</em>
      </a>
      <div><a href="#films">See the magic</a><a href="#how-it-works">How it works</a><a className="nav-create" href="#create">Create a movie</a></div>
    </nav>

    <section className="hero cosmic" id="top">
      <div className="hero-stars" aria-hidden="true" />
      <div className="hero-copy">
        <p className="eyebrow gold">Every child is the main character</p>
        <h1>See their<br/><i>story</i> light up.</h1>
        <p className="hero-text">Personalized animated movies and matching Storybooks starring the child, pet, or loved one at the heart of your world.</p>
        <div className="hero-actions"><a className="button primary" href="#create">Discover the magic</a><a className="button ghost" href="#films">Watch a story</a></div>
        <p className="fine-print">A 60-second opening preview from the same story that becomes your finished movie and matching Storybook after purchase.</p>
      </div>

      <div className="hero-reel" id="films">
        <div className="reel-glow" aria-hidden="true" />
        <div className="film-card film-card-main">
          <div className="film-perf" aria-hidden="true" />
          <video controls playsInline preload="metadata" src="/api/storefront-demos/garden" aria-label="Main Character Studios personalized story demo" />
        </div>
        <div className="film-card film-card-side">
          <div className="film-perf" aria-hidden="true" />
          <video controls playsInline preload="metadata" src="/api/storefront-demos/halloween" aria-label="Main Character Studios personalized fall story demo" />
        </div>
        <div className="reel-caption"><span>✦</span><p>Made for the ones<br/>you never stop loving.</p></div>
      </div>
    </section>

    <section className="journey" id="how-it-works">
      <div className="section-heading"><p className="eyebrow">Your family&apos;s story, on screen</p><h2 className="section-title">A little bit of magic.<br/><i>A lifetime of memories.</i></h2></div>
      <div className="steps">
        <article><b>01</b><h3>Share their spark</h3><p>Upload photos and tell us about the person or pet who will star in this adventure.</p></article>
        <article><b>02</b><h3>Meet the movie</h3><p>Watch the first minute of a connected, personalized story made just for them.</p></article>
        <article><b>03</b><h3>Keep the magic</h3><p>Unlock their full animated movie and the matching Storybook to treasure forever.</p></article>
      </div>
    </section>

    <section className="keepsake">
      <div className="keepsake-mark" aria-hidden="true"><span>✦</span></div>
      <div><p className="eyebrow gold">The complete keepsake</p><h2>One story.<br/><i>Two ways to remember.</i></h2></div>
      <p>Your finished order includes a personalized movie and a matching Storybook PDF. Each page is a moment from the exact same story.</p>
    </section>

    <section className="studio cosmic" id="create">
      <div className="studio-intro"><p className="eyebrow gold">The story studio</p><h2>Start their<br/><i>adventure.</i></h2><p>Create the beginning of a story they will love seeing themselves in.</p><div className="studio-rule"><span>✦</span></div></div>
      <Creator />
    </section>

    <footer><a className="wordmark" href="#top"><span>Main Character</span><strong>Studios</strong><em>by Tiffani</em></a><span>Stories written in starlight.</span></footer>
  </main>;
}
