import { generateObject } from 'ai';
import { z } from 'zod';
import { NextResponse } from 'next/server';
import { getOwner } from '../../../lib/owner';
const storySchema = z.object({ title: z.string().min(1), scenes: z.array(z.object({ narration: z.string().min(1), videoPrompt: z.string().min(1) })).length(18) });
export async function POST(request: Request) {
  const { ownerId } = await getOwner(); const { premise, subjectPhotoPathnames = [], moods = [] } = await request.json();
  if (!Array.isArray(subjectPhotoPathnames) || !Array.isArray(moods) || typeof premise !== 'string') return NextResponse.json({ error: 'Photo references, mood, and story direction are required.' }, { status: 400 });
  if (subjectPhotoPathnames.length < 1 || subjectPhotoPathnames.length > 3) return NextResponse.json({ error: 'Upload one to three reference photos.' }, { status: 400 });
  if (subjectPhotoPathnames.some((pathname: unknown) => typeof pathname !== 'string' || !pathname.startsWith(`studio/owners/${ownerId}/references/`))) return NextResponse.json({ error: 'Photo references must belong to this preview.' }, { status: 403 });
  const { object } = await generateObject({ model: 'openai/gpt-5.4', schema: storySchema, prompt: `Write one complete connected 18-scene, 180-second premium stylized 3D CGI animated movie. The customer's direction is the story brief: follow it faithfully and make the full story yourself without asking the customer to edit, choose plot points, or extend it later. Mood: ${moods.join(', ') || 'family adventure'}. Customer direction: ${premise.trim() || 'Create an original, joyful adventure from the uploaded subject.'}. Build a real beginning, escalating middle, climax, and satisfying ending across exactly 18 connected 10-second scenes. Scenes 1-6 must also work as an irresistible 60-second free preview while remaining the true opening of the same 3-minute story; scenes 7-18 continue that already-planned story after purchase. Preserve distinctive subject identity throughout. Every scene must have cinematic 3D CGI action, expressive movement, camera direction, visual continuity, and concise narration that leaves room for visual storytelling. Match the requested mood strongly. Do not add scene labels.` });
  return NextResponse.json({ story: object });
}
