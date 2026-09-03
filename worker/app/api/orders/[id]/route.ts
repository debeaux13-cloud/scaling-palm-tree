import { NextResponse } from 'next/server';
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
  }

  const complete = order.status === 'complete' || Boolean(order.finalMoviePathname);
  if (paid && !complete) {
    let claimed = false;
    let releasedOrphan = false;

    order = await mutateOrder(id, (fresh) => {
      const active = fresh.scenes.some((scene) => scene.number > 6 && scene.status === 'submitted');
      if (fresh.purchase.status !== 'paid' || fresh.status === 'complete' || fresh.finalMoviePathname || active) return;

      if (fresh.continuationStatus === 'planning') releasedOrphan = true;
      // This same write owns the stale-lock takeover and runner claim. Do not expose an
      // intermediate `ready` state for another polling request to race against. The paid
      // workflow also owns final assembly, so it must run even when reconciliation has
      // already found every stored scene and there is nothing left to generate.
      fresh.continuationStatus = 'planning';
      claimed = true;
    });

    if (releasedOrphan) console.info('[DirectMovie] orphaned planning claim atomically reclaimed', { orderId: id });
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
