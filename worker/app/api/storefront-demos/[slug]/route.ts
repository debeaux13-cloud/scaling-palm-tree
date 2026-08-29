import { issueSignedToken, presignUrl } from '@vercel/blob';
import { NextResponse } from 'next/server';

const DEMOS: Record<string, string> = {
  garden: 'studio/storefront-demos/garden.mp4',
  halloween: 'studio/storefront-demos/halloween.mp4',
};

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const pathname = DEMOS[slug];
  if (!pathname) return NextResponse.json({ error: 'demo not found' }, { status: 404 });
  const token = await issueSignedToken({ pathname, operations: ['get'] });
  const { presignedUrl } = await presignUrl(token, {
    pathname,
    operation: 'get',
    access: 'private',
    validUntil: Date.now() + 15 * 60 * 1000,
  });
  return NextResponse.redirect(presignedUrl, 307);
}
