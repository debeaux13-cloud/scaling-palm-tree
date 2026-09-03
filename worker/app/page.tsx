import { Creator } from './creator';

const gardenDemo = 'https://d2ol7oe51mr4n9.cloudfront.net/user_3IAY4R3rShiuhyE65erIVhTcw2s/bdd8dbfe-7e2c-45ee-9e2e-be11dd2acf3a.mp4';
const halloweenDemo = 'https://d2ol7oe51mr4n9.cloudfront.net/user_3IAY4R3rShiuhyE65erIVhTcw2s/891fce1b-5caf-4a94-bd9a-2cf6b2601fe6.mp4';

export default function Home() {
  return <main>
    <nav className="nav"><a className="wordmark" href="#top"><span>Main Character</span><strong>Studios</strong><em>by Tiffani</em></a><div><a href="#how-it-works">How it works</a><a href="#create">Create a movie</a></div></nav>
    <section className="hero cosmic" id="top">
      <div className="hero-copy"><p className="eyebrow gold">Every child is the main character</p><h1>See their<br/><i>story</i> light up.</h1><p className="hero-text">Personalized animated movies and matching Storybooks starring the child, pet, or loved one at the heart of your world.</p><div className="hero-actions"><a className="button primary" href="#create">Discover the magic</a></div><p className="fine-print">A 60-second opening preview from the same story that becomes your finished movie and matching Storybook after purchase.</p></div>
      <div className="hero-reel" aria-label="Main Character Studios example movies">
        <div className="reel-glow" aria-hidden="true" />
        <div className="film-card film-card-main"><video controls playsInline preload="metadata" src={gardenDemo} aria-label="Main Character Studios personalized story example" /></div>
        <div className="film-card film-card-side"><video controls playsInline preload="metadata" src={halloweenDemo} aria-label="Main Character Studios personalized fall story example" /></div>
      </div>
    </section>
    <section className="journey" id="how-it-works"><p className="eyebrow">Your family&apos;s story, on screen</p><h2 className="section-title">A little bit of magic.<br/><i>A lifetime of memories.</i></h2><div className="steps"><article><b>01</b><h3>Share their spark</h3><p>Upload photos and tell us about the person or pet who will star in this adventure.</p></article><article><b>02</b><h3>Meet the movie</h3><p>Watch the first minute of a connected, personalized story made just for them.</p></article><article><b>03</b><h3>Keep the magic</h3><p>Unlock their full animated movie and the matching Storybook to treasure forever.</p></article></div></section>
    <section className="keepsake"><div className="keepsake-orbit">✦</div><div><p className="eyebrow gold">The complete keepsake</p><h2>One story.<br/><i>Two ways to remember.</i></h2></div><p>Your finished order includes a personalized movie and a matching Storybook PDF. Each page is a moment from the exact same story.</p></section>
    <section className="studio cosmic" id="create"><div className="studio-intro"><p className="eyebrow gold">The story studio</p><h2>Start their<br/><i>adventure.</i></h2><p>Create the beginning of a story they will love seeing themselves in.</p></div><Creator /></section>
    <footer><a className="wordmark" href="#top"><span>Main Character</span><strong>Studios</strong><em>by Tiffani</em></a><span>Stories written in starlight.</span></footer>
  </main>;
}
