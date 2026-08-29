import { experimental_getVideoStatus as getVideoStatus } from 'ai';
import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { requireStudioAccess } from '../../../../lib/auth';
import { readJob, writeCurrentJob } from '../../../../lib/jobs';

const model = 'bytedance/seedance-v1.5-pro';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireStudioAccess(request);
  if (denied) return denied;
  const { id } = await params;
  const job = await readJob(id);
  if (!job) return NextResponse.json({ error: 'render job not found' }, { status: 404 });
  if (job.status !== 'submitted' || !job.operation) return NextResponse.json({ job });

  try {
    const result = await getVideoStatus(model, { operation: job.operation as never });
    if (result.status === 'completed' && result.videos[0]) {
      const video = result.videos[0];
      const pathname = `studio/renders/${id}.mp4`;
      await put(pathname, video.uint8Array, { access: 'private', contentType: video.mediaType ?? 'video/mp4', addRandomSuffix: false, allowOverwrite: true });
      const completed = { ...job, status: 'completed' as const, outputPathname: pathname };
      await writeCurrentJob(completed);
      return NextResponse.json({ job: completed });
    }
    if (result.status === 'failed') {
      const failed = { ...job, status: 'failed' as const, error: 'AI Gateway video generation failed' };
      await writeCurrentJob(failed);
      return NextResponse.json({ job: failed });
    }
    return NextResponse.json({ job });
  } catch (error) {
    return NextResponse.json({ job, pollError: error instanceof Error ? error.message : 'Unable to retrieve video status' }, { status: 502 });
  }
}
