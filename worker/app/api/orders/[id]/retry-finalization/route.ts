import { head } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { getOwner } from '../../../../../lib/owner';
import { mutateOrder, readOrder, tierFor } from '../../../../../lib/orders';
import { startPaidFulfillment } from '../../../../../lib/paid-fulfillment-workflow';

export const maxDuration = 1800;

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { ownerId } = await getOwner();
  const { id } = await params;
  const order = await readOrder(id);
  if (!order || order.ownerId !== ownerId) return NextResponse.json({ error: 'order not found' }, { status: 404 });
  if (order.purchase.status !== 'paid') return NextResponse.json({ error: 'payment required' }, { status: 402 });
  if (order.finalMoviePathname || order.status === 'complete') return NextResponse.json({ order, alreadyComplete: true });

  const sceneCount = tierFor(order)?.sceneCount;
  if (!sceneCount) return NextResponse.json({ error: 'paid package is not selected' }, { status: 409 });
  const missing = (await Promise.all(Array.from({ length: sceneCount }, async (_, index) => {
    const number = index + 1;
    try { await head(`studio/orders/${id}/scenes/${number}/movie.mp4`); return undefined; } catch { return number; }
  }))).filter((number): number is number => number !== undefined);
  if (missing.length) return NextResponse.json({ error: 'scene assets are still missing', missing }, { status: 409 });

  await mutateOrder(id, (fresh) => {
    fresh.continuationStatus = 'planning';
    fresh.status = 'fulfillment-in-progress';
  });
  await startPaidFulfillment(id);
  console.info('[DirectMovie] finalization retry started', { orderId: id, sceneCount });
  return NextResponse.json({ started: true, sceneCount }, { status: 202 });
}
