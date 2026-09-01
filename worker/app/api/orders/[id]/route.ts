import { after, NextResponse } from 'next/server';
import { getGuestPreviewOwner, getOwner } from '../../../../lib/owner';
import { mutateOrder, orderProgress, readOrder } from '../../../../lib/orders';
import { runDirectFulfillment } from '../../../../lib/direct-preview';

export const maxDuration = 1800;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { ownerId, isGuest } = await getOwner();
  const { id } = await params;
  let order = await readOrder(id);
  if (!order) return NextResponse.json({ error: 'order not found' }, { status: 404 });

  // A preview created before sign-in belongs to the browser's private guest cookie.
  // When that same browser signs in, atomically attach that exact saved order to the
  // Clerk account instead of making the preview disappear or regenerating anything.
  if (!isGuest && order.ownerId !== ownerId) {
    const guestOwner = await getGuestPreviewOwner();
    if (guestOwner && order.ownerId === guestOwner) {
      order = await mutateOrder(id, (fresh) => { if (fresh.ownerId === guestOwner) fresh.ownerId = ownerId; });
      console.info('[Orders] guest preview claimed by signed-in account', { orderId: id });
    }
  }

  if (!order || order.ownerId !== ownerId) return NextResponse.json({ error: 'order not found' }, { status: 404 });

  // Self-heal a paid direct-preview order whose Stripe request timed out before
  // fulfillment could reconcile. Polling may enter here repeatedly, so only the
  // first request is allowed to claim the recovery. The lower-level CREDIT-GUARD
  // independently reuses stored clips and blocks duplicate AI generation.
  const paid = order.purchase.status === 'paid';
  const complete = order.status === 'complete' || Boolean(order.finalMoviePathname);
  const submitted = order.scenes.some((scene) => scene.number > 6 && scene.status === 'submitted');
  const recoveryAlreadyClaimed = order.continuationStatus === 'direct-recovery-started';
  if (paid && !complete && !submitted && !recoveryAlreadyClaimed) {
    let claimed = false;
    order = await mutateOrder(id, (fresh) => {
      const stillPaid = fresh.purchase.status === 'paid';
      const stillIncomplete = fresh.status !== 'complete' && !fresh.finalMoviePathname;
      const nowSubmitted = fresh.scenes.some((scene) => scene.number > 6 && scene.status === 'submitted');
      if (!stillPaid || !stillIncomplete || nowSubmitted || fresh.continuationStatus === 'direct-recovery-started') return;
      fresh.continuationStatus = 'direct-recovery-started';
      claimed = true;
    });
    if (claimed) {
      console.info('[DirectMovie] stalled paid order recovery claimed from polling', { orderId: id });
      after(async () => {
        try { await runDirectFulfillment(id); }
        catch (error) {
          console.error('[DirectMovie] stalled paid order recovery failed', { orderId: id, error });
          await mutateOrder(id, (fresh) => { if (fresh.continuationStatus === 'direct-recovery-started') fresh.continuationStatus = 'direct-recovery-failed'; });
        }
      });
    }
  }

  return NextResponse.json({ order, progress: orderProgress(order) });
}
