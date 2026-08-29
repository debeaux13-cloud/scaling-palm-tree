import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { requireCustomer } from '../../../lib/auth';
import { listOrders, type Scene, writeOrder } from '../../../lib/orders';

export async function GET(request: Request) {
  const { userId, response } = await requireCustomer();
  if (response || !userId) return response!;
  return NextResponse.json({ orders: await listOrders(userId) });
}

export async function POST(request: Request) {
  const { userId, response } = await requireCustomer();
  if (response || !userId) return response!;
  const { title, scenes } = await request.json();
  if (typeof title !== 'string' || !Array.isArray(scenes) || scenes.length !== 18) return NextResponse.json({ error: 'title and exactly 18 scenes are required' }, { status: 400 });
  const normalized = scenes.map((scene, index): Scene => ({ number: index + 1, narration: String(scene?.narration ?? '').trim(), videoPrompt: String(scene?.videoPrompt ?? '').trim(), status: index < 6 ? 'ready' : 'locked' }));
  if (normalized.some((scene) => !scene.narration || !scene.videoPrompt)) return NextResponse.json({ error: 'Every scene needs exact narration and a video prompt.' }, { status: 400 });
  const order = { id: randomUUID(), customerId: userId, title: title.trim(), createdAt: new Date().toISOString(), status: 'preview-ready' as const, scenes: normalized, purchase: { status: 'not-started' as const }, previewStorybook: { pageCount: 6 as const, status: 'blocked-missing-scene-assets' as const }, finalStorybook: { pageCount: 18 as const, status: 'locked' as const } };
  await writeOrder(order);
  return NextResponse.json({ order }, { status: 201 });
}
