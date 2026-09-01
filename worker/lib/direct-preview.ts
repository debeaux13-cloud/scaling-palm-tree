import { experimental_generateVideo as generateVideo } from 'ai';
import { BlobNotFoundError, head, issueSignedToken, presignUrl, put } from '@vercel/blob';
import { assembleMovie } from './movie-assembly';
import { mutateOrder, previewSceneCount, readOrder } from './orders';

const model = 'alibaba/wan-v2.6-r2v';
const PREVIEW_CONCURRENCY = 2;
const FULFILLMENT_CONCURRENCY = 2;
// HARD COST CAP: one automatic paid AI generation authorization per scene.
// Retries that can spend money must never be caused by polling, refresh, webhook replay,
// timeout recovery, or deployment recovery. A failed paid scene stops for manual review.
const MAX_AUTOMATIC_SCENE_ATTEMPTS = 1;
function scenePathname(orderId: string, sceneNumber: number) { return `studio/orders/${orderId}/scenes/${sceneNumber}/movie.mp4`; }
async function storedSceneExists(orderId: string, sceneNumber: number) { try { await head(scenePathname(orderId, sceneNumber)); return true; } catch (error) { if (error instanceof BlobNotFoundError) return false; throw error; } }
async function recoverStoredScene(orderId: string, sceneNumber: number) { const pathname = scenePathname(orderId, sceneNumber); if (!(await storedSceneExists(orderId, sceneNumber))) return false; await mutateOrder(orderId, (fresh) => { const scene = fresh.scenes[sceneNumber - 1]; if (!scene) return; scene.videoPathname = pathname; scene.status = 'completed'; delete scene.error; }); console.info('[DirectMovie] CREDIT-GUARD stored MP4 reused; zero new generation', { orderId, sceneNumber, pathname }); return true; }

export async function reconcileStalePaidScenes(orderId: string) {
  const order = await readOrder(orderId); if (!order || order.purchase.status !== 'paid') return;
  for (const scene of order.scenes.filter((scene) => scene.number > previewSceneCount())) {
    if (await recoverStoredScene(orderId, scene.number)) continue;
    // IMPORTANT: never reset a previously-attempted paid scene to ready. That old behavior
    // allowed recovery polling to buy the same scene again. Preserve it as failed/manual review.
    if (scene.status === 'submitted' && !scene.videoPathname) {
      await mutateOrder(orderId, (fresh) => { const current = fresh.scenes[scene.number - 1]; if (current?.status === 'submitted' && !current.videoPathname) { current.status = 'failed'; current.error = 'Paid scene generation did not persist an MP4. Automatic paid retry blocked by credit cap.'; } });
      console.warn('[DirectMovie] CREDIT-CAP stale paid scene blocked from automatic regeneration', { orderId, sceneNumber: scene.number, attempts: scene.generation.attempts });
    }
  }
}

async function assembleVerifiedStoredPreview(orderId: string) {
  const order = await readOrder(orderId); if (!order || order.previewMoviePathname) return;
  const checks = await Promise.all(Array.from({ length: previewSceneCount() }, async (_, index) => ({ number: index + 1, exists: await storedSceneExists(orderId, index + 1) })));
  if (!checks.every((x) => x.exists)) return;
  const clips = checks.map(({ number }) => ({ number, pathname: scenePathname(orderId, number), narration: order.scenes[number - 1]?.narration ?? '' }));
  await mutateOrder(orderId, (fresh) => { checks.forEach(({ number }) => { const scene = fresh.scenes[number - 1]; if (!scene) return; scene.videoPathname = scenePathname(orderId, number); scene.status = 'completed'; delete scene.error; }); });
  const assets = await assembleMovie(orderId, clips, 'preview');
  await mutateOrder(orderId, (fresh) => { fresh.previewMoviePathname = assets.moviePathname; fresh.status = 'awaiting-payment'; });
}

async function generateScene(orderId: string, sceneNumber: number, fulfillment = false) {
  const order = await readOrder(orderId); if (!order) throw new Error('Order not found'); const scene = order.scenes[sceneNumber - 1]; if (!scene) throw new Error(`Scene ${sceneNumber} not found`);
  if (fulfillment && order.purchase.status !== 'paid') throw new Error(`CREDIT-GUARD blocked unpaid fulfillment scene ${sceneNumber}`);
  if (scene.status === 'completed' && scene.videoPathname) { console.info('[DirectMovie] CREDIT-GUARD completed scene reused', { orderId, sceneNumber }); return; }
  if (await recoverStoredScene(orderId, sceneNumber)) return;
  if (scene.status === 'submitted') { console.info('[DirectMovie] CREDIT-GUARD duplicate in-flight generation blocked', { orderId, sceneNumber }); return; }
  if (scene.generation.attempts >= MAX_AUTOMATIC_SCENE_ATTEMPTS) throw new Error(`CREDIT-CAP scene ${sceneNumber} already consumed its automatic generation authorization; manual review required before another paid AI call.`);
  let claimed = false;
  await mutateOrder(orderId, (fresh) => {
    const current = fresh.scenes[sceneNumber - 1]; if (!current) return;
    if (fulfillment && fresh.purchase.status !== 'paid') return;
    if ((current.status === 'completed' && current.videoPathname) || current.status === 'submitted' || current.generation.attempts >= MAX_AUTOMATIC_SCENE_ATTEMPTS) return;
    current.status = 'submitted'; current.generation.attempts += 1; delete current.error; fresh.status = fulfillment ? 'fulfillment-in-progress' : 'preview-in-progress'; claimed = true;
  });
  if (!claimed) { console.info('[DirectMovie] CREDIT-GUARD scene claim rejected; no AI call made', { orderId, sceneNumber }); return; }
  console.info('[DirectMovie] CREDIT-SPEND authorized once for scene', { orderId, sceneNumber, fulfillment, automaticAttempt: 1, automaticAttemptLimit: MAX_AUTOMATIC_SCENE_ATTEMPTS });
  try {
    const inputReferences = await Promise.all(order.subjectPhotoPathnames.slice(0, 3).map(async (pathname) => { const validUntil = Date.now() + 15 * 60 * 1000; const token = await issueSignedToken({ pathname, operations: ['get'], validUntil }); return (await presignUrl(token, { pathname, operation: 'get', access: 'private', validUntil, useCache: false })).presignedUrl; }));
    const identityBrief = 'Use character1, character2, and character3 for the supplied customer-photo references in order. Preserve recognizable facial features or pet breed, coat color, markings, eyes, ears, body proportions, hair, clothing, and accessories across scenes. Create premium stylized 3D CGI cinematic animation with expressive character movement, soft feature-film lighting, dimensional environments, natural shadows, and active camera storytelling. All spoken dialogue and narration must be natural English only, using one consistent neutral American English voice/accent throughout the movie. Do not switch languages or accents.';
    const result = await generateVideo({ model, prompt: `${identityBrief} ${scene.videoPrompt}`, inputReferences, aspectRatio: '16:9', resolution: '1280x720', duration: 10, generateAudio: true, providerOptions: { alibaba: { shotType: 'single' } }, poll: { intervalMs: 5000, timeoutMs: 600000 } }); const video = result.videos[0]; if (!video) throw new Error(`Wan returned no video for scene ${sceneNumber}`);
    const pathname = scenePathname(orderId, sceneNumber); const body = new Blob([video.uint8Array as Uint8Array<ArrayBuffer>], { type: video.mediaType ?? 'video/mp4' }); await put(pathname, body, { access: 'private', contentType: video.mediaType ?? 'video/mp4', addRandomSuffix: false, allowOverwrite: true }); await mutateOrder(orderId, (fresh) => { const current = fresh.scenes[sceneNumber - 1]; if (!current) return; current.videoPathname = pathname; current.status = 'completed'; delete current.error; });
  } catch (error) { const message = error instanceof Error ? error.message : String(error); await mutateOrder(orderId, (fresh) => { const current = fresh.scenes[sceneNumber - 1]; if (!current) return; current.status = 'failed'; current.error = `${message} Automatic paid retry is blocked by the credit cap.`; }); console.error('[DirectMovie] scene generation failed; CREDIT-CAP blocks automatic retry', { orderId, sceneNumber, error }); throw error; }
}

export async function runDirectPreview(orderId: string) {
  const sceneNumbers = Array.from({ length: previewSceneCount() }, (_, index) => index + 1);
  for (let index = 0; index < sceneNumbers.length; index += PREVIEW_CONCURRENCY) await Promise.all(sceneNumbers.slice(index, index + PREVIEW_CONCURRENCY).map((sceneNumber) => generateScene(orderId, sceneNumber)));
  await assembleVerifiedStoredPreview(orderId);
}

export async function assembleDirectFinalIfComplete(orderId: string) {
  const initial = await readOrder(orderId); if (!initial) throw new Error('Order not found');
  if (initial.purchase.status !== 'paid') throw new Error('Final assembly requires confirmed payment');
  if (initial.finalMoviePathname || initial.status === 'complete') return true;
  // Storage is authoritative for assembly. Recover every existing scene without making any AI call.
  for (let sceneNumber = 1; sceneNumber <= 18; sceneNumber += 1) await recoverStoredScene(orderId, sceneNumber);
  const order = await readOrder(orderId); if (!order) throw new Error('Order not found');
  const clips = order.scenes.slice(0, 18).map((scene) => ({ number: scene.number, pathname: scene.videoPathname!, narration: scene.narration }));
  if (clips.some((clip) => !clip.pathname)) { console.warn('[DirectMovie] ASSEMBLY-ONLY blocked: not all 18 stored MP4s exist', { orderId, missingScenes: clips.filter((clip) => !clip.pathname).map((clip) => clip.number) }); return false; }
  console.info('[DirectMovie] ASSEMBLY-ONLY starting final movie; AI generation disabled', { orderId, sceneCount: clips.length });
  const assets = await assembleMovie(orderId, clips, 'final');
  await mutateOrder(orderId, (fresh) => { fresh.finalMoviePathname = assets.moviePathname; fresh.finalStorybook = { pageCount: 18, status: 'ready', pathname: assets.storybookPathname }; fresh.status = 'complete'; fresh.continuationStatus = 'ready'; });
  console.info('[DirectMovie] ASSEMBLY-ONLY final movie complete', { orderId, moviePathname: assets.moviePathname, storybookPathname: assets.storybookPathname });
  return true;
}

export async function runDirectFulfillment(orderId: string) {
  const initial = await readOrder(orderId); if (!initial) throw new Error('Order not found');
  if (initial.purchase.status !== 'paid') throw new Error('CREDIT-GUARD blocked full movie generation because payment is not confirmed');
  if (initial.finalMoviePathname || initial.status === 'complete') { console.info('[DirectMovie] CREDIT-GUARD final movie already exists; fulfillment skipped', { orderId }); return; }
  // First attempt assembly with storage only. If all 18 exist, generation is NEVER entered.
  if (await assembleDirectFinalIfComplete(orderId)) return;
  const refreshed = await readOrder(orderId); if (!refreshed) throw new Error('Order not found');
  const sceneNumbers = refreshed.scenes.filter((scene) => scene.number > 6 && !(scene.status === 'completed' && scene.videoPathname) && scene.generation.attempts < MAX_AUTOMATIC_SCENE_ATTEMPTS).map((scene) => scene.number);
  console.info('[DirectMovie] CREDIT-CAP paid fulfillment budget', { orderId, automaticGenerationLimitPerScene: MAX_AUTOMATIC_SCENE_ATTEMPTS, authorizedMissingScenes: sceneNumbers.length, sceneNumbers });
  for (let index = 0; index < sceneNumbers.length; index += FULFILLMENT_CONCURRENCY) await Promise.all(sceneNumbers.slice(index, index + FULFILLMENT_CONCURRENCY).map((sceneNumber) => generateScene(orderId, sceneNumber, true)));
  if (!(await assembleDirectFinalIfComplete(orderId))) throw new Error('Final assembly blocked because one or more scenes require manual review; automatic paid retries are disabled.');
}
