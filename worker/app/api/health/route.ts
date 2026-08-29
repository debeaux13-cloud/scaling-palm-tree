import { NextResponse } from 'next/server';

export function GET() {
  return NextResponse.json({
    service: 'mcs-studio-lab',
    status: 'ready-for-provider-connection',
    mediaStorage: 'private-vercel-blob',
    videoProvider: 'not-connected',
    voiceProvider: 'not-connected',
  });
}
