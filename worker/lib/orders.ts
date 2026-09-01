import { get, list, put } from '@vercel/blob';

export const PRODUCT_TIERS = {
  three: { id: 'three', label: '3-Minute Movie Package', priceCents: 4900, targetRuntimeSeconds: 180, sceneCount: 18, storybookPages: 18 },
  five: { id: 'five', label: '5-Minute Movie Package', priceCents: 7900, targetRuntimeSeconds: 300, sceneCount: 30, storybookPages: 30 },
} as const;
export type ProductTier = keyof typeof PRODUCT_TIERS;
export type GenerationIdentity = { key: string; operation?: unknown; webhookUrl?: string; attempts: number; startedAt?: string };
export type Scene = { number: number; narration: string; videoPrompt: string; artworkPathname?: string; videoPathname?: string; status: 'locked' | 'ready' | 'submitted' | 'completed' | 'failed'; generation: GenerationIdentity; error?: string };
export type Storybook = { pageCount: number; status: 'locked' | 'blocked-missing-scene-assets' | 'ready'; pathname?: string };
export type MovieOrder = {
  id: string; ownerId: string; title: string; storyDirection: string; moods: string[]; subjectPhotoPathnames: string[]; createdAt: string;
  tier?: ProductTier; targetRuntimeSeconds?: number; workflowStarted?: boolean; paymentWebhookUrl?: string; previewMoviePathname?: string;
  status: 'preview-ready' | 'preview-in-progress' | 'awaiting-payment' | 'ready-for-fulfillment' | 'fulfillment-in-progress' | 'complete' | 'failed';
  continuationStatus: 'not-selected' | 'awaiting-payment' | 'ready' | 'planning' | 'planned' | 'failed';
  scenes: Scene[];
  purchase: { status: 'not-started' | 'checkout-created' | 'paid'; checkoutSessionId?: string; paidAt?: string; resumeFromScene?: number };
  previewStorybook?: Storybook; finalStorybook?: Storybook; finalMoviePathname?: string;
};
const pathFor = (id: string) => `studio/orders/${id}`;
export function isProductTier(value: unknown): value is ProductTier { return typeof value === 'string' && value in PRODUCT_TIERS; }
export function previewSceneCount() { return 6; }
export function tierFor(order: Pick<MovieOrder, 'tier'>) { return order.tier ? PRODUCT_TIERS[order.tier] : undefined; }
export function hasRequiredDeliverables(order: MovieOrder) { return Boolean(order.finalMoviePathname && order.finalStorybook?.status === 'ready' && order.finalStorybook.pathname); }
export function sceneIdentity(orderId: string, number: number) { return `${orderId}:${number}`; }
export async function writeOrder(order: MovieOrder) { await put(`${pathFor(order.id)}/latest.json`, JSON.stringify(order), { access: 'private', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true }); }
// Serializes read-modify-write cycles per order id so concurrently running steps (e.g. parallel scene generation)
// cannot clobber each other's changes to the single latest.json blob. Each mutation re-reads the freshest state
// immediately before applying its patch and writing it back.
const orderWriteQueues = new Map<string, Promise<unknown>>();
export async function mutateOrder(id: string, mutate: (order: MovieOrder) => void | Promise<void>): Promise<MovieOrder | null> {
  const run = async (): Promise<MovieOrder | null> => {
    const order = await readOrder(id);
    if (!order) return null;
    await mutate(order);
    await writeOrder(order);
    return order;
  };
  const previous = orderWriteQueues.get(id) ?? Promise.resolve();
  const next = previous.then(run, run);
  orderWriteQueues.set(id, next.then(() => undefined, () => undefined));
  return next;
}
export async function readOrder(id: string): Promise<MovieOrder | null> { try { const { stream } = await get(`${pathFor(id)}/latest.json`, { access: 'private' }); return JSON.parse(await new Response(stream).text()) as MovieOrder; } catch { return null; } }
export async function listOrders(ownerId: string): Promise<MovieOrder[]> { const { blobs } = await list({ prefix: 'studio/orders/', limit: 100 }); const orders = await Promise.all(blobs.filter((blob) => blob.pathname.endsWith('/latest.json')).map(async (blob) => { try { const { stream } = await get(blob.pathname, { access: 'private' }); return JSON.parse(await new Response(stream).text()) as MovieOrder; } catch { return null; } })); return orders.filter((order): order is MovieOrder => Boolean(order?.ownerId === ownerId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)); }
export function canRenderScene(order: MovieOrder, scene: Scene) { return scene.number <= previewSceneCount() || order.purchase.status === 'paid'; }
export function orderProgress(order: MovieOrder) { const previewTotal = Math.min(previewSceneCount(), order.scenes.length); const previewDone = order.scenes.filter((scene) => scene.number <= previewTotal && scene.status === 'completed').length; const finalDone = order.scenes.filter((scene) => scene.status === 'completed').length; return { previewDone, previewTotal, finalDone, finalTotal: order.tier ? PRODUCT_TIERS[order.tier].sceneCount : previewTotal }; }
