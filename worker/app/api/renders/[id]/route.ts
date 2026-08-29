import { NextResponse } from 'next/server';
import { requireStudioAccess } from '../../../../lib/auth';
import { readJob } from '../../../../lib/jobs';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireStudioAccess(request);
  if (denied) return denied;

  const { id } = await params;
  const job = await readJob(id);
  if (!job) return NextResponse.json({ error: 'render job not found' }, { status: 404 });
  return NextResponse.json({ job });
}
