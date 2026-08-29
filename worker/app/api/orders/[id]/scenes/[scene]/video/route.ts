import { get } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { getOwner } from '../../../../../../../lib/owner';
import { readOrder } from '../../../../../../../lib/orders';

export async function GET(request: Request, { params }: { params: Promise<{ id: string; scene: string }> }) {
  const { ownerId } = await getOwner();
  const { id, scene: sceneParam } = await params;
  const sceneNumber = Number(sceneParam);
  const order = await readOrder(id);
  if (!order || order.ownerId !== ownerId || !Number.isInteger(sceneNumber) || sceneNumber < 1 || sceneNumber > order.scenes.length) return NextResponse.json({ error: 'video not found' }, { status: 404 });
  const scene = order.scenes[sceneNumber - 1];
  if (!scene.videoPathname) return NextResponse.json({ error: 'video is not ready' }, { status: 404 });
  try {
    const { stream, blob } = await get(scene.videoPathname, { access: 'private' });
    return new Response(stream, { headers: { 'content-type': blob.contentType || 'video/mp4', 'content-disposition': `inline; filename="${order.title}-part-${sceneNumber}.mp4"`, 'cache-control': 'private, no-store' } });
  } catch { return NextResponse.json({ error: 'video is not available' }, { status: 404 }); }
}
