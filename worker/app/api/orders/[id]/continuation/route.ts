import { NextResponse } from 'next/server';
import { getOwner } from '../../../../../lib/owner';
import { readOrder } from '../../../../../lib/orders';
import { startPaidFulfillment } from '../../../../../lib/paid-fulfillment-workflow';

export const maxDuration = 1800;

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { ownerId } = await getOwner(); const { id } = await params; const order = await readOrder(id);
  if (!order || order.ownerId !== ownerId) return NextResponse.json({ error: 'order not found' }, { status: 404 });
  if (order.purchase.status !== 'paid') return NextResponse.json({ error: 'payment required' }, { status: 402 });
  if (order.finalMoviePathname || order.status === 'complete') return NextResponse.json({ order, alreadyComplete: true });
  const submitted = order.scenes.filter((scene) => scene.number > 6 && scene.status === 'submitted').map((scene) => scene.number);
  if (submitted.length) return NextResponse.json({ order, alreadyRunning: true, submitted }, { status: 202 });
  await startPaidFulfillment(id);
  console.info('[DirectMovie] paid continuation started as durable workflow', { orderId: id });
  return NextResponse.json({ order, started: true, nextScene: 7 }, { status: 202 });
}
