import { NextResponse } from 'next/server';
import { BlobNotFoundError, head } from '@vercel/blob';
import { getGuestPreviewOwner, getOwner } from '../../../../lib/owner';
import { mutateOrder, orderProgress, readOrder } from '../../../../lib/orders';
import { reconcileStalePaidScenes } from '../../../../lib/direct-preview';
import { startPaidFulfillment } from '../../../../lib/paid-fulfillment-workflow';

export const maxDuration = 1800;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { ownerId, isGuest } = await getOwner();
  const { id } = await params;
  let order = await readOrder(id);
  if (!order) return NextResponse.json({ error: 'order not found' }, { status: 404 });
  if (!isGuest && order.ownerId !== ownerId) {
    const guestOwner = await getGuestPreviewOwner();
    if (guestOwner && order.ownerId === guestOwner) order = await mutateOrder(id, (fresh) => { if (fresh.ownerId === guestOwner) fresh.ownerId = ownerId; });
  }
  if (!order || order.ownerId !== ownerId) return NextResponse.json({ error: 'order not found' }, { status: 404 });

  const paid = order.purchase.status === 'paid';
  if (paid) {
    await reconcileStalePaidScenes(id);
    order = await readOrder(id);
    if (!order) return NextResponse.json({ error: 'order not found' }, { status: 404 });

    if (!order.finalMoviePathname) {
      const finalMoviePathname = `studio/orders/${id}/final/movie.mp4`;
      let finalMovieExists = false;
      try { await head(finalMoviePathname); finalMovieExists = true; }
      catch (error) { if (!(error instanceof BlobNotFoundError)) throw error; }
      if (finalMovieExists) {
        order = await mutateOrder(id, (fresh) => {
          fresh.finalMoviePathname = finalMoviePathname;
          fresh.status = 'complete';
          // continuationStatus has no `complete` member; `planned` is the terminal successful state.
          fresh.continuationStatus = 'planned';
        });
        console.info('[DirectMovie] final movie reconciled from Blob; customer player unlocked', { orderId: id, finalMoviePathname });
      }
    }
  }

  const complete = order.status === 'complete' || Boolean(order.finalMoviePathname);
  if (paid && !complete) {
    let claimed = false;
    order = await mutateOrder(id, (fresh) => {
      const active = fresh.scenes.some((scene) => scene.number > 6 && scene.status === 'submitted');
      if (fresh.purchase.status !== 'paid' || fresh.status === 'complete' || fresh.finalMoviePathname || active) return;
      if (fresh.continuationStatus === 'planning') return;
      fresh.continuationStatus = 'planning';
      claimed = true;
    });
    if (claimed) {
      console.info('[DirectMovie] paid runner atomically claimed', { orderId: id });
      try { await startPaidFulfillment(id); }
      catch (error) {
        console.error('[DirectMovie] paid workflow start failed', { orderId: id, error });
        await mutateOrder(id, (fresh) => { if (fresh.continuationStatus === 'planning') fresh.continuationStatus = 'failed'; });
      }
    }
  }
  return NextResponse.json({ order, progress: orderProgress(order) });
}
