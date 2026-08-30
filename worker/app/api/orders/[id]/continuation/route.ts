import { NextResponse } from 'next/server';
import { getOwner } from '../../../../../lib/owner';
import { readOrder } from '../../../../../lib/orders';
// Continuation planning is owned by the durable workflow after the verified Stripe webhook.
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) { const { ownerId } = await getOwner(); const { id } = await params; const order = await readOrder(id); if (!order || order.ownerId !== ownerId) return NextResponse.json({ error: 'order not found' }, { status: 404 }); return NextResponse.json({ order, workflowOwned: true }); }
