import { generateText } from 'ai';
import { NextResponse } from 'next/server';
import { requireCustomer } from '../../../lib/auth';

export async function POST(request: Request) {
  const { response } = await requireCustomer();
  if (response) return response;

  const { premise, audience = 'families', durationSeconds = 60 } = await request.json();
  if (typeof premise !== 'string' || !premise.trim()) {
    return NextResponse.json({ error: 'premise is required' }, { status: 400 });
  }
  const { text } = await generateText({
    model: 'openai/gpt-5.4',
    prompt: `Create a ${durationSeconds}-second animated story for ${audience}. Premise: ${premise}. Return: title, character notes, narration, dialogue, and a shot-by-shot movement prompt for a video-generation provider.`,
  });
  return NextResponse.json({ story: text });
}
