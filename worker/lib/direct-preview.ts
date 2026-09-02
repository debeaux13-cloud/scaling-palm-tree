import { experimental_generateVideo as generateVideo } from 'ai';
import { BlobNotFoundError, head, issueSignedToken, presignUrl, put } from '@vercel/blob';
import { assembleMovie } from './movie-assembly';
import { mutateOrder, previewSceneCount, readOrder } from './orders';

const model = 'alibaba/wan-v2.6-r2v';
const PREVIEW_CONCURRENCY = 2;
const FULFILLMENT_CONCURRENCY = 1;
const PAID_VIDEO_REQUEST_INTERVAL_MS = 60_000;
const MAX_PAID_RATE_LIMIT_RETRIES = 3;
const MAX_PREVIEW_SCENE_ATTEMPTS = 2;
const MAX_PAID_SCENE_ATTEMPTS = 1;
const STALE_PAID_SCENE_MS = 15 * 60_000;
function scenePathname(orderId: string, sceneNumber: number) { return `studio/orders/${orderId}/scenes/${sceneNumber}/movie.mp4`; }
async function storedSceneExists(orderId: string, sceneNumber: number) { try { await head(scenePathname(orderId, sceneNumber)); return true; } catch (error) { if (error instanceof BlobNotFoundError) return false; throw error; } }
async function recoverStoredScene(orderId: string, sceneNumber: number) { const pathname = scenePathname(orderId, sceneNumber); if (!(await storedSceneExists(orderId, sceneNumber))) return false; await mutateOrder(orderId, (fresh) => { const scene = fresh.scenes[sceneNumber - 1]; if (!scene) return; scene.videoPathname = pathname; scene.status = 'completed'; delete scene.error; }); console.info('[DirectMovie] stored MP4 reused; zero new generation', { orderId, sceneNumber, pathname }); return true; }

export async function reconcileStalePaidScenes(orderId: string) {
  const order = await readOrder(orderId); if (!order || order.purchase.status !== 'paid') return;
  for (const scene of order.scenes.filter((scene) => scene.number > previewSceneCount())) {
    if (await recoverStoredScene(orderId, scene.number)) continue;
    const startedAt = scene.generation.startedAt ? Date.parse(scene.generation.startedAt) : 0;
    if (scene.status === 'submitted' && (!startedAt || Date.now() - startedAt >= STALE_PAID_SCENE_MS)) {
      await mutateOrder(orderId, (fresh) => { const current = fresh.scenes[scene.number - 1]; if (current?.status === 'submitted' && !current.videoPathname) { current.status = 'failed'; delete current.generation.startedAt; current.error = 'Generation result was not persisted before the recovery window expired; manual review is required before retrying.'; } });
      console.error('[DirectMovie] stale paid scene blocked from automatic retry', { orderId, sceneNumber: scene.number });
    }
  }
}

async function assembleVerifiedStoredPreview(orderId: string) { const order = await readOrder(orderId); if (!order || order.previewMoviePathname) return; const checks = await Promise.all(Array.from({ length: previewSceneCount() }, async (_, index) => ({ number: index + 1, exists: await storedSceneExists(orderId, index + 1) }))); if (!checks.every((x) => x.exists)) return; const clips = checks.map(({ number }) => ({ number, pathname: scenePathname(orderId, number), narration: order.scenes[number - 1]?.narration ?? '' })); await mutateOrder(orderId, (fresh) => { checks.forEach(({ number }) => { const scene = fresh.scenes[number - 1]; if (!scene) return; scene.videoPathname = scenePathname(orderId, number); scene.status = 'completed'; delete scene.error; }); }); const assets = await assembleMovie(orderId, clips, 'preview'); await mutateOrder(orderId, (fresh) => { fresh.previewMoviePathname = assets.moviePathname; fresh.status = 'awaiting-payment'; }); }

async function generateScene(orderId: string, sceneNumber: number, fulfillment = false) {
  const order = await readOrder(orderId); if (!order) throw new Error('Order not found'); const scene = order.scenes[sceneNumber - 1]; if (!scene) throw new Error(`Scene ${sceneNumber} not found`);
  if (fulfillment && order.purchase.status !== 'paid') throw new Error(`blocked unpaid fulfillment scene ${sceneNumber}`);
  if (scene.status === 'completed' && scene.videoPathname) return;
  if (await recoverStoredScene(orderId, sceneNumber)) return;
  if (scene.status === 'submitted') return;
  if (fulfillment && scene.status === 'failed') throw new Error(`Scene ${sceneNumber} requires manual review before another paid generation attempt.`);
  if (fulfillment && scene.generation.attempts >= MAX_PAID_SCENE_ATTEMPTS) throw new Error(`Scene ${sceneNumber} reached the paid generation limit; manual review is required.`);
  // Preview stays capped. Paid scenes are capped at one provider request; an expired request
  // is held for manual review rather than automatically charging for another generation.
  if (!fulfillment && scene.generation.attempts >= MAX_PREVIEW_SCENE_ATTEMPTS) throw new Error(`Scene ${sceneNumber} reached ${MAX_PREVIEW_SCENE_ATTEMPTS} preview attempts; manual review required.`);
  let claimed = false;
  await mutateOrder(orderId, (fresh) => { const current = fresh.scenes[sceneNumber - 1]; if (!current) return; if (fulfillment && fresh.purchase.status !== 'paid') return; if ((current.status === 'completed' && current.videoPathname) || current.status === 'submitted' || (fulfillment && (current.status === 'failed' || current.generation.attempts >= MAX_PAID_SCENE_ATTEMPTS)) || (!fulfillment && current.generation.attempts >= MAX_PREVIEW_SCENE_ATTEMPTS)) return; current.status = 'submitted'; current.generation.attempts += 1; current.generation.startedAt = new Date().toISOString(); delete current.error; fresh.status = fulfillment ? 'fulfillment-in-progress' : 'preview-in-progress'; claimed = true; });
  if (!claimed) return;
  console.info('[DirectMovie] generation authorized for scene', { orderId, sceneNumber, fulfillment, attempt: scene.generation.attempts + 1 });
  try { const inputReferences = await Promise.all(order.subjectPhotoPathnames.slice(0, 3).map(async (pathname) => { const validUntil = Date.now() + 15 * 60 * 1000; const token = await issueSignedToken({ pathname, operations: ['get'], validUntil }); return (await presignUrl(token, { pathname, operation: 'get', access: 'private', validUntil, useCache: false })).presignedUrl; })); const identityBrief = 'Use character1, character2, and character3 for the supplied customer-photo references in order. Preserve recognizable facial features or pet breed, coat color, markings, eyes, ears, body proportions, hair, clothing, and accessories across scenes. Create premium stylized 3D CGI cinematic animation with expressive character movement, soft feature-film lighting, dimensional environments, natural shadows, and active camera storytelling. All spoken dialogue and narration must be natural English only, using one consistent neutral American English voice/accent throughout the movie. Do not switch languages or accents.'; const result = await generateVideo({ model, prompt: `${identityBrief} ${scene.videoPrompt}`, inputReferences, aspectRatio: '16:9', resolution: '1280x720', duration: 10, generateAudio: true, providerOptions: { alibaba: { shotType: 'single' } }, poll: { intervalMs: 5000, timeoutMs: 600000 } }); const video = result.videos[0]; if (!video) throw new Error(`Wan returned no video for scene ${sceneNumber}`); const pathname = scenePathname(orderId, sceneNumber); const body = new Blob([video.uint8Array as Uint8Array<ArrayBuffer>], { type: video.mediaType ?? 'video/mp4' }); await put(pathname, body, { access: 'private', contentType: video.mediaType ?? 'video/mp4', addRandomSuffix: false, allowOverwrite: true }); await mutateOrder(orderId, (fresh) => { const current = fresh.scenes[sceneNumber - 1]; if (!current) return; current.videoPathname = pathname; current.status = 'completed'; delete current.generation.startedAt; delete current.error; }); }
  catch (error) { const message = error instanceof Error ? error.message : String(error); const rateLimited = fulfillment && message.includes('429'); await mutateOrder(orderId, (fresh) => { const current = fresh.scenes[sceneNumber - 1]; if (!current) return; current.status = 'ready'; if (rateLimited && current.generation.attempts > 0) current.generation.attempts -= 1; delete current.generation.startedAt; current.error = message; }); console.error('[DirectMovie] scene generation failed', { orderId, sceneNumber, error }); throw error; }
}

export async function runDirectPreview(orderId: string) { const sceneNumbers = Array.from({ length: previewSceneCount() }, (_, index) => index + 1); for (let index = 0; index < sceneNumbers.length; index += PREVIEW_CONCURRENCY) await Promise.all(sceneNumbers.slice(index, index + PREVIEW_CONCURRENCY).map((sceneNumber) => generateScene(orderId, sceneNumber))); await assembleVerifiedStoredPreview(orderId); }

export async function runDirectFulfillment(orderId: string) {
  const initial = await readOrder(orderId); if (!initial) throw new Error('Order not found');
  if (initial.purchase.status !== 'paid') throw new Error('blocked full movie generation because payment is not confirmed');
  if (initial.finalMoviePathname || initial.status === 'complete') return;
  const sceneNumbers = initial.scenes.filter((scene) => scene.number > 6 && !(scene.status === 'completed' && scene.videoPathname)).map((scene) => scene.number);
  console.info('[DirectMovie] paid fulfillment', { orderId, missingPaidScenes: sceneNumbers.length, sceneNumbers });
  for (let index = 0; index < sceneNumbers.length; index += FULFILLMENT_CONCURRENCY) {
    let retries = 0;
    while (true) {
      try {
        await generateScene(orderId, sceneNumbers[index], true);
        break;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!message.includes('429') || retries >= MAX_PAID_RATE_LIMIT_RETRIES) throw error;
        retries += 1;
        console.warn('[DirectMovie] paid scene rate-limited; waiting before retry', { orderId, sceneNumber: sceneNumbers[index], retries });
        await new Promise((resolve) => setTimeout(resolve, PAID_VIDEO_REQUEST_INTERVAL_MS));
      }
    }
    if (index + FULFILLMENT_CONCURRENCY < sceneNumbers.length) {
      await new Promise((resolve) => setTimeout(resolve, PAID_VIDEO_REQUEST_INTERVAL_MS));
    }
  }
  const order = await readOrder(orderId); if (!order) throw new Error('Order not found');
  const clips = order.scenes.slice(0, 18).map((scene) => ({ number: scene.number, pathname: scene.videoPathname!, narration: scene.narration }));
  if (clips.some((clip) => !clip.pathname)) throw new Error('Cannot assemble final movie before all 18 scenes are complete');
  const assets = await assembleMovie(orderId, clips, 'final');
  await mutateOrder(orderId, (fresh) => { fresh.finalMoviePathname = assets.moviePathname; fresh.finalStorybook = { pageCount: 18, status: 'ready', pathname: assets.storybookPathname }; fresh.status = 'complete'; });
}
