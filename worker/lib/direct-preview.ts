import { experimental_generateVideo as generateVideo } from 'ai';
import { issueSignedToken, presignUrl, put } from '@vercel/blob';
import { assembleMovie } from './movie-assembly';
import { previewSceneCount, readOrder, writeOrder } from './orders';

const model = 'alibaba/wan-v2.6-r2v';

async function generateScene(orderId: string, sceneNumber: number) {
  const order = await readOrder(orderId); if (!order) throw new Error('Order not found');
  const scene = order.scenes[sceneNumber - 1]; if (!scene) throw new Error(`Scene ${sceneNumber} not found`);
  if (scene.status === 'completed' && scene.videoPathname) { console.info('[DirectPreview] scene reused', { orderId, sceneNumber }); return; }
  console.info('[DirectPreview] scene generation starting', { orderId, sceneNumber, attempt: scene.generation.attempts + 1 });
  scene.status = 'submitted'; scene.generation.attempts += 1; order.status = 'preview-in-progress'; await writeOrder(order);
  try {
    const inputReferences = await Promise.all(order.subjectPhotoPathnames.slice(0, 3).map(async (pathname) => { const validUntil = Date.now() + 15 * 60 * 1000; const token = await issueSignedToken({ pathname, operations: ['get'], validUntil }); return (await presignUrl(token, { pathname, operation: 'get', access: 'private', validUntil, useCache: false })).presignedUrl; }));
    const identityBrief = 'Use character1, character2, and character3 for the supplied customer-photo references in order. Preserve recognizable facial features or pet breed, coat color, markings, eyes, ears, body proportions, hair, clothing, and accessories across scenes. Create premium stylized 3D CGI cinematic animation with expressive character movement, soft feature-film lighting, dimensional environments, natural shadows, and active camera storytelling.';
    const result = await generateVideo({ model, prompt: `${identityBrief} ${scene.videoPrompt}`, inputReferences, aspectRatio: '16:9', resolution: '1280x720', duration: 10, generateAudio: true, providerOptions: { alibaba: { shotType: 'single' } }, poll: { intervalMs: 5000, timeoutMs: 600000 } });
    const video = result.videos[0]; if (!video) throw new Error(`Wan returned no video for scene ${sceneNumber}`);
    const pathname = `studio/orders/${orderId}/scenes/${sceneNumber}/movie.mp4`; const body = new Blob([video.uint8Array as Uint8Array<ArrayBuffer>], { type: video.mediaType ?? 'video/mp4' });
    await put(pathname, body, { access: 'private', contentType: video.mediaType ?? 'video/mp4', addRandomSuffix: false, allowOverwrite: true });
    scene.videoPathname = pathname; scene.status = 'completed'; delete scene.error; await writeOrder(order);
    console.info('[DirectPreview] scene generation completed', { orderId, sceneNumber, pathname });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const latest = await readOrder(orderId);
    if (latest?.scenes[sceneNumber - 1]) { latest.scenes[sceneNumber - 1].status = 'ready'; latest.scenes[sceneNumber - 1].error = message; await writeOrder(latest); }
    console.error('[DirectPreview] scene generation failed', { orderId, sceneNumber, error });
    throw error;
  }
}

export async function runDirectPreview(orderId: string) {
  for (let sceneNumber = 1; sceneNumber <= previewSceneCount(); sceneNumber += 1) await generateScene(orderId, sceneNumber);
  const order = await readOrder(orderId); if (!order) throw new Error('Order not found');
  const clips = order.scenes.slice(0, previewSceneCount()).map((scene) => ({ number: scene.number, pathname: scene.videoPathname!, narration: scene.narration }));
  if (clips.some((clip) => !clip.pathname)) throw new Error('Preview scenes are incomplete');
  console.info('[DirectPreview] assembly starting', { orderId });
  const assets = await assembleMovie(orderId, clips, 'preview');
  const latest = await readOrder(orderId); if (!latest) throw new Error('Order not found'); latest.previewMoviePathname = assets.moviePathname; latest.status = 'awaiting-payment'; await writeOrder(latest);
  console.info('[DirectPreview] assembly completed', { orderId, previewMoviePathname: assets.moviePathname });
}
