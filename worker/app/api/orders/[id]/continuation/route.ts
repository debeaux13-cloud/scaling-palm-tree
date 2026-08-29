import { generateObject } from 'ai';
import { z } from 'zod';
import { NextResponse } from 'next/server';
import { getOwner } from '../../../../../lib/owner';
import { previewSceneCount, readOrder, tierFor, type Scene, writeOrder } from '../../../../../lib/orders';
const schema = z.object({ scenes: z.array(z.object({ narration: z.string().min(1), videoPrompt: z.string().min(1) })) });
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { ownerId } = await getOwner(); const { id } = await params; const order = await readOrder(id);
  if (!order || order.ownerId !== ownerId) return NextResponse.json({ error: 'order not found' }, { status: 404 });
  if (order.purchase.status !== 'paid' || !order.tier) return NextResponse.json({ error: 'Payment confirmation and selected package are required.' }, { status: 409 });
  if (order.continuationStatus === 'planned') return NextResponse.json({ order });
  if (order.continuationStatus === 'planning') return NextResponse.json({ error: 'Continuation is already being planned.' }, { status: 409 });
  const product = tierFor(order)!; const remainingCount = product.sceneCount - previewSceneCount();
  await writeOrder({ ...order, continuationStatus: 'planning' });
  try {
    const opening = order.scenes.map((scene) => `Opening scene ${scene.number}: narration “${scene.narration}”; visual plan “${scene.videoPrompt}”`).join('\n');
    const { object } = await generateObject({ model: 'openai/gpt-5.4', schema, prompt: `Continue this existing six-scene 60-second opening into one coherent ${product.targetRuntimeSeconds}-second premium stylized 3D CGI animated movie. Do not rewrite or repeat the opening. Write exactly ${remainingCount} new 10-second scenes that build naturally from it, retain the same character appearance, world, tone, and story promise, and end with a satisfying climax and conclusion. ${order.tier === 'five' ? 'Use the added runtime for meaningful new events, locations, interaction, buildup, and a fuller ending—not padding.' : 'Complete the story naturally within the selected runtime.'} Mood: ${order.moods.join(', ') || 'family adventure'}. Original customer direction: ${order.storyDirection || 'Create an original joyful story.'}. Each scene needs narration and a cinematic 3D CGI video prompt with action, continuity, expressive character movement, and camera language.\n\n${opening}` });
    if (object.scenes.length !== remainingCount) throw new Error('Continuation returned the wrong number of scenes.');
    const scenes: Scene[] = [...order.scenes, ...object.scenes.map((scene, index) => ({ number: previewSceneCount() + index + 1, narration: scene.narration, videoPrompt: scene.videoPrompt, status: 'ready' as const }))];
    const updated = { ...order, scenes, continuationStatus: 'planned' as const, status: 'ready-for-fulfillment' as const };
    await writeOrder(updated); return NextResponse.json({ order: updated });
  } catch (error) { await writeOrder({ ...order, continuationStatus: 'failed' }); return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to plan continuation.' }, { status: 502 }); }
}
