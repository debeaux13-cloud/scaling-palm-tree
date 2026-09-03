import { issueSignedToken, presignUrl } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { getGuestPreviewOwner, getOwner } from '../../../../../../lib/owner';
import { mutateOrder, readOrder } from '../../../../../../lib/orders';

export async function GET(request: Request, { params }: { params: Promise<{ id: string; asset: string }> }) {
  const { ownerId, isGuest } = await getOwner();
  const { id, asset } = await params;
  let order = await readOrder(id);
  if (order && !isGuest && order.ownerId !== ownerId) {
    const guestOwner = await getGuestPreviewOwner();
    if (guestOwner && order.ownerId === guestOwner) order = await mutateOrder(id, (fresh) => { if (fresh.ownerId === guestOwner) fresh.ownerId = ownerId; });
  }
  const pathname = asset === 'movie' ? order?.finalMoviePathname : asset === 'storybook' ? order?.finalStorybook?.pathname : undefined;
  if (!order || order.ownerId !== ownerId || order.status !== 'complete' || !pathname) return NextResponse.json({ error: 'delivery asset not found' }, { status: 404 });
  const validUntil = Date.now() + 15 * 60 * 1000;
  const token = await issueSignedToken({ pathname, operations: ['get'], validUntil });
  const { presignedUrl } = await presignUrl(token, { pathname, operation: 'get', access: 'private', validUntil, useCache: false });
  const wantsDownload = new URL(request.url).searchParams.get('download') === '1';
  if (!wantsDownload) return NextResponse.redirect(presignedUrl, { headers: { 'cache-control': 'private, no-store' } });
  const response = await fetch(presignedUrl, { cache: 'no-store' });
  if (!response.ok || !response.body) return NextResponse.json({ error: 'delivery asset unavailable' }, { status: 502 });
  const extension = asset === 'movie' ? 'mp4' : 'pdf';
  const safeTitle = order.title.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '') || 'main-character-studios';
  return new Response(response.body, { headers: { 'content-type': asset === 'movie' ? 'video/mp4' : 'application/pdf', 'content-disposition': `attachment; filename="${safeTitle}.${extension}"`, 'cache-control': 'private, no-store' } });
}
