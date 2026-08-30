import { get } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { getOwner } from '../../../../../../lib/owner';
import { readOrder } from '../../../../../../lib/orders';
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) { const { ownerId } = await getOwner(); const { id } = await params; const order = await readOrder(id); if (!order || order.ownerId !== ownerId || !order.previewMoviePathname) return NextResponse.json({ error: 'preview not found' }, { status: 404 }); const { stream, blob } = await get(order.previewMoviePathname, { access: 'private' }); return new Response(stream, { headers: { 'content-type': blob.contentType ?? 'video/mp4', 'content-disposition': `inline; filename="${id}-preview.mp4"`, 'cache-control': 'private, no-store' } }); }
