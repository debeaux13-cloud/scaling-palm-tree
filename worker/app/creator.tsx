'use client';

import { FormEvent, useState } from 'react';
import { UserButton, useAuth } from '@clerk/nextjs';

type Photo = { pathname: string; name: string };
type Story = { title: string; scenes: Array<{ narration: string; videoPrompt: string }> };

export function Creator() {
  const { isLoaded, isSignedIn } = useAuth();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [premise, setPremise] = useState('');
  const [story, setStory] = useState<Story | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [message, setMessage] = useState('Your free preview is private in this browser. Create an account when you unlock the full movie to save it permanently.');

  async function uploadPhotos(files: FileList | null) {
    if (!files?.length) return;
    const selected = Array.from(files).slice(0, 5 - photos.length);
    if (!selected.length) return setMessage('You can add up to five reference photos.');
    setMessage('Saving your reference photos privately…');
    try {
      const uploaded = await Promise.all(selected.map(async (file) => {
        const form = new FormData(); form.set('photo', file);
        const response = await fetch('/api/uploads/photo', { method: 'POST', body: form });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? 'Photo upload failed.');
        return data as Photo;
      }));
      setPhotos((current) => [...current, ...uploaded]);
      setMessage('Photos saved. Now tell us their adventure.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Photo upload failed.'); }
  }

  async function createStory(event: FormEvent) {
    event.preventDefault();
    setMessage('Creating your connected three-minute story…');
    try {
      const response = await fetch('/api/story', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ premise, subjectPhotoPathnames: photos.map((photo) => photo.pathname) }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error ?? 'Story creation failed.');
      setStory(data.story); setMessage('Your 18-scene movie is planned. Create your free one-minute preview next.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Story creation failed.'); }
  }

  return <section className="creator">
    <div className="creator-header"><div><p className="eyebrow">Your private movie studio</p><h2>Make them the star</h2></div>{isLoaded && isSignedIn && <UserButton />}</div>
    <p className="creator-lede">Create one connected, personalized three-minute movie. You will watch the first minute free before deciding whether to unlock the final two minutes and matching Storybook.</p>
    <div className="photo-upload"><label>1. Upload your star<input type="file" accept="image/jpeg,image/png,image/webp" multiple  onChange={(event) => void uploadPhotos(event.target.files)} /></label><p>Add 1–5 clear photos of the child, pet, or loved one who will star in this movie. They stay private.</p>{photos.length > 0 && <ul>{photos.map((photo) => <li key={photo.pathname}>{photo.name}</li>)}</ul>}</div>
    <form onSubmit={createStory}><label>2. Tell us their adventure<textarea value={premise} onChange={(event) => setPremise(event.target.value)} placeholder="My daughter discovers a magical garden where every flower sings her name." required /></label><button type="submit" disabled={!photos.length || !premise.trim()}>Create my free 1-minute preview</button></form>
    {story && <div className="movie-promise"><span>Your 18-scene story is ready</span><b>{story.title}</b><button type="button" onClick={async () => { const response = await fetch('/api/orders', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: story.title, scenes: story.scenes, subjectPhotoPathnames: photos.map((photo) => photo.pathname) }) }); const data = await response.json(); if (!response.ok) return setMessage(data.error ?? 'Unable to save your preview.'); setOrderId(data.order.id); setMessage('Your preview order is saved. Scenes 1–6 are your free one-minute preview.'); }}>Create my free 1-minute preview</button></div>}
    {orderId && <div className="movie-promise"><span>Preview saved</span><b>Your story continues after the preview</b><strong>Create or sign in to an account only when you choose to unlock the final two minutes and matching 18-page Storybook.</strong></div>}
    <div className="movie-promise"><span>One connected movie</span><b>3 minutes total</b><span>Free preview: first 60 seconds</span><strong>$49 unlocks the same story&apos;s final 2 minutes + matching 18-page Storybook</strong></div>
    {isLoaded && <p className="status" role="status">{message}</p>}
  </section>;
}
