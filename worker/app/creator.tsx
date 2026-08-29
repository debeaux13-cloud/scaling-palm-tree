'use client';

import { FormEvent, useState } from 'react';
import { SignInButton, UserButton, useAuth } from '@clerk/nextjs';

type Photo = { pathname: string; name: string };

export function Creator() {
  const { isLoaded, isSignedIn } = useAuth();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [premise, setPremise] = useState('');
  const [message, setMessage] = useState('Create a free account to save your movie and Storybook.');

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
    // The 18-scene production flow will submit the one-minute preview from this intake.
  }

  return <section className="creator">
    <div className="creator-header"><div><p className="eyebrow">Your private movie studio</p><h2>Make them the star</h2></div>{isLoaded && (isSignedIn ? <UserButton /> : <SignInButton mode="modal"><button type="button">Create a free account</button></SignInButton>)}</div>
    <p className="creator-lede">Create one connected, personalized three-minute movie. You will watch the first minute free before deciding whether to unlock the final two minutes and matching Storybook.</p>
    <div className="photo-upload"><label>1. Upload your star<input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={!isSignedIn} onChange={(event) => void uploadPhotos(event.target.files)} /></label><p>Add 1–5 clear photos of the child, pet, or loved one who will star in this movie. They stay private.</p>{photos.length > 0 && <ul>{photos.map((photo) => <li key={photo.pathname}>{photo.name}</li>)}</ul>}</div>
    <form onSubmit={createStory}><label>2. Tell us their adventure<textarea value={premise} onChange={(event) => setPremise(event.target.value)} placeholder="My daughter discovers a magical garden where every flower sings her name." required /></label><button type="submit" disabled={!isSignedIn || !photos.length || !premise.trim()}>Create my free 1-minute preview</button></form>
    <div className="movie-promise"><span>One connected movie</span><b>3 minutes total</b><span>Free preview: first 60 seconds</span><strong>$49 unlocks the same story&apos;s final 2 minutes + matching 18-page Storybook</strong></div>
    {isLoaded && <p className="status" role="status">{message}</p>}
  </section>;
}
