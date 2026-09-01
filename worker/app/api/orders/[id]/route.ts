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
  const paid = order.purchase.status === 'paid'; const finalMissing = !order.finalMoviePathname && order.status !== 'complete';

  // A legacy recovery may leave continuationStatus='planning' forever after its function died.
  // For a PAID order whose UI/order progress says all 18 scenes are complete, that stale lock
  // must never prevent finalization. Reclaim it only into the ASSEMBLY-ONLY path. This path
  // cannot call generateVideo and therefore cannot spend AI credits.
  const progress = orderProgress(order);
  const progressComplete = progress.completedScenes >= 18;
  if (paid && finalMissing && progressComplete) {
    let claimed = false;
    order = await mutateOrder(id, (fresh) => {
      if (fresh.purchase.status !== 'paid' || fresh.finalMoviePathname || fresh.status === 'complete') return;
      // Deliberately reclaim even a stale `planning` value. Safe because the only work launched
      // from this branch is assembleDirectFinalIfComplete(), which is storage/assembly only.
      fresh.continuationStatus = 'planning'; claimed = true;
    });
    if (claimed) {
      console.info('[DirectMovie] ASSEMBLY-ONLY stale lock reclaimed at 18/18', { orderId: id });
      after(async () => { try { const assembled = await assembleDirectFinalIfComplete(id); if (!assembled) { await mutateOrder(id, (fresh) => { if (fresh.continuationStatus === 'planning') fresh.continuationStatus = 'failed'; }); console.warn('[DirectMovie] ASSEMBLY-ONLY 18/18 storage verification found missing MP4; AI remains blocked from this path', { orderId: id }); } } catch (error) { console.error('[DirectMovie] ASSEMBLY-ONLY stale-lock finalization failed', { orderId: id, error }); await mutateOrder(id, (fresh) => { if (fresh.continuationStatus === 'planning') fresh.continuationStatus = 'failed'; }); } });
    }
    return NextResponse.json({ order, progress: orderProgress(order) });
  }

  // Normal paid orders: storage-first probe before any credit-capped generation recovery.
  if (paid && finalMissing && order.continuationStatus !== 'planning') {
    let claimed = false; order = await mutateOrder(id, (fresh) => { if (fresh.purchase.status === 'paid' && !fresh.finalMoviePathname && fresh.status !== 'complete' && fresh.continuationStatus !== 'planning') { fresh.continuationStatus = 'planning'; claimed = true; } });
    if (claimed) { after(async () => { try { if (await assembleDirectFinalIfComplete(id)) return; await mutateOrder(id, (fresh) => { if (fresh.continuationStatus === 'planning') fresh.continuationStatus = 'ready'; }); } catch (error) { console.error('[DirectMovie] STORAGE-FIRST assembly probe failed', { orderId: id, error }); await mutateOrder(id, (fresh) => { if (fresh.continuationStatus === 'planning') fresh.continuationStatus = 'failed'; }); } }); }
    return NextResponse.json({ order, progress: orderProgress(order) });
  }

  if (paid && order.continuationStatus === 'ready') { await reconcileStalePaidScenes(id); order = await readOrder(id); if (!order) return NextResponse.json({ error: 'order not found' }, { status: 404 }); }
  const complete = order.status === 'complete' || Boolean(order.finalMoviePathname); const submitted = order.scenes.some((scene) => scene.number > 6 && scene.status === 'submitted');
  if (paid && !complete && !submitted && order.continuationStatus === 'ready') { let claimed = false; order = await mutateOrder(id, (fresh) => { const nowSubmitted = fresh.scenes.some((scene) => scene.number > 6 && scene.status === 'submitted'); if (fresh.purchase.status !== 'paid' || fresh.status === 'complete' || fresh.finalMoviePathname || nowSubmitted || fresh.continuationStatus !== 'ready') return; fresh.continuationStatus = 'planning'; claimed = true; }); if (claimed) { after(async () => { try { await runDirectFulfillment(id); } catch (error) { console.error('[DirectMovie] credit-capped paid recovery stopped', { orderId: id, error }); await mutateOrder(id, (fresh) => { if (fresh.continuationStatus === 'planning') fresh.continuationStatus = 'failed'; }); } }); } }
  return NextResponse.json({ order, progress: orderProgress(order) });
}
