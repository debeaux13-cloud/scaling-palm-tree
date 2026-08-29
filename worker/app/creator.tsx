'use client';

import { FormEvent, useEffect, useState } from 'react';

type Job = { id: string; status: string; outputPathname?: string; error?: string };

async function studioFetch(path: string, secret: string, body?: unknown) {
  const response = await fetch(path, {
    method: body ? 'POST' : 'GET',
    headers: { 'content-type': 'application/json', 'x-studio-secret': secret },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? data.pollError ?? 'Request failed');
  return data;
}

export function Creator() {
  const [secret, setSecret] = useState('');
  const [premise, setPremise] = useState('');
  const [story, setStory] = useState('');
  const [format, setFormat] = useState('16:9');
  const [duration, setDuration] = useState(5);
  const [job, setJob] = useState<Job | null>(null);
  const [message, setMessage] = useState('Enter your Studio API secret to begin.');

  useEffect(() => {
    if (!job || !['submitted', 'queued'].includes(job.status) || !secret) return;
    const timer = window.setInterval(async () => {
      try {
        const data = await studioFetch(`/api/renders/${job.id}`, secret);
        setJob(data.job);
        if (data.job.status === 'completed') setMessage('Render complete. The MP4 is stored privately in Blob.');
        if (data.job.status === 'failed') setMessage(data.job.error ?? 'Render failed.');
      } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to check render status.'); }
    }, 8000);
    return () => window.clearInterval(timer);
  }, [job?.id, job?.status, secret]);

  async function createStory(event: FormEvent) {
    event.preventDefault();
    setMessage('Writing your story…');
    try {
      const data = await studioFetch('/api/story', secret, { premise });
      setStory(data.story);
      setMessage('Story ready. Edit it below, then create a video prompt.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Story generation failed.'); }
  }

  async function createRender() {
    setMessage('Submitting Seedance render…');
    try {
      const data = await studioFetch('/api/renders', secret, { prompt: story || premise, aspectRatio: format, resolution: '720p', duration });
      setJob(data.job);
      setMessage('Render submitted. This page checks its status every 8 seconds.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Render submission failed.'); }
  }

  return <section className="creator">
    <div className="creator-header"><div><p className="eyebrow">Creator</p><h2>Make a scene</h2></div><label>Studio API secret<input type="password" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="Required" autoComplete="off" /></label></div>
    <form onSubmit={createStory}><label>Story idea<textarea value={premise} onChange={(e) => setPremise(e.target.value)} placeholder="A young heroine discovers a glowing doorway beneath the city…" required /></label><button type="submit" disabled={!secret || !premise.trim()}>Generate story</button></form>
    <label>Story & video prompt<textarea value={story} onChange={(e) => setStory(e.target.value)} placeholder="Generate a story first, or write a direct video prompt." /></label>
    <div className="controls"><label>Format<select value={format} onChange={(e) => setFormat(e.target.value)}><option>16:9</option><option>9:16</option><option>1:1</option><option>4:3</option><option>3:4</option><option>21:9</option></select></label><label>Length<select value={duration} onChange={(e) => setDuration(Number(e.target.value))}><option value={5}>5 seconds</option><option value={10}>10 seconds</option></select></label><button type="button" onClick={createRender} disabled={!secret || !(story || premise)}>Create Seedance video</button></div>
    <p className="status" role="status">{message}{job ? ` Job: ${job.id} (${job.status}).` : ''}</p>
  </section>;
}
