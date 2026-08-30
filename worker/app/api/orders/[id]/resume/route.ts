import { NextResponse } from 'next/server';
import { start } from 'workflow/api';
import { getOwner } from '../../../../../lib/owner';
import { readOrder } from '../../../../../lib/orders';
import { movieWorkflow } from '../../../../../lib/movie-workflow';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { ownerId } = await getOwner();
  const { id } = await params;
  const order = await readOrder(id);
  if (!order || order.ownerId !== ownerId) return NextResponse.json({ error: 'order not found' }, { status: 404 });
  if (order.previewMoviePathname || order.status === 'awaiting-payment' || order.status === 'complete') return NextResponse.json({ order, alreadyReady: true });
  const run = await start(movieWorkflow, [id]);
  console.info('[MovieWorkflow] resumed', { orderId: id, runId: run.runId });
  return NextResponse.json({ orderId: id, runId: run.runId, resumed: true });
}
