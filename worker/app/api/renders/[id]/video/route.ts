import { get } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { requireCustomer } from '../../../../../lib/auth';
import { readJob } from '../../../../../lib/jobs';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId, response } = await requireCustomer();
  if (response || !userId) return response!;
  const { id } = await params;
  const job = await readJob(id);
  if (!job || job.customerId !== userId || !job.outputPathname) return NextResponse.json({ error: 'completed video not found' }, { status: 404 });
  const { stream, blob } = await get(job.outputPathname, { access: 'private' });
  return new Response(stream, { headers: { 'content-type': blob.contentType ?? 'video/mp4', 'content-disposition': `inline; filename="${id}.mp4"` } });
}
