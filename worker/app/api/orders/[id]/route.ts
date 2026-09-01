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
  const submitted = order.scenes.some((scene) => scene.number > 6 && scene.status === 'submitted');
  const missing = order.scenes.some((scene) => scene.number > 6 && !(scene.status === 'completed' && scene.videoPathname));

  // A planning claim with no submitted paid scene is orphaned. Release only the claim;
  // stored/completed scenes and generation attempt counts are untouched.
  if (paid && !complete && missing && !submitted && order.continuationStatus === 'planning') {
    order = await mutateOrder(id, (fresh) => {
      const active = fresh.scenes.some((scene) => scene.number > 6 && scene.status === 'submitted');
      const stillMissing = fresh.scenes.some((scene) => scene.number > 6 && !(scene.status === 'completed' && scene.videoPathname));
      if (!active && stillMissing && fresh.continuationStatus === 'planning') fresh.continuationStatus = 'ready';
    });
    console.info('[DirectMovie] orphaned planning claim released', { orderId: id });
  }

  const nowSubmitted = order.scenes.some((scene) => scene.number > 6 && scene.status === 'submitted');
  if (paid && !complete && !nowSubmitted && order.continuationStatus !== 'planning') {
    let claimed = false;
    order = await mutateOrder(id, (fresh) => {
      const active = fresh.scenes.some((scene) => scene.number > 6 && scene.status === 'submitted');
      const stillMissing = fresh.scenes.some((scene) => scene.number > 6 && !(scene.status === 'completed' && scene.videoPathname));
      if (fresh.purchase.status !== 'paid' || fresh.status === 'complete' || fresh.finalMoviePathname || active || !stillMissing || fresh.continuationStatus === 'planning') return;
      fresh.continuationStatus = 'planning';
      claimed = true;
    });
    if (claimed) {
      console.info('[DirectMovie] proven paid runner claimed after orphan release', { orderId: id });
      after(async () => {
        try { await runDirectFulfillment(id); }
        catch (error) {
          console.error('[DirectMovie] proven paid runner stopped', { orderId: id, error });
          await mutateOrder(id, (fresh) => { if (fresh.continuationStatus === 'planning') fresh.continuationStatus = 'failed'; });
        }
      });
    }
  }

  return NextResponse.json({ order, progress: orderProgress(order) });
}
