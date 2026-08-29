import { auth } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';
import { randomUUID } from 'node:crypto';

const COOKIE = 'mcs_preview_session';

export async function getOwner() {
  const { userId } = await auth();
  if (userId) return { ownerId: `user:${userId}`, userId, isGuest: false };
  const store = await cookies();
  let guestId = store.get(COOKIE)?.value;
  if (!guestId) {
    guestId = `guest:${randomUUID()}`;
    store.set(COOKIE, guestId, { httpOnly: true, sameSite: 'lax', secure: true, path: '/', maxAge: 60 * 60 * 24 * 30 });
  }
  return { ownerId: guestId, userId: null, isGuest: true };
}

export async function requireSignedInOwner() {
  const { userId } = await auth();
  return userId ? `user:${userId}` : null;
}
