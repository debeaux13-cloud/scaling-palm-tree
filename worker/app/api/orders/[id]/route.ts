import { NextResponse } from 'next/server';
import { getOwner } from '../../../../lib/owner';
import { orderProgress, readOrder } from '../../../../lib/orders';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { ownerId } = await getOwner();
  const { id } = await params;
  const order = await readOrder(id);
  if (!order || order.ownerId !== ownerId) return NextResponse.json({ error: 'order not found' }, { status: 404 });
  return NextResponse.json({ order, progress: orderProgress(order) });
}
