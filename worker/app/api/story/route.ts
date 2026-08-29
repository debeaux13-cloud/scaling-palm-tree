import { generateText } from 'ai';
import { NextResponse } from 'next/server';
import { requireStudioAccess } from '../../../lib/auth';

export async function POST(request: Request) {
  const denied = requireStudioAccess(request);
  if (denied) return denied;

  const { premise, audience = 'families', durationSeconds = 60 } = await request.json();
  if (typeof premise !== 'string' || !premise.trim()) {
    return NextResponse.json({ error: 'premise is required' }, { status: 400 });
  }
  if (!process.env.AI_GATEWAY_API_KEY) {
    return NextResponse.json({ error: 'AI Gateway is not connected yet' }, { status: 503 });
  }

  const { text } = await generateText({
    model: 'openai/gpt-5.4',
    prompt: `Create a ${durationSeconds}-second animated story for ${audience}. Premise: ${premise}. Return: title, character notes, narration, dialogue, and a shot-by-shot movement prompt for a video-generation provider.`,
  });
  return NextResponse.json({ story: text });
}
