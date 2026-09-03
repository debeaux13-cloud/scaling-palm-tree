import { issueSignedToken, presignUrl } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { getOwner } from '../../../../../../lib/owner';
import { readOrder } from '../../../../../../lib/orders';

export async function GET(_: Request, { params }: { params: Promise<{ id: string; asset: string }> }) {
  const { ownerId } = await getOwner();
  const { id, asset } = await params;
  const order = await readOrder(id);
  const pathname = asset === 'movie' ? order?.finalMoviePathname : asset === 'storybook' ? order?.finalStorybook?.pathname : undefined;
  if (!order || order.ownerId !== ownerId || order.status !== 'complete' || !pathname) return NextResponse.json({ error: 'delivery asset not found' }, { status: 404 });

  const validUntil = Date.now() + 15 * 60 * 1000;
  const token = await issueSignedToken({ pathname, operations: ['get'], validUntil });
  const { presignedUrl } = await presignUrl(token, { pathname, operation: 'get', access: 'private', validUntil, useCache: false });
  return NextResponse.redirect(presignedUrl, { headers: { 'cache-control': 'private, no-store' } });
}
