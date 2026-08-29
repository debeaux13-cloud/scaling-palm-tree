import { NextResponse } from 'next/server';
import { getOwner } from '../../../../../lib/owner';
import { readOrder, tierFor } from '../../../../../lib/orders';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { ownerId } = await getOwner();
  const { id } = await params;
  const order = await readOrder(id);
  if (!order || order.ownerId !== ownerId) return NextResponse.json({ error: 'order not found' }, { status: 404 });
  return NextResponse.json({
    preview: { pages: order.previewStorybook?.pageCount ?? 6, usesExactSceneArtwork: true, usesExactSceneNarration: true, customerFacingSceneLabels: false, status: order.previewStorybook?.status },
    final: { pages: order.finalStorybook?.pageCount ?? tierFor(order).storybookPages, usesExactSceneArtwork: true, usesExactSceneNarration: true, customerFacingSceneLabels: false, status: order.finalStorybook?.status },
    note: 'PDF generation is intentionally blocked until each required scene has its exact rendered artwork and narration assets.',
  });
}
