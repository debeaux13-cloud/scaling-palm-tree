import { after, NextResponse } from 'next/server';
import { getGuestPreviewOwner, getOwner } from '../../../../lib/owner';
import { mutateOrder, orderProgress, readOrder } from '../../../../lib/orders';
import { assembleDirectFinalIfComplete, reconcileStalePaidScenes, runDirectFulfillment } from '../../../../lib/direct-preview';

export const maxDuration = 1800;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { ownerId, isGuest } = await getOwner(); const { id } = await params; let order = await readOrder(id);
  if (!order) return NextResponse.json({ error: 'order not found' }, { status: 404 });
  if (!isGuest && order.ownerId !== ownerId) { const guestOwner = await getGuestPreviewOwner(); if (guestOwner && order.ownerId === guestOwner) { order = await mutateOrder(id, (fresh) => { if (fresh.ownerId === guestOwner) fresh.ownerId = ownerId; }); } }
  if (!order || order.ownerId !== ownerId) return NextResponse.json({ error: 'order not found' }, { status: 404 });

  const paid = order.purchase.status === 'paid';
  const complete = order.status === 'complete' || Boolean(order.finalMoviePathname);
  let progress = orderProgress(order);

  // FINAL ASSEMBLY IS A SEPARATE PHASE. Only enter it after all product scenes exist.
  if (paid && !complete && progress.finalDone >= progress.finalTotal && progress.finalTotal >= 18) {
    let claimed = false;
    order = await mutateOrder(id, (fresh) => { if (fresh.purchase.status !== 'paid' || fresh.finalMoviePathname || fresh.status === 'complete') return; fresh.continuationStatus = 'planning'; claimed = true; });
    if (claimed) {
      console.info('[DirectMovie] ASSEMBLY-ONLY finalization claimed at complete scene count', { orderId: id, finalDone: progress.finalDone, finalTotal: progress.finalTotal });
      after(async () => { try { const assembled = await assembleDirectFinalIfComplete(id); if (!assembled) throw new Error('Stored scene verification incomplete'); } catch (error) { console.error('[DirectMovie] ASSEMBLY-ONLY finalization failed', { orderId: id, error }); await mutateOrder(id, (fresh) => { if (fresh.continuationStatus === 'planning') fresh.continuationStatus = 'failed'; }); } });
    }
    return NextResponse.json({ order, progress: orderProgress(order) });
  }

  // RESTORE THE PROVEN 12:30-ISH PAID CONTINUATION BEHAVIOR:
  // while scenes 7-18 are incomplete, reconcile stored clips first, then wake the
  // credit-capped fulfillment runner from ordinary order polling. Assembly probes are
  // deliberately NOT allowed to claim the order while generation is still incomplete.
  if (paid && !complete && progress.finalDone < progress.finalTotal) {
    await reconcileStalePaidScenes(id);
    order = await readOrder(id);
    if (!order) return NextResponse.json({ error: 'order not found' }, { status: 404 });
    progress = orderProgress(order);
    const submitted = order.scenes.some((scene) => scene.number > 6 && scene.status === 'submitted');
    const hasEligibleMissingScene = order.scenes.some((scene) => scene.number > 6 && scene.status !== 'completed' && scene.generation.attempts < 1);
    // A stale planning/failed/ready state must not strand a genuinely eligible missing scene.
    // Claim it back into fulfillment; runDirectFulfillment remains the authority for the
    // one-attempt-per-scene and per-order credit caps.
    if (!submitted && hasEligibleMissingScene) {
      let claimed = false;
      order = await mutateOrder(id, (fresh) => {
        const nowSubmitted = fresh.scenes.some((scene) => scene.number > 6 && scene.status === 'submitted');
        const stillEligible = fresh.scenes.some((scene) => scene.number > 6 && scene.status !== 'completed' && scene.generation.attempts < 1);
        if (fresh.purchase.status !== 'paid' || fresh.status === 'complete' || fresh.finalMoviePathname || nowSubmitted || !stillEligible) return;
        fresh.continuationStatus = 'planning'; claimed = true;
      });
      if (claimed) {
        console.info('[DirectMovie] FAST-PAID-CONTINUATION claimed from polling', { orderId: id, completed: progress.finalDone, total: progress.finalTotal });
        after(async () => { try { await runDirectFulfillment(id); } catch (error) { console.error('[DirectMovie] FAST-PAID-CONTINUATION stopped safely', { orderId: id, error }); await mutateOrder(id, (fresh) => { if (fresh.continuationStatus === 'planning') fresh.continuationStatus = 'failed'; }); } });
      }
    }
  }

  return NextResponse.json({ order, progress: orderProgress(order) });
}
