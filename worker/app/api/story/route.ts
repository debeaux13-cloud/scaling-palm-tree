import { generateObject } from 'ai';
import { z } from 'zod';
import { NextResponse } from 'next/server';
import { getOwner } from '../../../lib/owner';
import { PRODUCT_TIERS, isProductTier, previewSceneCount } from '../../../lib/orders';

const storySchema = z.object({ title: z.string().min(1), scenes: z.array(z.object({ narration: z.string().min(1), videoPrompt: z.string().min(1) })) });
export async function POST(request: Request) {
  const { ownerId } = await getOwner();
  const { premise, subjectPhotoPathnames = [], tier, moods = [] } = await request.json();
  if (!isProductTier(tier) || !Array.isArray(subjectPhotoPathnames) || !Array.isArray(moods)) return NextResponse.json({ error: 'A product tier, photo references, and moods are required.' }, { status: 400 });
  if (typeof premise !== 'string' || !premise.trim()) return NextResponse.json({ error: 'Enter a story idea or choose “Create a Story for Me.”' }, { status: 400 });
  if (subjectPhotoPathnames.some((pathname: unknown) => typeof pathname !== 'string' || !pathname.startsWith(`studio/owners/${ownerId}/references/`))) return NextResponse.json({ error: 'Photo references must belong to this preview.' }, { status: 403 });
  const product = PRODUCT_TIERS[tier];
  const { object } = await generateObject({ model: 'openai/gpt-5.4', schema: storySchema, prompt: `Write one cohesive premium stylized 3D CGI animated movie for a ${product.targetRuntimeSeconds}-second runtime. Return exactly ${product.sceneCount} connected scenes of about 10 seconds each. Scenes 1-${previewSceneCount()} are the actual 60-second preview; all later scenes must continue this same preplanned story through a satisfying climax and ending. The selected mood is: ${moods.length ? moods.join(', ') : 'family adventure'}. Customer direction: ${premise}. Preserve uploaded subject identity and distinctive characteristics in every scene. Make the ${tier === 'five' ? 'five-minute story meaningfully more developed from its opening, with additional story beats, interaction, locations, and buildup—not padding' : 'three-minute story complete within its selected runtime'}. Each video prompt must specify premium stylized 3D CGI, expressive character action, continuity, cinematic camera language, and living environments. Narration must leave room for visual storytelling. Do not put scene labels in narration.` });
  if (object.scenes.length !== product.sceneCount) return NextResponse.json({ error: 'Story generation returned the wrong runtime plan. Please try again.' }, { status: 502 });
  return NextResponse.json({ story: object, product });
}
