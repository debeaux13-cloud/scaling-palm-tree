'use client';

export function DemoGallery() {
  const demos = [
    {
      id: 1,
      title: 'Family Adventures',
      subtitle: 'Warm cinematic family adventures',
      image: '/images/demo-1.jpg',
      duration: '1:00'
    },
    {
      id: 2,
      title: 'Magical Fantasy',
      subtitle: 'Wizards, dragons, and enchanted worlds',
      image: '/images/demo-2.jpg',
      duration: '0:59'
    },
    {
      id: 3,
      title: 'Pet Adventures',
      subtitle: 'Dogs, cats and the whole crew',
      image: '/images/demo-3.jpg',
      duration: '1:00'
    },
    {
      id: 4,
      title: 'Romance & Celebration',
      subtitle: 'Heartfelt moments and special occasions',
      image: '/images/demo-4.jpg',
      duration: '0:58'
    },
    {
      id: 5,
      title: 'Sci-Fi Expeditions',
      subtitle: 'Space exploration and futuristic worlds',
      image: '/images/demo-5.jpg',
      duration: '1:00'
    },
    {
      id: 6,
      title: 'Epic Quests',
      subtitle: 'Adventure and exploration stories',
      image: '/images/demo-6.jpg',
      duration: '1:01'
    },
    {
      id: 7,
      title: 'Mystical Journeys',
      subtitle: 'Enchanted forests and magical worlds',
      image: '/images/demo-7.jpg',
      duration: '0:59'
    },
    {
      id: 8,
      title: 'Cosmic Adventures',
      subtitle: 'Otherworldly landscapes and alien worlds',
      image: '/images/demo-8.jpg',
      duration: '1:00'
    }
  ];

  return (
    <section id="demos" className="demo-section">
      <div className="demo-container">
        <div className="demo-header">
          <h2>See the Magic</h2>
          <p>Real examples. Real stories. Real emotions.</p>
        </div>

        <div className="demo-grid">
          {demos.map((demo) => (
            <div key={demo.id} className="demo-card">
              <div className="demo-image-wrapper">
                <img 
                  src={demo.image}
                  alt={demo.title}
                  className="demo-image"
                />
                <div className="demo-overlay">
                  <button className="demo-play-button">▶</button>
                  <span className="demo-duration">{demo.duration}</span>
                </div>
              </div>
              <div className="demo-info">
                <h3>{demo.title}</h3>
                <p>{demo.subtitle}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="demo-cta">
          <a href="#creator" className="btn-primary-large">View More Examples →</a>
        </div>
      </div>
    </section>
  );
}
