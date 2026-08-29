import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';
import { getOwner } from '../../../../lib/owner';

const MAX_VIDEO_BYTES = 200 * 1024 * 1024;

export async function POST(request: Request) {
  const body = await request.json() as HandleUploadBody;
  const json = await handleUpload({
    body,
    request,
    onBeforeGenerateToken: async (pathname, clientPayload) => {
      const { ownerId } = await getOwner();
      if (!pathname.startsWith(`studio/owners/${ownerId}/references/`)) {
        throw new Error('This upload does not belong to the current preview.');
      }
      return { allowedContentTypes: ['video/mp4'], maximumSizeInBytes: MAX_VIDEO_BYTES, addRandomSuffix: false, tokenPayload: JSON.stringify({ ownerId }) };
    },
    onUploadCompleted: async () => {},
  });
  return NextResponse.json(json);
}
