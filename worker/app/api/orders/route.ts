import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { requireStudioAccess } from '../../../lib/auth';
import { listOrders, type Scene, writeOrder } from '../../../lib/orders';

export async function GET(request: Request) {
  const denied = requireStudioAccess(request);
  if (denied) return denied;
  return NextResponse.json({ orders: await listOrders() });
}

export async function POST(request: Request) {
  const denied = requireStudioAccess(request);
  if (denied) return denied;
  const { title, scenes } = await request.json();
  if (typeof title !== 'string' || !Array.isArray(scenes) || scenes.length !== 30) return NextResponse.json({ error: 'title and exactly 30 scenes are required' }, { status: 400 });
  const normalized = scenes.map((scene, index): Scene => ({ number: index + 1, narration: String(scene?.narration ?? '').trim(), videoPrompt: String(scene?.videoPrompt ?? '').trim(), status: index < 6 ? 'ready' : 'locked' }));
  if (normalized.some((scene) => !scene.narration || !scene.videoPrompt)) return NextResponse.json({ error: 'Every scene needs exact narration and a video prompt.' }, { status: 400 });
  const order = { id: randomUUID(), title: title.trim(), createdAt: new Date().toISOString(), status: 'preview-ready' as const, scenes: normalized, purchase: { status: 'not-started' as const }, previewStorybook: { pageCount: 6 as const, status: 'blocked-missing-scene-assets' as const }, finalStorybook: { pageCount: 30 as const, status: 'locked' as const } };
  await writeOrder(order);
  return NextResponse.json({ order }, { status: 201 });
}
