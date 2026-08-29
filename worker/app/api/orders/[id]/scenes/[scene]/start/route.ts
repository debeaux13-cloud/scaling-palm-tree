import { experimental_startVideo as startVideo } from 'ai';
import { NextResponse } from 'next/server';
import { issueSignedToken, presignUrl } from '@vercel/blob';
import { getOwner } from '../../../../../../../lib/owner';
import { canRenderScene, readOrder, writeOrder } from '../../../../../../../lib/orders';

const model = 'bytedance/seedance-2.5';

async function referenceImage(pathname: string) {
  const token = await issueSignedToken({ pathname, operations: ['get'] });
  const { presignedUrl } = await presignUrl(token, { pathname, operation: 'get', access: 'private', validUntil: Date.now() + 15 * 60 * 1000 });
  return { data: presignedUrl, mediaType: 'image/jpeg' };
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string; scene: string }> }) {
  const { ownerId } = await getOwner();
  const { id, scene: sceneParam } = await params;
  const sceneNumber = Number(sceneParam);
  const order = await readOrder(id);
  if (!order || order.ownerId !== ownerId || !Number.isInteger(sceneNumber) || sceneNumber < 1 || sceneNumber > order.scenes.length) return NextResponse.json({ error: 'order or scene not found' }, { status: 404 });
  const scene = order.scenes[sceneNumber - 1];
  if (!canRenderScene(order, scene)) return NextResponse.json({ error: 'Scenes after the preview are locked until verified payment.' }, { status: 402 });
  if (scene.status === 'submitted' || scene.status === 'completed') return NextResponse.json({ error: 'scene is already in progress or complete' }, { status: 409 });
  try {
    const references = await Promise.all(order.subjectPhotoPathnames.slice(0, 3).map(referenceImage));
    const identityBrief = 'Use [Image 1] and the supplied customer photos as the exact character identity reference. Preserve recognizable facial features or pet breed, coat color, markings, eyes, ears, body proportions, hair, clothing, and accessories across scenes. Create premium stylized 3D CGI cinematic animation with expressive character movement, soft feature-film lighting, dimensional environments, natural shadows, and active camera storytelling.';
    const { operation } = await startVideo({ model, prompt: `${identityBrief} ${scene.videoPrompt}`, inputReferences: references, aspectRatio: '16:9', resolution: '1920x1080', duration: 10, generateAudio: true });
    scene.status = 'submitted'; scene.operation = operation; order.status = sceneNumber <= 6 ? 'preview-in-progress' : 'fulfillment-in-progress';
    await writeOrder(order);
    return NextResponse.json({ orderId: order.id, scene: sceneNumber, status: scene.status }, { status: 202 });
  } catch (error) {
    scene.status = 'failed'; scene.error = error instanceof Error ? error.message : 'Video generation request failed'; order.status = 'failed';
    await writeOrder(order);
    return NextResponse.json({ error: scene.error }, { status: 502 });
  }
}
