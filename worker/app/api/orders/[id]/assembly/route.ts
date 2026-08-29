import { NextResponse } from 'next/server';
import { requireStudioAccess } from '../../../../../lib/auth';
import { saveAssemblyManifest } from '../../../../../lib/assembly';
import { readOrder } from '../../../../../lib/orders';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireStudioAccess(request);
  if (denied) return denied;
  const { id } = await params;
  const order = await readOrder(id);
  if (!order) return NextResponse.json({ error: 'order not found' }, { status: 404 });
  const { kind } = await request.json();
  if (kind !== 'preview' && kind !== 'final') return NextResponse.json({ error: 'kind must be preview or final' }, { status: 400 });
  if (kind === 'final' && order.purchase.status !== 'paid') return NextResponse.json({ error: 'Final assembly is locked until verified payment.' }, { status: 402 });
  const result = await saveAssemblyManifest(order, kind);
  if (!result.ready) return NextResponse.json({ error: 'Assembly waits for exact scene video and artwork.', missingScenes: result.missingScenes }, { status: 409 });
  return NextResponse.json({ manifest: result.manifest, next: 'A Vercel Sandbox FFmpeg worker can stitch the private clips and create the matching PDF from this manifest.' }, { status: 202 });
}
