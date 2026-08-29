'use client';

import { FormEvent, useEffect, useState } from 'react';
import { SignInButton, UserButton, useAuth } from '@clerk/nextjs';

type Job = { id: string; status: string; createdAt?: string; outputPathname?: string; error?: string };

async function studioFetch(path: string, body?: unknown) {
  const response = await fetch(path, { method: body ? 'POST' : 'GET', headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? data.pollError ?? 'Request failed');
  return data;
}

export function Creator() {
  const { isLoaded, isSignedIn } = useAuth();
  const [premise, setPremise] = useState('');
  const [photos, setPhotos] = useState<Array<{ pathname: string; name: string }>>([]);
  const [story, setStory] = useState('');
  const [format, setFormat] = useState('16:9');
  const [duration, setDuration] = useState(5);
  const [job, setJob] = useState<Job | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [videoUrl, setVideoUrl] = useState('');
  const [message, setMessage] = useState('Sign in to save your movies and orders.');

  async function loadGallery() {
    try { const data = await studioFetch('/api/renders'); setJobs(data.jobs); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to load completed videos.'); }
  }

  useEffect(() => { if (isSignedIn) void loadGallery(); }, [isSignedIn]);
  useEffect(() => {
    if (!job || !['submitted', 'queued'].includes(job.status) || !isSignedIn) return;
    const timer = window.setInterval(async () => {
      try {
        const data = await studioFetch(`/api/renders/${job.id}`);
        setJob(data.job);
        if (data.job.status === 'completed') { setMessage('Render complete. It is now in My Renders.'); void loadGallery(); }
        if (data.job.status === 'failed') setMessage(data.job.error ?? 'Render failed.');
      } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to check render status.'); }
    }, 8000);
    return () => window.clearInterval(timer);
  }, [job?.id, job?.status, isSignedIn]);
  useEffect(() => () => { if (videoUrl) URL.revokeObjectURL(videoUrl); }, [videoUrl]);

  async function uploadPhotos(files: FileList | null) {
    if (!files?.length) return;
    const remaining = 5 - photos.length;
    if (remaining <= 0) { setMessage('You can add up to five reference photos per story.'); return; }
    const selected = Array.from(files).slice(0, remaining);
    setMessage('Saving your reference photo…');
    try {
      const uploaded = await Promise.all(selected.map(async (file) => {
        const form = new FormData(); form.set('photo', file);
        const response = await fetch('/api/uploads/photo', { method: 'POST', body: form });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? 'Photo upload failed.');
        return { pathname: data.pathname as string, name: data.name as string };
      }));
      setPhotos((current) => [...current, ...uploaded]);
      setMessage(`${uploaded.length} reference photo${uploaded.length === 1 ? '' : 's'} saved privately.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Photo upload failed.'); }
  }

  async function createStory(event: FormEvent) {
    event.preventDefault(); setMessage('Writing your story…');
    try { const data = await studioFetch('/api/story', { premise }); setStory(data.story); setMessage('Story ready. Edit it below, then create a video prompt.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Story generation failed.'); }
  }

  async function createRender() {
    setMessage('Submitting Seedance render…');
    try { const data = await studioFetch('/api/renders', { prompt: story || premise, aspectRatio: format, resolution: '720p', duration }); setJob(data.job); setMessage('Render submitted. This page checks its status every 8 seconds.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Render submission failed.'); }
  }

  async function play(jobToPlay: Job) {
    try {
      const response = await fetch(`/api/renders/${jobToPlay.id}/video`, { headers: {} });
      if (!response.ok) { const data = await response.json(); throw new Error(data.error ?? 'Unable to play video.'); }
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      setVideoUrl(URL.createObjectURL(await response.blob()));
      setMessage('Playing your private render.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to play video.'); }
  }

  return <section className="creator">
    <div className="creator-header"><div><p className="eyebrow">Your private studio</p><h2>Make a scene</h2></div>{isLoaded && (isSignedIn ? <UserButton /> : <SignInButton mode="modal"><button type="button">Sign in to start</button></SignInButton>)}</div>
    <div className="photo-upload"><label>Who will star in the movie?<input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={!isSignedIn} onChange={(event) => void uploadPhotos(event.target.files)} /></label><p>Upload 1–5 clear JPG, PNG, or WebP photos. They stay private and are saved with your story as its character reference.</p>{photos.length > 0 && <ul>{photos.map((photo) => <li key={photo.pathname}>{photo.name}</li>)}</ul>}</div>
    <form onSubmit={createStory}><label>Story idea<textarea value={premise} onChange={(e) => setPremise(e.target.value)} placeholder="A young heroine discovers a glowing doorway beneath the city…" required /></label><button type="submit" disabled={!isSignedIn || !premise.trim()}>Generate story</button></form>
    <label>Story & video prompt<textarea value={story} onChange={(e) => setStory(e.target.value)} placeholder="Generate a story first, or write a direct video prompt." /></label>
    <div className="controls"><label>Format<select value={format} onChange={(e) => setFormat(e.target.value)}><option>16:9</option><option>9:16</option><option>1:1</option><option>4:3</option><option>3:4</option><option>21:9</option></select></label><label>Length<select value={duration} onChange={(e) => setDuration(Number(e.target.value))}><option value={5}>5 seconds</option><option value={10}>10 seconds</option></select></label><button type="button" onClick={createRender} disabled={!isSignedIn || !(story || premise)}>Create Seedance video</button></div>
    {isLoaded && (isSignedIn ? <p className="status" role="status">{message}{job ? ` Job: ${job.id} (${job.status}).` : ''}</p> : <p className="status">Sign in or create a free account to save your uploads, previews, and orders.</p>)}
    <div className="gallery"><div className="gallery-title"><h2>My Renders</h2><button type="button" onClick={loadGallery} disabled={!isSignedIn}>Refresh</button></div>{videoUrl && <video className="player" controls autoPlay src={videoUrl} />}{jobs.length ? <div className="render-list">{jobs.map((item) => <article key={item.id}><strong>{item.createdAt ? new Date(item.createdAt).toLocaleString() : 'Completed render'}</strong><p>{item.id}</p><button type="button" onClick={() => play(item)}>Play private video</button></article>)}</div> : <p className="empty">Completed videos will appear here. Click Refresh after a render finishes.</p>}</div>
  </section>;
}
