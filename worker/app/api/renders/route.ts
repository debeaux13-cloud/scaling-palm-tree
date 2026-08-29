import { experimental_startVideo as startVideo } from 'ai';
import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { requireStudioAccess } from '../../../lib/auth';
import { listCompletedJobs, writeCurrentJob } from '../../../lib/jobs';

const model = 'bytedance/seedance-v1.5-pro';

export async function GET(request: Request) {
  const denied = requireStudioAccess(request);
  if (denied) return denied;
  return NextResponse.json({ jobs: await listCompletedJobs() });
}

export async function POST(request: Request) {
  const denied = requireStudioAccess(request);
  if (denied) return denied;
  const { prompt, aspectRatio = '16:9', resolution = '720p', duration = 5 } = await request.json();
  if (typeof prompt !== 'string' || !prompt.trim()) return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
  if (!['16:9', '9:16', '1:1', '4:3', '3:4', '21:9'].includes(aspectRatio) || !['720p', '1080p'].includes(resolution) || ![5, 10].includes(duration)) {
    return NextResponse.json({ error: 'Use a supported Seedance aspect ratio, 720p or 1080p, and a 5- or 10-second duration.' }, { status: 400 });
  }

  const id = randomUUID();
  try {
    const { operation } = await startVideo({ model, prompt, aspectRatio, resolution, duration, generateAudio: true });
    const job = { id, type: 'video' as const, status: 'submitted' as const, prompt, createdAt: new Date().toISOString(), operation };
    await writeCurrentJob(job);
    return NextResponse.json({ job: { ...job, operation: undefined }, model }, { status: 202 });
  } catch (error) {
    const job = { id, type: 'video' as const, status: 'failed' as const, prompt, createdAt: new Date().toISOString(), error: error instanceof Error ? error.message : 'Video generation request failed' };
    await writeCurrentJob(job);
    return NextResponse.json({ job }, { status: 502 });
  }
}
