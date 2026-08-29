import { NextResponse } from 'next/server';
import { getOwner, requireSignedInOwner } from '../../../../lib/owner';
import { readOrder, writeOrder } from '../../../../lib/orders';
import { getStripe, isStripeTestEnvironment } from '../../../../lib/stripe';

export async function POST(request: Request) {
  if (!isStripeTestEnvironment()) return NextResponse.json({ error: 'Checkout is not enabled in production yet.' }, { status: 403 });
  const signedInOwner = await requireSignedInOwner();
  if (!signedInOwner) return NextResponse.json({ error: 'Create or sign in to your free account to save this movie and continue to payment.', needsAccount: true }, { status: 401 });
  const { ownerId: currentOwner } = await getOwner();
  const { orderId } = await request.json();
  if (typeof orderId !== 'string') return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
  const order = await readOrder(orderId);
  if (!order || (order.ownerId !== currentOwner && order.ownerId !== signedInOwner)) return NextResponse.json({ error: 'preview order not found' }, { status: 404 });
  if (order.status !== 'awaiting-payment') return NextResponse.json({ error: 'Complete the six-scene preview before checkout.' }, { status: 409 });
  const stripe = getStripe();
  const origin = new URL(request.url).origin;
  const session = await stripe.checkout.sessions.create({ mode: 'payment', success_url: `${origin}/?checkout=success`, cancel_url: `${origin}/?checkout=cancelled`, line_items: [{ price_data: { currency: 'usd', unit_amount: 4900, product_data: { name: 'Personalized 3-Minute Movie + Matching Storybook PDF' } }, quantity: 1 }], metadata: { orderId, resumeFromScene: '7', finalScenes: '18', finalStorybookPages: '18' } });
  await writeOrder({ ...order, ownerId: signedInOwner, purchase: { status: 'checkout-created', checkoutSessionId: session.id, resumeFromScene: 7 } });
  return NextResponse.json({ checkoutUrl: session.url });
}
