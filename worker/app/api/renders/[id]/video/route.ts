import { get } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { requireStudioAccess } from '../../../../../lib/auth';
import { readJob } from '../../../../../lib/jobs';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireStudioAccess(request);
  if (denied) return denied;
  const { id } = await params;
  const job = await readJob(id);
  if (!job?.outputPathname) return NextResponse.json({ error: 'completed video not found' }, { status: 404 });
  const { stream, blob } = await get(job.outputPathname, { access: 'private' });
  return new Response(stream, { headers: { 'content-type': blob.contentType ?? 'video/mp4', 'content-disposition': `inline; filename="${id}.mp4"` } });
}
