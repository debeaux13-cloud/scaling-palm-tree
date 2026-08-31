import { NextResponse } from 'next/server';
import { getOwner } from '../../../../../lib/owner';
import { readOrder } from '../../../../../lib/orders';
import { runDirectPreview } from '../../../../../lib/direct-preview';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { ownerId } = await getOwner();
  const { id } = await params;
  const order = await readOrder(id);
  if (!order || order.ownerId !== ownerId) return NextResponse.json({ error: 'order not found' }, { status: 404 });
  if (order.previewMoviePathname || order.status === 'awaiting-payment' || order.status === 'complete') return NextResponse.json({ order, alreadyReady: true });

  const completed = order.scenes.filter((scene) => scene.number <= 6 && scene.status === 'completed' && scene.videoPathname).length;
  if (completed !== 6) return NextResponse.json({ error: `Preview has ${completed} of 6 completed scenes. Resume assembly only after all six scenes are saved.` }, { status: 409 });

  console.info('[DirectPreview] assembly resume started', { orderId: id, completed });
  await runDirectPreview(id);
  const ready = await readOrder(id);
  console.info('[DirectPreview] assembly resume finished', { orderId: id, previewMoviePathname: ready?.previewMoviePathname, status: ready?.status });
  return NextResponse.json({ order: ready, resumed: true });
}
