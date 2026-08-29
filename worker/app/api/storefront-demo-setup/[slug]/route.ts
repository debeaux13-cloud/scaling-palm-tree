import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

const SETUP_TOKEN = 'mcs-storefront-demo-setup-2026-08-29';
const DEMOS: Record<string, string> = {
  garden: 'studio/storefront-demos/garden.mp4',
  halloween: 'studio/storefront-demos/halloween.mp4',
};

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (request.headers.get('x-storefront-setup') !== SETUP_TOKEN) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { slug } = await params;
  const pathname = DEMOS[slug];
  if (!pathname) return NextResponse.json({ error: 'unknown demo' }, { status: 404 });
  const body = Buffer.from(await request.arrayBuffer());
  if (!body.length || body.length > 4 * 1024 * 1024) {
    return NextResponse.json({ error: 'invalid demo asset' }, { status: 400 });
  }
  const blob = await put(pathname, body, {
    access: 'private',
    contentType: 'video/mp4',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return NextResponse.json({ pathname: blob.pathname, size: body.length });
}
