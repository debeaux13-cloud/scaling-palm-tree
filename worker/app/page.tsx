import { Creator } from './creator';

const demoUrl = 'https://worker-c8pjmcclt-yh6w2h5n8y-9569s-projects.vercel.app';

export default function Home() {
  return <main>
    <nav className="nav"><a className="brand" href="#top">Main Characters<br /><em>Studios by Tiffani</em></a><div><a href="#how-it-works">How it works</a><a href="#create">Create a story</a></div></nav>
    <section className="hero" id="top">
      <div className="hero-copy"><p className="eyebrow">Your child is the star</p><h1>Stories made<br /><i>for their</i> imagination.</h1><p className="hero-text">A personalized movie and matching Storybook created around the little character you love most.</p><div className="hero-actions"><a className="button primary" href="#create">Create a free preview</a><a className="button ghost" href={demoUrl}>Try the demo</a></div><p className="fine-print">Your preview includes a 60-second movie and a six-page Storybook.</p></div>
      <div className="hero-art" aria-label="Magical storybook illustration"><div className="moon"/><div className="spark spark-one"/><div className="spark spark-two"/><div className="star-character"><span className="hair"/><span className="face"/><span className="body"/><span className="book">✦</span></div><p>Every child deserves<br />to see themselves shine.</p></div>
    </section>
    <section className="journey" id="how-it-works"><p className="eyebrow">A little magic in three steps</p><div className="steps"><article><b>01</b><h2>Tell us their world</h2><p>Share a story idea, their personality, and the kind of adventure they would love.</p></article><article><b>02</b><h2>Watch the preview</h2><p>Enjoy the first six scenes of their one-of-a-kind movie and matching Storybook.</p></article><article><b>03</b><h2>Keep the whole story</h2><p>Unlock the full movie and a beautiful Storybook made from the very same scenes.</p></article></div></section>
    <section className="keepsake"><div><p className="eyebrow">More than a movie</p><h2>A keepsake they<br /><i>will come back to.</i></h2></div><p>Your finished order includes a personalized movie and a matching Storybook PDF. Every page belongs to a moment from their story.</p></section>
    <section className="studio" id="create"><div className="studio-intro"><p className="eyebrow">The story studio</p><h2>Start their<br />next adventure.</h2><p>Make a free story preview. The creator is private so your ideas and finished videos stay protected.</p></div><Creator /></section>
    <footer><span>Main Characters Studios by Tiffani</span><span>Made for big imaginations.</span></footer>
  </main>;
}
