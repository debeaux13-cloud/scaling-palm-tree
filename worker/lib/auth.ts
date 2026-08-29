import { NextResponse } from 'next/server';

export function requireStudioAccess(request: Request) {
  const secret = process.env.STUDIO_API_SECRET;
  if (!secret) return NextResponse.json({ error: 'Studio API access is not configured' }, { status: 503 });
  if (request.headers.get('x-studio-secret') !== secret) {
    return NextResponse.json({ error: 'Studio API access is not authorized' }, { status: 401 });
  }
  return null;
}
