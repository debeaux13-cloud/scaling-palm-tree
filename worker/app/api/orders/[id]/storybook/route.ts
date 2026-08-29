import { NextResponse } from 'next/server';
import { requireStudioAccess } from '../../../../../lib/auth';
import { readOrder } from '../../../../../lib/orders';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireStudioAccess(request);
  if (denied) return denied;
  const { id } = await params;
  const order = await readOrder(id);
  if (!order) return NextResponse.json({ error: 'order not found' }, { status: 404 });
  return NextResponse.json({
    preview: { pages: 6, usesExactSceneArtwork: true, usesExactSceneNarration: true, customerFacingSceneLabels: false, status: order.previewStorybook?.status },
    final: { pages: 18, usesExactSceneArtwork: true, usesExactSceneNarration: true, customerFacingSceneLabels: false, status: order.finalStorybook?.status },
    note: 'PDF generation is intentionally blocked until each required scene has its exact rendered artwork and narration assets.',
  });
}
