import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { requireStudioAccess } from '../../../lib/auth';
import { writeCurrentJob } from '../../../lib/jobs';

export async function POST(request: Request) {
  const denied = requireStudioAccess(request);
  if (denied) return denied;

  const { prompt } = await request.json();
  if (typeof prompt !== 'string' || !prompt.trim()) {
    return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
  }

  const job = {
    id: randomUUID(),
    type: 'video' as const,
    status: 'queued' as const,
    prompt,
    createdAt: new Date().toISOString(),
  };
  await writeCurrentJob(job);

  return NextResponse.json({
    job,
    provider: process.env.VIDEO_PROVIDER_WEBHOOK_SECRET ? 'ready-to-connect' : 'not-connected',
    next: 'Connect a video provider and send its completion webhook to /api/renders/[id]/complete.',
  }, { status: 202 });
}
