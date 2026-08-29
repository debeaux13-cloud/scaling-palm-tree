import { NextResponse } from 'next/server';
import { getOwner } from '../../../../../lib/owner';

export async function POST() {
  const { ownerId } = await getOwner();
  return NextResponse.json({ pathname: `studio/owners/${ownerId}/references/${crypto.randomUUID()}.mp4` });
}
