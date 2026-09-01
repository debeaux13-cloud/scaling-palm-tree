import { get } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { getOwner } from '../../../../../../lib/owner';
import { readOrder } from '../../../../../../lib/orders';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { ownerId } = await getOwner();
  const { id } = await params;
  const order = await readOrder(id);
  if (!order || order.ownerId !== ownerId || !order.previewMoviePathname) return NextResponse.json({ error: 'preview not found' }, { status: 404 });

  const { stream, blob } = await get(order.previewMoviePathname, { access: 'private' });
  const baseHeaders = {
    'content-type': blob.contentType ?? 'video/mp4',
    'content-disposition': `inline; filename="${id}-preview.mp4"`,
    'cache-control': 'private, no-store',
    'accept-ranges': 'bytes',
  };

  const range = request.headers.get('range');
  if (!range || typeof blob.size !== 'number') return new Response(stream, { headers: { ...baseHeaders, ...(typeof blob.size === 'number' ? { 'content-length': String(blob.size) } : {}) } });

  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  if (!match) return new Response(null, { status: 416, headers: { ...baseHeaders, 'content-range': `bytes */${blob.size}` } });
  const start = match[1] ? Number(match[1]) : 0;
  const end = match[2] ? Math.min(Number(match[2]), blob.size - 1) : blob.size - 1;
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start || start >= blob.size) return new Response(null, { status: 416, headers: { ...baseHeaders, 'content-range': `bytes */${blob.size}` } });

  // Private Blob get() returns the whole stream, so honor browser Range requests by
  // buffering this short 60-second preview and returning only the requested byte window.
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  const slice = bytes.slice(start, end + 1);
  return new Response(slice, { status: 206, headers: { ...baseHeaders, 'content-range': `bytes ${start}-${end}/${blob.size}`, 'content-length': String(slice.byteLength) } });
}
