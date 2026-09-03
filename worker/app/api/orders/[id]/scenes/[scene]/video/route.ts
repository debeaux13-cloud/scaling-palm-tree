import { get } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { getOwner } from '../../../../../../../lib/owner';
import { readOrder } from '../../../../../../../lib/orders';

export async function GET(request: Request, { params }: { params: Promise<{ id: string; scene: string }> }) {
  const { ownerId } = await getOwner();
  const { id, scene: sceneValue } = await params;
  const sceneNumber = Number(sceneValue);
  const order = await readOrder(id);
  const scene = order?.scenes[sceneNumber - 1];
  if (!order || order.ownerId !== ownerId || !Number.isInteger(sceneNumber) || !scene?.videoPathname) return NextResponse.json({ error: 'scene video not found' }, { status: 404 });

  const { stream, blob } = await get(scene.videoPathname, { access: 'private' });
  const baseHeaders = { 'content-type': blob.contentType ?? 'video/mp4', 'cache-control': 'private, no-store', 'accept-ranges': 'bytes' };
  const range = request.headers.get('range');
  if (!range || typeof blob.size !== 'number') return new Response(stream, { headers: { ...baseHeaders, ...(typeof blob.size === 'number' ? { 'content-length': String(blob.size) } : {}) } });

  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  if (!match) return new Response(null, { status: 416, headers: { ...baseHeaders, 'content-range': `bytes */${blob.size}` } });
  const start = match[1] ? Number(match[1]) : 0;
  const end = match[2] ? Math.min(Number(match[2]), blob.size - 1) : blob.size - 1;
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start || start >= blob.size) return new Response(null, { status: 416, headers: { ...baseHeaders, 'content-range': `bytes */${blob.size}` } });
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  const slice = bytes.slice(start, end + 1);
  return new Response(slice, { status: 206, headers: { ...baseHeaders, 'content-range': `bytes ${start}-${end}/${blob.size}`, 'content-length': String(slice.byteLength) } });
}
