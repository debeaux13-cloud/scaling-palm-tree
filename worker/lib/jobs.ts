import { get, list, put } from '@vercel/blob';

export type StudioJob = {
  id: string;
  customerId: string;
  type: 'video';
  status: 'queued' | 'submitted' | 'completed' | 'failed';
  prompt: string;
  createdAt: string;
  operation?: unknown;
  outputPathname?: string;
  error?: string;
  purchase?: { status: 'not-started' | 'checkout-created' | 'paid'; checkoutSessionId?: string; paidAt?: string; resumeFromScene?: number };
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

export async function listCompletedJobs(customerId: string): Promise<StudioJob[]> {
  const { blobs } = await list({ prefix: 'studio/jobs/', limit: 100 });
  const latest = blobs.filter((blob) => blob.pathname.endsWith('/latest.json'));
  const jobs = await Promise.all(latest.map(async (blob) => {
    try {
      const { stream } = await get(blob.pathname, { access: 'private' });
      return JSON.parse(await new Response(stream).text()) as StudioJob;
    } catch { return null; }
  }));
  return jobs
    .filter((job): job is StudioJob => Boolean(job?.customerId === customerId && job.outputPathname && job.status === 'completed'))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
