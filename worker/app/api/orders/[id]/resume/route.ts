import { after, NextResponse } from 'next/server';
import { getOwner } from '../../../../../lib/owner';
import { readOrder } from '../../../../../lib/orders';
import { runDirectPreview } from '../../../../../lib/direct-preview';

export const maxDuration = 1800;

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { ownerId } = await getOwner();
  const { id } = await params;
  const order = await readOrder(id);
  if (!order || order.ownerId !== ownerId) return NextResponse.json({ error: 'order not found' }, { status: 404 });
  if (order.previewMoviePathname || order.status === 'awaiting-payment' || order.status === 'complete') return NextResponse.json({ order, alreadyReady: true });
  const completed = order.scenes.filter((scene) => scene.number <= 6 && scene.status === 'completed' && scene.videoPathname).length;
  console.info('[DirectPreview] resume requested', { orderId: id, completed });
  after(async () => {
    try {
      console.info('[DirectPreview] resume generation started', { orderId: id, completed });
      await runDirectPreview(id);
      const ready = await readOrder(id);
      console.info('[DirectPreview] resume generation finished', { orderId: id, previewMoviePathname: ready?.previewMoviePathname, status: ready?.status });
    } catch (error) { console.error('[DirectPreview] resume generation failed', { orderId: id, error }); }
  });
  return NextResponse.json({ order, resumed: true, completed, generationRestarted: true }, { status: 202 });
}
