import { issueSignedToken, presignUrl } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { getGuestPreviewOwner, getOwner } from '../../../../../../lib/owner';
import { mutateOrder, readOrder } from '../../../../../../lib/orders';

export async function GET(_: Request, { params }: { params: Promise<{ id: string; asset: string }> }) {
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
  return NextResponse.redirect(presignedUrl, { headers: { 'cache-control': 'private, no-store' } });
}
