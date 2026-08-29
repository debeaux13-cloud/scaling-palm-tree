import { NextResponse } from 'next/server';
import { requireStudioAccess } from '../../../../lib/auth';
import { orderProgress, readOrder } from '../../../../lib/orders';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireStudioAccess(request);
  if (denied) return denied;
  const { id } = await params;
  const order = await readOrder(id);
  if (!order) return NextResponse.json({ error: 'order not found' }, { status: 404 });
  return NextResponse.json({ order, progress: orderProgress(order) });
}
