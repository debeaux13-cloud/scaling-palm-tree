import { after, NextResponse } from 'next/server';
import { getGuestPreviewOwner, getOwner } from '../../../../lib/owner';
import { mutateOrder, orderProgress, readOrder } from '../../../../lib/orders';
import { assembleDirectFinalIfComplete, reconcileStalePaidScenes, runDirectFulfillment } from '../../../../lib/direct-preview';

export const maxDuration = 1800;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { ownerId, isGuest } = await getOwner(); const { id } = await params; let order = await readOrder(id);
  if (!order) return NextResponse.json({ error: 'order not found' }, { status: 404 });
  if (!isGuest && order.ownerId !== ownerId) { const guestOwner = await getGuestPreviewOwner(); if (guestOwner && order.ownerId === guestOwner) { order = await mutateOrder(id, (fresh) => { if (fresh.ownerId === guestOwner) fresh.ownerId = ownerId; }); console.info('[Orders] guest preview claimed by signed-in account', { orderId: id }); } }
  if (!order || order.ownerId !== ownerId) return NextResponse.json({ error: 'order not found' }, { status: 404 });

  const paid = order.purchase.status === 'paid'; const finalMissing = !order.finalMoviePathname && order.status !== 'complete';

  // STORAGE-FIRST FINALIZATION: for any paid order missing its final movie, try the
  // assembly-only verifier BEFORE looking at scene-record statuses. It checks Blob storage,
  // recovers all existing MP4s into the order, and assembles when all 18 are present.
  // This path has zero access to generateVideo, so a visually-complete legacy/recovered
  // order can finish even when stale persisted scene statuses disagree with storage.
  if (paid && finalMissing && order.continuationStatus !== 'planning') {
    let claimed = false;
    order = await mutateOrder(id, (fresh) => { if (fresh.purchase.status === 'paid' && !fresh.finalMoviePathname && fresh.status !== 'complete' && fresh.continuationStatus !== 'planning') { fresh.continuationStatus = 'planning'; claimed = true; } });
    if (claimed) {
      console.info('[DirectMovie] STORAGE-FIRST assembly probe claimed from polling', { orderId: id });
      after(async () => {
        try {
          if (await assembleDirectFinalIfComplete(id)) return;
          await mutateOrder(id, (fresh) => { if (fresh.continuationStatus === 'planning') fresh.continuationStatus = 'ready'; });
          console.info('[DirectMovie] STORAGE-FIRST assembly probe incomplete; handing off to credit-capped recovery', { orderId: id });
        } catch (error) {
          console.error('[DirectMovie] STORAGE-FIRST assembly probe failed', { orderId: id, error });
          await mutateOrder(id, (fresh) => { if (fresh.continuationStatus === 'planning') fresh.continuationStatus = 'failed'; });
        }
      });
    }
    return NextResponse.json({ order, progress: orderProgress(order) });
  }

  // Only orders that storage-first assembly could not complete may reach recovery.
  // The lower-level hard credit cap allows at most one automatic AI authorization per scene.
  if (paid && order.continuationStatus === 'ready') { await reconcileStalePaidScenes(id); order = await readOrder(id); if (!order) return NextResponse.json({ error: 'order not found' }, { status: 404 }); }
  const complete = order.status === 'complete' || Boolean(order.finalMoviePathname); const submitted = order.scenes.some((scene) => scene.number > 6 && scene.status === 'submitted'); const recoveryAlreadyClaimed = order.continuationStatus === 'planning';
  if (paid && !complete && !submitted && !recoveryAlreadyClaimed && order.continuationStatus === 'ready') {
    let claimed = false;
    order = await mutateOrder(id, (fresh) => { const stillPaid = fresh.purchase.status === 'paid'; const stillIncomplete = fresh.status !== 'complete' && !fresh.finalMoviePathname; const nowSubmitted = fresh.scenes.some((scene) => scene.number > 6 && scene.status === 'submitted'); if (!stillPaid || !stillIncomplete || nowSubmitted || fresh.continuationStatus !== 'ready') return; fresh.continuationStatus = 'planning'; claimed = true; });
    if (claimed) { console.info('[DirectMovie] credit-capped paid recovery claimed after storage-first probe', { orderId: id }); after(async () => { try { await runDirectFulfillment(id); } catch (error) { console.error('[DirectMovie] credit-capped paid recovery stopped', { orderId: id, error }); await mutateOrder(id, (fresh) => { if (fresh.continuationStatus === 'planning') fresh.continuationStatus = 'failed'; }); } }); }
  }
  return NextResponse.json({ order, progress: orderProgress(order) });
}
