import { after, NextResponse } from 'next/server';
import { getGuestPreviewOwner, getOwner } from '../../../../lib/owner';
import { mutateOrder, orderProgress, readOrder } from '../../../../lib/orders';
import { reconcileStalePaidScenes, runDirectFulfillment } from '../../../../lib/direct-preview';

export const maxDuration = 1800;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { ownerId, isGuest } = await getOwner(); const { id } = await params; let order = await readOrder(id);
  if (!order) return NextResponse.json({ error: 'order not found' }, { status: 404 });
  if (!isGuest && order.ownerId !== ownerId) { const guestOwner = await getGuestPreviewOwner(); if (guestOwner && order.ownerId === guestOwner) order = await mutateOrder(id, (fresh) => { if (fresh.ownerId === guestOwner) fresh.ownerId = ownerId; }); }
  if (!order || order.ownerId !== ownerId) return NextResponse.json({ error: 'order not found' }, { status: 404 });

  const paid = order.purchase.status === 'paid';
  if (paid) {
    await reconcileStalePaidScenes(id);
    order = await readOrder(id);
    if (!order) return NextResponse.json({ error: 'order not found' }, { status: 404 });
  }

  const complete = order.status === 'complete' || Boolean(order.finalMoviePathname);
  const submitted = order.scenes.some((scene) => scene.number > 6 && scene.status === 'submitted');
  const missingPaidScenes = order.scenes.filter((scene) => scene.number > 6 && !(scene.status === 'completed' && scene.videoPathname));

  // A planning flag is only meaningful while a paid scene is actually submitted/in flight.
  // If storage reconciliation has completed the prior scene and nothing is submitted, the
  // old worker is gone. Release that stale bookkeeping lock so fulfillment can immediately
  // continue to the next missing scene. This state change itself spends ZERO AI credits.
  if (paid && !complete && !submitted && missingPaidScenes.length > 0 && order.continuationStatus === 'planning') {
    order = await mutateOrder(id, (fresh) => {
      const nowSubmitted = fresh.scenes.some((scene) => scene.number > 6 && scene.status === 'submitted');
      const stillMissing = fresh.scenes.some((scene) => scene.number > 6 && !(scene.status === 'completed' && scene.videoPathname));
      if (!nowSubmitted && stillMissing && fresh.continuationStatus === 'planning') fresh.continuationStatus = 'ready';
    });
    console.info('[DirectMovie] STALE-PLANNING released after storage reconciliation', { orderId: id, completed: orderProgress(order).finalDone });
  }

  const canClaim = paid && !complete && !order.scenes.some((scene) => scene.number > 6 && scene.status === 'submitted') && order.continuationStatus !== 'planning';
  if (canClaim) {
    let claimed = false;
    order = await mutateOrder(id, (fresh) => {
      const nowSubmitted = fresh.scenes.some((scene) => scene.number > 6 && scene.status === 'submitted');
      const stillMissing = fresh.scenes.some((scene) => scene.number > 6 && !(scene.status === 'completed' && scene.videoPathname));
      if (fresh.purchase.status !== 'paid' || fresh.status === 'complete' || fresh.finalMoviePathname || nowSubmitted || !stillMissing || fresh.continuationStatus === 'planning') return;
      fresh.continuationStatus = 'planning'; claimed = true;
    });
    if (claimed) {
      console.info('[DirectMovie] NEXT-STAGE paid fulfillment claimed', { orderId: id, completed: orderProgress(order).finalDone });
      after(async () => {
        try { await runDirectFulfillment(id); }
        catch (error) { console.error('[DirectMovie] NEXT-STAGE fulfillment stopped', { orderId: id, error }); await mutateOrder(id, (fresh) => { if (fresh.continuationStatus === 'planning') fresh.continuationStatus = 'failed'; }); }
      });
    }
  }

  return NextResponse.json({ order, progress: orderProgress(order) });
}
