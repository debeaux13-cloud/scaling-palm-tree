import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { start } from 'workflow/api';
import { getOwner } from '../../../lib/owner';
import { listOrders, previewSceneCount, sceneIdentity, type Scene, writeOrder } from '../../../lib/orders';
import { movieWorkflow } from '../../../lib/movie-workflow';
export async function GET() { const { ownerId } = await getOwner(); return NextResponse.json({ orders: await listOrders(ownerId) }); }
export async function POST(request: Request) {
  const { ownerId } = await getOwner(); const { title, scenes, subjectPhotoPathnames = [], moods = [], storyDirection = '' } = await request.json();
  if (typeof title !== 'string' || typeof storyDirection !== 'string' || !Array.isArray(scenes) || !Array.isArray(subjectPhotoPathnames) || !Array.isArray(moods) || scenes.length !== 18) return NextResponse.json({ error: 'A complete 18-scene movie story and photo references are required.' }, { status: 400 });
  if (subjectPhotoPathnames.length < 1 || subjectPhotoPathnames.length > 3 || subjectPhotoPathnames.some((pathname) => typeof pathname !== 'string' || !pathname.startsWith(`studio/owners/${ownerId}/references/`))) return NextResponse.json({ error: 'Reference photos are invalid.' }, { status: 403 });
  const normalized = scenes.map((scene, index): Scene => ({ number: index + 1, narration: String(scene?.narration ?? '').trim(), videoPrompt: String(scene?.videoPrompt ?? '').trim(), status: 'ready', generation: { key: sceneIdentity('pending', index + 1), attempts: 0 } }));
  if (normalized.some((scene) => !scene.narration || !scene.videoPrompt)) return NextResponse.json({ error: 'Every movie scene needs narration and a video prompt.' }, { status: 400 });
  const orderId = randomUUID();
  const order = { id: orderId, ownerId, title: title.trim(), storyDirection, moods: moods.filter((mood): mood is string => typeof mood === 'string'), subjectPhotoPathnames, createdAt: new Date().toISOString(), status: 'preview-ready' as const, continuationStatus: 'planned' as const, scenes: normalized, purchase: { status: 'not-started' as const }, previewStorybook: { pageCount: previewSceneCount(), status: 'blocked-missing-scene-assets' as const } };
  order.scenes.forEach((scene) => { scene.generation.key = sceneIdentity(orderId, scene.number); });
  await writeOrder({ ...order, workflowStarted: true });
  await start(movieWorkflow, [orderId]);
  return NextResponse.json({ order: { ...order, workflowStarted: true } }, { status: 201 });
}
