import { experimental_getVideoStatus as getVideoStatus, experimental_startVideo as startVideo, generateObject } from 'ai';
import { issueSignedToken, presignUrl, put } from '@vercel/blob';
import { z } from 'zod';
import { createWebhook } from 'workflow';
import { assembleMovie } from './movie-assembly';
import { mutateOrder, previewSceneCount, readOrder, tierFor, writeOrder } from './orders';

const model = 'klingai/kling-v3.0-i2v';
const CONCURRENCY = 2;

async function startScene(orderId: string, sceneNumber: number, webhookUrl: string) {
  'use step';
  const order = await readOrder(orderId); if (!order) throw new Error('Order not found');
  const scene = order.scenes[sceneNumber - 1];
  if (!scene || scene.status === 'completed' || scene.generation.operation) return scene?.generation.operation;
  const identityBrief = 'Use the supplied signed customer-photo URLs as exact character identity references. Preserve recognizable facial features or pet breed, coat color, markings, eyes, ears, body proportions, hair, clothing, and accessories across scenes. Create premium stylized 3D CGI cinematic animation with expressive character movement, soft feature-film lighting, dimensional environments, natural shadows, and active camera storytelling.';
  const inputReferences = await Promise.all(order.subjectPhotoPathnames.slice(0, 3).map(async (pathname) => { const validUntil = Date.now() + 15 * 60 * 1000; const token = await issueSignedToken({ pathname, operations: ['get'], validUntil }); return (await presignUrl(token, { pathname, operation: 'get', access: 'private', validUntil, useCache: false })).presignedUrl; }));
  const { operation } = await startVideo({ model, prompt: `${identityBrief} ${scene.videoPrompt}`, inputReferences, aspectRatio: '16:9', resolution: '1280x720', duration: 10, generateAudio: true, webhookUrl });
  await mutateOrder(orderId, (fresh) => {
    const current = fresh.scenes[sceneNumber - 1]; if (!current) return;
    current.status = 'submitted'; current.generation = { ...current.generation, operation, webhookUrl, attempts: current.generation.attempts + 1 };
    fresh.status = sceneNumber <= previewSceneCount() ? 'preview-in-progress' : 'fulfillment-in-progress';
  });
  return operation;
}
async function persistSceneResult(orderId: string, sceneNumber: number, operation: unknown) {
  'use step';
  const order = await readOrder(orderId); if (!order) throw new Error('Order not found'); const scene = order.scenes[sceneNumber - 1];
  if (scene.status === 'completed') return;
  const result = await getVideoStatus(model, { operation: operation as never });
  if (result.status !== 'completed') {
    const details = JSON.stringify(result);
    console.error('[Kling] video operation not completed', { orderId, sceneNumber, details });
    throw new Error(`AI Gateway video generation failed: ${details}`);
  }
  const video = result.videos[0];
  if (!video || video.type !== 'url') {
    const details = JSON.stringify(result);
    console.error('[Kling] completed operation returned no usable URL video', { orderId, sceneNumber, details });
    throw new Error(`AI Gateway video generation failed: ${details}`);
  }
  const videoPathname = `studio/orders/${orderId}/scenes/${sceneNumber}/movie.mp4`;
  const response = await fetch(video.url); if (!response.ok || !response.body) throw new Error(`Video download failed with ${response.status}`);
  await put(videoPathname, response.body, { access: 'private', contentType: video.mediaType ?? 'video/mp4', addRandomSuffix: false, allowOverwrite: true });
  await mutateOrder(orderId, (fresh) => {
    const current = fresh.scenes[sceneNumber - 1]; if (!current) return;
    current.videoPathname = videoPathname; current.status = 'completed'; current.generation.operation = operation; delete current.error;
  });
}
async function assemble(orderId: string, kind: 'preview' | 'final') {
  'use step';
  const order = await readOrder(orderId); if (!order) throw new Error('Order not found'); const count = kind === 'preview' ? 6 : tierFor(order)?.sceneCount;
  if (!count) throw new Error('Paid package is not selected'); const clips = order.scenes.slice(0, count).map((scene) => ({ number: scene.number, pathname: scene.videoPathname!, narration: scene.narration }));
  if (clips.some((clip) => !clip.pathname)) throw new Error('Cannot assemble before all scenes are complete');
  const assets = await assembleMovie(orderId, clips, kind);
  const latest = await readOrder(orderId); if (!latest) throw new Error('Order not found');
  if (kind === 'preview') { latest.previewMoviePathname = assets.moviePathname; latest.status = 'awaiting-payment'; }
  else { latest.finalMoviePathname = assets.moviePathname; latest.finalStorybook = { pageCount: 18, status: 'ready', pathname: assets.storybookPathname }; latest.status = 'complete'; }
  await writeOrder(latest);
}
async function generateBatch(orderId: string, sceneNumbers: number[]) {
  for (let i = 0; i < sceneNumbers.length; i += CONCURRENCY) await Promise.all(sceneNumbers.slice(i, i + CONCURRENCY).map(async (number) => {
    using webhook = createWebhook(); const operation = await startScene(orderId, number, webhook.url); if (!operation) return; await webhook; await persistSceneResult(orderId, number, operation);
  }));
}
export async function movieWorkflow(orderId: string) {
  'use workflow';
  await generateBatch(orderId, [1, 2, 3, 4, 5, 6]); await assemble(orderId, 'preview');
  using payment = createWebhook();
  await setPaymentWebhook(orderId, payment.url); await payment;
  const order = await planContinuation(orderId); await generateBatch(orderId, order.scenes.filter((scene) => scene.number > 6).map((scene) => scene.number)); await assemble(orderId, 'final');
}
async function setPaymentWebhook(orderId: string, url: string) { 'use step'; const order = await readOrder(orderId); if (!order) throw new Error('Order not found'); await writeOrder({ ...order, paymentWebhookUrl: url }); }
async function planContinuation(orderId: string) { 'use step'; const order = await readOrder(orderId); if (!order || !order.tier) throw new Error('Paid package is not selected'); if (order.tier !== 'three') throw new Error('The 5-minute product is not enabled in this workflow'); if (order.scenes.length === 18) return order; const schema = z.object({ scenes: z.array(z.object({ narration: z.string().min(1), videoPrompt: z.string().min(1) })).length(12) }); const opening = order.scenes.map((scene) => `Opening ${scene.number}: ${scene.narration}; ${scene.videoPrompt}`).join('\n'); const { object } = await generateObject({ model: 'openai/gpt-5.4', schema, prompt: `Continue this exact six-scene opening into a connected 18-scene, 180-second movie. Return exactly 12 new ten-second scenes without rewriting the opening. Preserve character, world, and narration continuity.\n${opening}` }); const scenes = [...order.scenes, ...object.scenes.map((scene, index) => ({ number: index + 7, narration: scene.narration, videoPrompt: scene.videoPrompt, status: 'ready' as const, generation: { key: `${orderId}:${index + 7}`, attempts: 0 } }))]; const updated = { ...order, scenes, continuationStatus: 'planned' as const, status: 'ready-for-fulfillment' as const }; await writeOrder(updated); return updated; }
