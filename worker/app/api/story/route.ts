import { generateObject } from 'ai';
import { z } from 'zod';
import { NextResponse } from 'next/server';
import { getOwner } from '../../../lib/owner';

const storySchema = z.object({ title: z.string(), scenes: z.array(z.object({ narration: z.string(), videoPrompt: z.string() })).length(18) });
export async function POST(request: Request) {
  const { ownerId } = await getOwner();
  const { premise, subjectPhotoPathnames = [] } = await request.json();
  if (typeof premise !== 'string' || !premise.trim() || !Array.isArray(subjectPhotoPathnames)) return NextResponse.json({ error: 'A story idea and photo references are required.' }, { status: 400 });
  if (subjectPhotoPathnames.some((pathname: unknown) => typeof pathname !== 'string' || !pathname.startsWith(`studio/owners/${ownerId}/references/`))) return NextResponse.json({ error: 'Photo references must belong to this preview.' }, { status: 403 });
  const { object } = await generateObject({ model: 'openai/gpt-5.4', schema: storySchema, prompt: `Write one cohesive personalized family movie in exactly 18 connected scenes of about 10 seconds. First six scenes make the free 60-second preview; Scenes 7–18 continue the same story through climax and ending. Keep the uploaded subject recognizably consistent. Premise: ${premise}. Each scene needs exact narration and a video prompt with visible character movement and sound. Do not put Scene labels in narration.` });
  return NextResponse.json({ story: object });
}
