import { put } from '@vercel/blob';
import type { MovieOrder } from './orders';

export type AssemblyManifest = {
  kind: 'preview' | 'final';
  sceneCount: number;
  durationSeconds: number;
  clipPathnames: string[];
  pages: Array<{ artworkPathname: string; narration: string }>;
};

export function buildAssemblyManifest(order: MovieOrder, kind: 'preview' | 'final') {
  const sceneCount = kind === 'preview' ? 6 : 30;
  const scenes = order.scenes.slice(0, sceneCount);
  const missingScenes = scenes.filter((scene) => !scene.videoPathname || !scene.artworkPathname).map((scene) => scene.number);
  if (missingScenes.length) return { ready: false as const, missingScenes };
  return { ready: true as const, manifest: { kind, sceneCount, durationSeconds: sceneCount * 10, clipPathnames: scenes.map((scene) => scene.videoPathname as string), pages: scenes.map((scene) => ({ artworkPathname: scene.artworkPathname as string, narration: scene.narration })) } satisfies AssemblyManifest };
}

export async function saveAssemblyManifest(order: MovieOrder, kind: 'preview' | 'final') {
  const result = buildAssemblyManifest(order, kind);
  if (!result.ready) return result;
  await put(`studio/orders/${order.id}/assembly/${kind}.json`, JSON.stringify(result.manifest), { access: 'private', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true });
  return result;
}
