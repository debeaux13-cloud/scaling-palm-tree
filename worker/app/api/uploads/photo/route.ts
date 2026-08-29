import { put } from '@vercel/blob';
import sharp from 'sharp';
import { NextResponse } from 'next/server';
import { getOwner } from '../../../../lib/owner';

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export async function POST(request: Request) {
  const { ownerId } = await getOwner();
  const form = await request.formData();
  const file = form.get('photo');
  if (!(file instanceof File) || !IMAGE_TYPES.has(file.type)) return NextResponse.json({ error: 'Upload a JPG, PNG, or WebP photo.' }, { status: 400 });
  if (file.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: 'Each photo must be 8 MB or smaller.' }, { status: 413 });
  try {
    const normalized = await sharp(Buffer.from(await file.arrayBuffer())).rotate().resize({ width: 1280, height: 1280, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
    const pathname = `studio/owners/${ownerId}/references/${crypto.randomUUID()}.jpg`;
    await put(pathname, normalized, { access: 'private', contentType: 'image/jpeg', addRandomSuffix: false });
    return NextResponse.json({ pathname, name: file.name, type: 'image/jpeg' }, { status: 201 });
  } catch { return NextResponse.json({ error: 'Unable to prepare this photo. Please choose a standard JPG, PNG, or WebP image.' }, { status: 400 }); }
}
