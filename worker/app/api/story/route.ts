import { generateObject } from 'ai';
import { z } from 'zod';
import { NextResponse } from 'next/server';
import { getOwner } from '../../../lib/owner';
import { previewSceneCount } from '../../../lib/orders';
const storySchema = z.object({ title: z.string().min(1), scenes: z.array(z.object({ narration: z.string().min(1), videoPrompt: z.string().min(1) })).length(6) });
export async function POST(request: Request) {
  const { ownerId } = await getOwner(); const { premise, subjectPhotoPathnames = [], moods = [] } = await request.json();
  if (!Array.isArray(subjectPhotoPathnames) || !Array.isArray(moods) || typeof premise !== 'string') return NextResponse.json({ error: 'Photo references, mood, and story direction are required.' }, { status: 400 });
  if (subjectPhotoPathnames.length < 1 || subjectPhotoPathnames.length > 3) return NextResponse.json({ error: 'Upload one to three reference photos.' }, { status: 400 });
  if (subjectPhotoPathnames.some((pathname: unknown) => typeof pathname !== 'string' || !pathname.startsWith(`studio/owners/${ownerId}/references/`))) return NextResponse.json({ error: 'Photo references must belong to this preview.' }, { status: 403 });
  const { object } = await generateObject({ model: 'openai/gpt-5.4', schema: storySchema, prompt: `Write the first ${previewSceneCount()} connected 10-second scenes of a premium stylized 3D CGI animated movie. This is a complete 60-second opening preview that must introduce a lovable main character, story world, and a compelling open adventure that can later grow naturally into either a 3-minute or 5-minute full movie without changing these scenes. Mood: ${moods.join(', ') || 'family adventure'}. Customer direction: ${premise.trim() || 'Create an original, joyful story from the uploaded subject.'}. Preserve distinctive subject identity. Every scene must have cinematic 3D CGI action, expressive movement, camera direction, visual continuity, and narration that leaves room for visual storytelling. Do not add scene labels.` });
  return NextResponse.json({ story: object });
}
