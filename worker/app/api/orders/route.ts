import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getOwner } from '../../../lib/owner';
import { listOrders, previewSceneCount, type Scene, writeOrder } from '../../../lib/orders';
export async function GET() { const { ownerId } = await getOwner(); return NextResponse.json({ orders: await listOrders(ownerId) }); }
export async function POST(request: Request) {
  const { ownerId } = await getOwner(); const { title, scenes, subjectPhotoPathnames = [], moods = [], storyDirection = '' } = await request.json();
  if (typeof title !== 'string' || typeof storyDirection !== 'string' || !Array.isArray(scenes) || !Array.isArray(subjectPhotoPathnames) || !Array.isArray(moods) || scenes.length !== previewSceneCount()) return NextResponse.json({ error: 'A six-scene preview story and photo references are required.' }, { status: 400 });
  if (subjectPhotoPathnames.length < 1 || subjectPhotoPathnames.length > 3 || subjectPhotoPathnames.some((pathname) => typeof pathname !== 'string' || !pathname.startsWith(`studio/owners/${ownerId}/references/`))) return NextResponse.json({ error: 'Reference photos are invalid.' }, { status: 403 });
  const normalized = scenes.map((scene, index): Scene => ({ number: index + 1, narration: String(scene?.narration ?? '').trim(), videoPrompt: String(scene?.videoPrompt ?? '').trim(), status: 'ready' }));
  if (normalized.some((scene) => !scene.narration || !scene.videoPrompt)) return NextResponse.json({ error: 'Every preview scene needs narration and a video prompt.' }, { status: 400 });
  const order = { id: randomUUID(), ownerId, title: title.trim(), storyDirection, moods: moods.filter((mood): mood is string => typeof mood === 'string'), subjectPhotoPathnames, createdAt: new Date().toISOString(), status: 'preview-ready' as const, continuationStatus: 'not-selected' as const, scenes: normalized, purchase: { status: 'not-started' as const }, previewStorybook: { pageCount: previewSceneCount(), status: 'blocked-missing-scene-assets' as const } };
  await writeOrder(order); return NextResponse.json({ order }, { status: 201 });
}
