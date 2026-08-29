import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getOwner } from '../../../lib/owner';
import { isProductTier, listOrders, PRODUCT_TIERS, previewSceneCount, type Scene, writeOrder } from '../../../lib/orders';

export async function GET() { const { ownerId } = await getOwner(); return NextResponse.json({ orders: await listOrders(ownerId) }); }
export async function POST(request: Request) {
  const { ownerId } = await getOwner();
  const { title, scenes, subjectPhotoPathnames = [], tier, moods = [] } = await request.json();
  if (typeof title !== 'string' || !isProductTier(tier) || !Array.isArray(scenes) || !Array.isArray(subjectPhotoPathnames) || !Array.isArray(moods)) return NextResponse.json({ error: 'title, tier, scenes, photo references, and moods are required' }, { status: 400 });
  const product = PRODUCT_TIERS[tier];
  if (scenes.length !== product.sceneCount) return NextResponse.json({ error: `${product.label} requires exactly ${product.sceneCount} scenes.` }, { status: 400 });
  if (subjectPhotoPathnames.length < 1 || subjectPhotoPathnames.length > 3) return NextResponse.json({ error: 'Upload one to three reference photos.' }, { status: 400 });
  if (subjectPhotoPathnames.some((pathname) => typeof pathname !== 'string' || !pathname.startsWith(`studio/owners/${ownerId}/references/`))) return NextResponse.json({ error: 'Every reference photo must belong to your account.' }, { status: 403 });
  const normalized = scenes.map((scene, index): Scene => ({ number: index + 1, narration: String(scene?.narration ?? '').trim(), videoPrompt: String(scene?.videoPrompt ?? '').trim(), status: index < previewSceneCount() ? 'ready' : 'locked' }));
  if (normalized.some((scene) => !scene.narration || !scene.videoPrompt)) return NextResponse.json({ error: 'Every scene needs exact narration and a video prompt.' }, { status: 400 });
  const order = { id: randomUUID(), ownerId, title: title.trim(), tier, targetRuntimeSeconds: product.targetRuntimeSeconds, moods: moods.filter((mood): mood is string => typeof mood === 'string'), subjectPhotoPathnames, createdAt: new Date().toISOString(), status: 'preview-ready' as const, scenes: normalized, purchase: { status: 'not-started' as const }, previewStorybook: { pageCount: previewSceneCount(), status: 'blocked-missing-scene-assets' as const }, finalStorybook: { pageCount: product.storybookPages, status: 'locked' as const } };
  await writeOrder(order);
  return NextResponse.json({ order }, { status: 201 });
}
