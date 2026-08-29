import { NextResponse } from 'next/server';
import { getOwner } from '../../../../../../../lib/owner';
import { readOrder } from '../../../../../../../lib/orders';
export async function POST(_: Request, { params }: { params: Promise<{ id: string; scene: string }> }) { const { ownerId } = await getOwner(); const { id, scene } = await params; const order = await readOrder(id); const selected = order?.scenes[Number(scene) - 1]; if (!order || order.ownerId !== ownerId || !selected) return NextResponse.json({ error: 'order or scene not found' }, { status: 404 }); return NextResponse.json({ orderId: id, scene: selected.number, status: selected.status, generationKey: selected.generation?.key ?? null }, { status: selected.status === 'ready' ? 202 : 200 }); }
