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

  const paid = order.purchase.status === 'paid';
  const allScenesComplete = order.scenes.slice(0, 18).every((scene) => scene.status === 'completed' && Boolean(scene.videoPathname));
  const finalMissing = !order.finalMoviePathname && order.status !== 'complete';

  // Once all 18 scene assets exist, polling is permanently assembly-only. It may NEVER
  // call the AI generator again for this order. This is the safe path for completed movies.
  if (paid && allScenesComplete && finalMissing) {
    let claimed = false;
    order = await mutateOrder(id, (fresh) => { if (fresh.continuationStatus !== 'planning' && !fresh.finalMoviePathname) { fresh.continuationStatus = 'planning'; claimed = true; } });
    if (claimed) {
      console.info('[DirectMovie] ASSEMBLY-ONLY recovery claimed from polling', { orderId: id });
      after(async () => { try { const assembled = await assembleDirectFinalIfComplete(id); if (!assembled) throw new Error('18-scene assembly-only recovery could not verify all stored MP4s'); } catch (error) { console.error('[DirectMovie] ASSEMBLY-ONLY recovery failed', { orderId: id, error }); await mutateOrder(id, (fresh) => { if (fresh.continuationStatus === 'planning') fresh.continuationStatus = 'failed'; }); } });
    }
    return NextResponse.json({ order, progress: orderProgress(order) });
  }

  if (paid) { await reconcileStalePaidScenes(id); order = await readOrder(id); if (!order) return NextResponse.json({ error: 'order not found' }, { status: 404 }); }
  const complete = order.status === 'complete' || Boolean(order.finalMoviePathname); const submitted = order.scenes.some((scene) => scene.number > 6 && scene.status === 'submitted'); const recoveryAlreadyClaimed = order.continuationStatus === 'planning';
  if (paid && !complete && !submitted && !recoveryAlreadyClaimed) {
    let claimed = false;
    order = await mutateOrder(id, (fresh) => { const stillPaid = fresh.purchase.status === 'paid'; const stillIncomplete = fresh.status !== 'complete' && !fresh.finalMoviePathname; const nowSubmitted = fresh.scenes.some((scene) => scene.number > 6 && scene.status === 'submitted'); if (!stillPaid || !stillIncomplete || nowSubmitted || fresh.continuationStatus === 'planning') return; fresh.continuationStatus = 'planning'; claimed = true; });
    if (claimed) { console.info('[DirectMovie] stalled paid order recovery claimed from polling', { orderId: id }); after(async () => { try { await runDirectFulfillment(id); } catch (error) { console.error('[DirectMovie] stalled paid order recovery failed', { orderId: id, error }); await mutateOrder(id, (fresh) => { if (fresh.continuationStatus === 'planning') fresh.continuationStatus = 'failed'; }); } }); }
  }
  return NextResponse.json({ order, progress: orderProgress(order) });
}
