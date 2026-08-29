import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function requireCustomer() {
  const { userId } = await auth();
  if (!userId) return { userId: null, response: NextResponse.json({ error: 'Sign in to create or view your movies.' }, { status: 401 }) };
  return { userId, response: null };
}
