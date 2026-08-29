import { experimental_startVideo as startVideo } from 'ai';
import { NextResponse } from 'next/server';
import { get } from '@vercel/blob';
import { getOwner } from '../../../../../../../lib/owner';
import { canRenderScene, readOrder, writeOrder } from '../../../../../../../lib/orders';

const model = 'bytedance/seedance-v1.5-pro';

async function referenceImage(pathname: string) {
  const { stream, blob } = await get(pathname, { access: 'private' });
  return { data: new Uint8Array(await new Response(stream).arrayBuffer()), mediaType: blob.contentType || 'image/jpeg' };
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
  const references = await Promise.all(order.subjectPhotoPathnames.slice(0, 2).map(referenceImage));
  const characterBrief = 'Use the provided customer reference image(s) as the identity anchor. Preserve the subject’s recognizable face, hair or fur, coloring, markings, proportions, age range, and distinctive traits. Render premium stylized 3D CGI cinematic animation: dimensional character design, expressive acting, soft feature-film lighting, natural shadows, detailed environments, and active cinematic camera movement. Do not create photorealistic live action, flat 2D art, a slideshow, or a motion comic.';
  const { operation } = await startVideo({ model, prompt: references.length ? { image: references[0].data, text: `${characterBrief} ${scene.videoPrompt}` } : `${characterBrief} ${scene.videoPrompt}`, inputReferences: references.slice(1), aspectRatio: '16:9', resolution: '1280x720', duration: 10, generateAudio: true });
  scene.status = 'submitted'; scene.operation = operation; order.status = sceneNumber <= 6 ? 'preview-in-progress' : 'fulfillment-in-progress';
  await writeOrder(order);
  return NextResponse.json({ orderId: order.id, scene: sceneNumber, status: scene.status }, { status: 202 });
}
