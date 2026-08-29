import { NextResponse } from 'next/server';
import { requireCustomer } from '../../../../lib/auth';
import { orderProgress, readOrder } from '../../../../lib/orders';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId, response } = await requireCustomer();
  if (response || !userId) return response!;
  const { id } = await params;
  const order = await readOrder(id);
  if (!order || order.customerId !== userId) return NextResponse.json({ error: 'order not found' }, { status: 404 });
  return NextResponse.json({ order, progress: orderProgress(order) });
}
