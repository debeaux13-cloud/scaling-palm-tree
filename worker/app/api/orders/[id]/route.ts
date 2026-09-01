import { after, NextResponse } from 'next/server';
import { getGuestPreviewOwner, getOwner } from '../../../../lib/owner';
import { mutateOrder, orderProgress, readOrder } from '../../../../lib/orders';
import { reconcileStalePaidScenes, runDirectFulfillment } from '../../../../lib/direct-preview';

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

    // One mutation owns the entire handoff. If planning is stale, release it and
    // immediately re-claim it in this same write so another poll cannot race between them.
    order = await mutateOrder(id, (fresh) => {
      const active = fresh.scenes.some((scene) => scene.number > 6 && scene.status === 'submitted');
      const stillMissing = fresh.scenes.some((scene) => scene.number > 6 && !(scene.status === 'completed' && scene.videoPathname));
      if (fresh.purchase.status !== 'paid' || fresh.status === 'complete' || fresh.finalMoviePathname || active || !stillMissing) return;

      if (fresh.continuationStatus === 'planning') {
        releasedOrphan = true;
        fresh.continuationStatus = 'ready';
      }

      if (fresh.continuationStatus !== 'planning') {
        fresh.continuationStatus = 'planning';
        claimed = true;
      }
    });

    if (releasedOrphan) console.info('[DirectMovie] orphaned planning claim released and atomically reclaimed', { orderId: id });
    if (claimed) {
      console.info('[DirectMovie] paid runner atomically claimed', { orderId: id });
      after(async () => {
        try { await runDirectFulfillment(id); }
        catch (error) {
          console.error('[DirectMovie] paid runner stopped', { orderId: id, error });
          await mutateOrder(id, (fresh) => { if (fresh.continuationStatus === 'planning') fresh.continuationStatus = 'failed'; });
        }
      });
    }
  }

  return NextResponse.json({ order, progress: orderProgress(order) });
}
