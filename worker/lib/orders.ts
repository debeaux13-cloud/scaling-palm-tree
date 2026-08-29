import { get, list, put } from '@vercel/blob';

export type Scene = {
  number: number;
  narration: string;
  videoPrompt: string;
  artworkPathname?: string;
  videoPathname?: string;
  status: 'locked' | 'ready' | 'submitted' | 'completed' | 'failed';
  operation?: unknown;
  error?: string;
};

export type MovieOrder = {
  id: string;
  title: string;
  createdAt: string;
  status: 'preview-ready' | 'preview-in-progress' | 'awaiting-payment' | 'ready-for-fulfillment' | 'fulfillment-in-progress' | 'complete' | 'failed';
  scenes: Scene[];
  purchase: { status: 'not-started' | 'checkout-created' | 'paid'; checkoutSessionId?: string; paidAt?: string; resumeFromScene?: number };
  previewStorybook?: { pageCount: 6; status: 'blocked-missing-scene-assets' | 'ready'; pathname?: string };
  finalStorybook?: { pageCount: 30; status: 'locked' | 'blocked-missing-scene-assets' | 'ready'; pathname?: string };
  finalMoviePathname?: string;
};

const pathFor = (id: string) => `studio/orders/${id}`;

export async function writeOrder(order: MovieOrder) {
  await put(`${pathFor(order.id)}/latest.json`, JSON.stringify(order), { access: 'private', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true });
}

export async function readOrder(id: string): Promise<MovieOrder | null> {
  try {
    const { stream } = await get(`${pathFor(id)}/latest.json`, { access: 'private' });
    return JSON.parse(await new Response(stream).text()) as MovieOrder;
  } catch { return null; }
}

export async function listOrders(): Promise<MovieOrder[]> {
  const { blobs } = await list({ prefix: 'studio/orders/', limit: 100 });
  const orders = await Promise.all(blobs.filter((blob) => blob.pathname.endsWith('/latest.json')).map(async (blob) => {
    try { const { stream } = await get(blob.pathname, { access: 'private' }); return JSON.parse(await new Response(stream).text()) as MovieOrder; }
    catch { return null; }
  }));
  return orders.filter((order): order is MovieOrder => Boolean(order)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function canRenderScene(order: MovieOrder, scene: Scene) {
  return scene.number <= 6 || order.purchase.status === 'paid';
}

export function orderProgress(order: MovieOrder) {
  const previewDone = order.scenes.filter((scene) => scene.number <= 6 && scene.status === 'completed').length;
  const finalDone = order.scenes.filter((scene) => scene.status === 'completed').length;
  return { previewDone, previewTotal: 6, finalDone, finalTotal: 30 };
}
