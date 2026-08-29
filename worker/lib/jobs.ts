import { get, put } from '@vercel/blob';

export type StudioJob = {
  id: string;
  type: 'video';
  status: 'queued' | 'submitted' | 'completed' | 'failed';
  prompt: string;
  createdAt: string;
  operation?: unknown;
  outputPathname?: string;
  error?: string;
};

const pathFor = (id: string) => `studio/jobs/${id}`;

export async function appendJobEvent(job: StudioJob) {
  await put(`${pathFor(job.id)}/events/${Date.now()}.json`, JSON.stringify(job), {
    access: 'private', contentType: 'application/json', addRandomSuffix: false,
  });
}

export async function readJob(id: string): Promise<StudioJob | null> {
  try {
    const { stream } = await get(`${pathFor(id)}/latest.json`, { access: 'private' });
    return JSON.parse(await new Response(stream).text()) as StudioJob;
  } catch { return null; }
}

export async function writeCurrentJob(job: StudioJob) {
  await put(`${pathFor(job.id)}/latest.json`, JSON.stringify(job), {
    access: 'private', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true,
  });
  await appendJobEvent(job);
}
