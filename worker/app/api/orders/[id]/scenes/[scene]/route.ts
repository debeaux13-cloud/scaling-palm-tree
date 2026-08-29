import { experimental_getVideoStatus as getVideoStatus } from 'ai';
import { Buffer } from 'node:buffer';
import { get, put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { getOwner } from '../../../../../../lib/owner';
import { hasRequiredDeliverables, orderProgress, readOrder, writeOrder } from '../../../../../../lib/orders';

const model = 'bytedance/seedance-2.5';

export async function GET(request: Request, { params }: { params: Promise<{ id: string; scene: string }> }) {
  const { ownerId } = await getOwner();
  const { id, scene: sceneParam } = await params;
  const sceneNumber = Number(sceneParam);
  const order = await readOrder(id);
  if (!order || order.ownerId !== ownerId || !Number.isInteger(sceneNumber) || sceneNumber < 1 || sceneNumber > order.scenes.length) return NextResponse.json({ error: 'order or scene not found' }, { status: 404 });
  const scene = order.scenes[sceneNumber - 1];
  if (scene.status !== 'submitted' || !scene.operation) return NextResponse.json({ scene, progress: orderProgress(order) });
  try {
    const result = await getVideoStatus(model, { operation: scene.operation as never });
    if (result.status === 'completed' && result.videos[0]) {
      const video = result.videos[0];
      let content: Buffer;
      if (video.type === 'url') { const response = await fetch(video.url); if (!response.ok) throw new Error(`Video download failed with ${response.status}`); content = Buffer.from(await response.arrayBuffer()); }
      else if (video.type === 'base64') content = Buffer.from(video.data, 'base64');
      else content = Buffer.from(video.data);
      scene.videoPathname = `studio/orders/${id}/scenes/${sceneNumber}/movie.mp4`;
      await put(scene.videoPathname, content, { access: 'private', contentType: video.mediaType ?? 'video/mp4', addRandomSuffix: false, allowOverwrite: true });
      scene.status = 'completed'; delete scene.operation;
      const progress = orderProgress(order);
      if (progress.previewDone === 6 && order.purchase.status !== 'paid') order.status = 'awaiting-payment';
      if (progress.finalDone === order.scenes.length && hasRequiredDeliverables(order)) order.status = 'complete';
      await writeOrder(order);
      return NextResponse.json({ scene, progress });
    }
    if (result.status === 'error') { scene.status = 'failed'; scene.error = 'AI Gateway video generation failed'; delete scene.operation; order.status = 'failed'; await writeOrder(order); }
    return NextResponse.json({ scene, progress: orderProgress(order) });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to retrieve scene status' }, { status: 502 }); }
}
