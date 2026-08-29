import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { requireCustomer } from '../../../../lib/auth';

const MAX_PHOTO_BYTES = 4 * 1024 * 1024;
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export async function POST(request: Request) {
  const { userId, response } = await requireCustomer();
  if (response || !userId) return response!;

  const form = await request.formData();
  const file = form.get('photo');
  if (!(file instanceof File) || !IMAGE_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'Upload a JPG, PNG, or WebP photo.' }, { status: 400 });
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return NextResponse.json({ error: 'Each photo must be 4 MB or smaller.' }, { status: 413 });
  }

  const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const pathname = `studio/customers/${userId}/references/${crypto.randomUUID()}.${extension}`;
  await put(pathname, file, { access: 'private', contentType: file.type, addRandomSuffix: false });
  return NextResponse.json({ pathname, name: file.name, type: file.type }, { status: 201 });
}
