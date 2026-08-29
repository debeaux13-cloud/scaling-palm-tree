import { NextResponse } from 'next/server';
import { readJob, writeCurrentJob } from '../../../../../lib/jobs';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const expected = process.env.VIDEO_PROVIDER_WEBHOOK_SECRET;
  if (!expected || request.headers.get('x-studio-provider-secret') !== expected) {
    return NextResponse.json({ error: 'provider webhook is not authorized' }, { status: 401 });
  }

  const { id } = await params;
  const existing = await readJob(id);
  if (!existing) return NextResponse.json({ error: 'render job not found' }, { status: 404 });

  const { status, providerJobId, outputUrl, error } = await request.json();
  if (!['submitted', 'completed', 'failed'].includes(status)) {
    return NextResponse.json({ error: 'invalid status' }, { status: 400 });
  }

  const job = {
    ...existing,
    status: status as 'submitted' | 'completed' | 'failed',
    providerJobId,
    outputUrl,
    error,
  };
  await writeCurrentJob(job);
  return NextResponse.json({ job });
}
