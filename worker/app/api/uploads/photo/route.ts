import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { getOwner } from '../../../../lib/owner';

const MAX_PHOTO_BYTES = 4 * 1024 * 1024;
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export async function POST(request: Request) {
  const { ownerId } = await getOwner();

  const form = await request.formData();
  const file = form.get('photo');
  if (!(file instanceof File) || !IMAGE_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'Upload a JPG, PNG, or WebP photo.' }, { status: 400 });
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return NextResponse.json({ error: 'Each photo must be 4 MB or smaller.' }, { status: 413 });
  }

  const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const pathname = `studio/owners/${ownerId}/references/${crypto.randomUUID()}.${extension}`;
  await put(pathname, file, { access: 'private', contentType: file.type, addRandomSuffix: false });
  return NextResponse.json({ pathname, name: file.name, type: file.type }, { status: 201 });
}
