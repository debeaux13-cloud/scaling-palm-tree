import { experimental_getVideoStatus as getVideoStatus, type JSONValue } from 'ai';
import { NextResponse } from 'next/server';
import { authorizeManualPaidSceneRetry, getPaidSceneOperation } from '../../../../../../../../lib/ai-ledger';
import { startPaidFulfillment } from '../../../../../../../../lib/paid-fulfillment-workflow';
import { mutateOrder, readOrder } from '../../../../../../../../lib/orders';
import { requireSignedInOwner } from '../../../../../../../../lib/owner';

const model = 'alibaba/wan-v2.6-r2v';

export async function POST(request: Request, { params }: { params: Promise<{ id: string; scene: string }> }) {
  const adminId = await requireSignedInOwner();
  const secret = request.headers.get('x-studio-admin-secret');
  if (!adminId || !secret || secret !== process.env.STUDIO_API_SECRET) return NextResponse.json({ error: 'Admin authorization required.' }, { status: 403 });
  const { id, scene: sceneParam } = await params;
  const sceneNumber = Number(sceneParam);
  if (!Number.isInteger(sceneNumber) || sceneNumber < 7 || sceneNumber > 18) return NextResponse.json({ error: 'Paid scene must be between 7 and 18.' }, { status: 400 });
  const { reason } = await request.json().catch(() => ({ reason: undefined }));
  if (typeof reason !== 'string' || reason.trim().length < 10) return NextResponse.json({ error: 'Provide a retry reason of at least 10 characters.' }, { status: 400 });
  const order = await readOrder(id);
  if (!order || order.purchase.status !== 'paid') return NextResponse.json({ error: 'Paid order not found.' }, { status: 404 });
  const operation = await getPaidSceneOperation(id, sceneNumber);
  if (!operation) return NextResponse.json({ error: 'No provider operation exists for this scene.' }, { status: 409 });
  const status = await getVideoStatus(model, { operation: operation as JSONValue });
  if (status.status !== 'error') return NextResponse.json({ error: 'The original provider operation has not failed; no new charge is authorized.' }, { status: 409 });
  if (!(await authorizeManualPaidSceneRetry(id, sceneNumber, reason.trim(), adminId))) return NextResponse.json({ error: 'Scene is not eligible for a manual retry.' }, { status: 409 });
  await mutateOrder(id, (fresh) => { const target = fresh.scenes[sceneNumber - 1]; if (!target) return; target.status = 'ready'; target.generation.attempts = 0; delete target.generation.startedAt; delete target.error; });
  await startPaidFulfillment(id);
  console.info('[DirectMovie] admin paid-scene retry authorized', { orderId: id, sceneNumber, adminId });
  return NextResponse.json({ accepted: true, orderId: id, sceneNumber });
}
