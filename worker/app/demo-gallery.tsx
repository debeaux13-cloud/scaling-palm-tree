'use client';

export function DemoGallery() {
  const demos = [
    { title: 'Fantasy Worlds', subtitle: 'Magic, wonder and cinematic storybook adventures', src: '/bb2d76adcbaed338e7f9c7049a2a874c76e4ef2e842b6407d0cefd8dea23db44.MP4' },
    { title: 'Pet Adventures', subtitle: 'Dogs, cats and the whole crew become the stars', src: '/92c188437820364e6cbd74dc26272c64092da7841d3ab6b82b511dac740aa7da.MP4' },
    { title: 'Family Adventures', subtitle: 'Warm cinematic adventures starring the whole family', src: '/f080f5f16d6ab3340e077d9279ec37798ed60653b0015801afdc9ad2ecb4c0e8.MP4' },
    { title: 'Sci-Fi Worlds', subtitle: 'Big adventures in impossible futuristic worlds', src: '/29f2ba617ca782724186fc33b14c5270579793f4d16ed7f27337fcfa40bf20b8.MP4' },
    { title: 'Special Moments', subtitle: 'Love, weddings, celebrations and unforgettable memories', src: '/f6eb27ddf0095727546f2458b95b414bfd131f7992c15efeff9babcbf8334a48.MP4' }
  ];

  return (
    <section id="demos" className="demo-section">
      <div className="demo-container">
        <div className="demo-header">
          <h2>See the Magic</h2>
          <p>Five quick looks at the warm, stylized 3D animated-film worlds Main Character Studios creates.</p>
        </div>
        <div className="demo-grid">
          {demos.map((demo) => (
            <article key={demo.title} className="demo-card">
              <div className="demo-image-wrapper">
                <video className="demo-image" src={demo.src} controls playsInline preload="metadata" aria-label={`${demo.title} 5-second demo`} />
              </div>
              <div className="demo-info"><h3>{demo.title}</h3><p>{demo.subtitle}</p></div>
            </article>
          ))}
        </div>
        <div className="demo-cta"><a href="#creator" className="btn-primary-large">Make Your Story →</a></div>
      </div>
    </section>
  );
}
