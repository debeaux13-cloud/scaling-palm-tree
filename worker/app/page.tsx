const stages = [
  ['1', 'Story', 'Create a script, shot list, and character direction.'],
  ['2', 'Sound', 'Produce narration, dialogue, music, and effects.'],
  ['3', 'Motion', 'Send approved shots to the video-render provider.'],
  ['4', 'Deliver', 'Keep private source media and final MP4s in Blob.'],
];

export default function Home() {
  return (
    <main>
      <p className="eyebrow">Private build workspace</p>
      <h1>MCS Studio Lab</h1>
      <p className="intro">A separate production pipeline for stories, character movement, sound, and finished video — independent from the live Main Characters Studios website.</p>
      <section aria-label="Production workflow">
        {stages.map(([number, title, description]) => (
          <article key={number}>
            <span>{number}</span><h2>{title}</h2><p>{description}</p>
          </article>
        ))}
      </section>
      <aside>
        <strong>Foundation status</strong>
        <p>Next.js workspace and private Blob media storage are ready. Video and voice providers will be connected only after their accounts and billing are selected.</p>
      </aside>
    </main>
  );
}
