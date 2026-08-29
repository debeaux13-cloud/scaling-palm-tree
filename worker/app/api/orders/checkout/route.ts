import { NextResponse } from 'next/server';
import { getOwner, requireSignedInOwner } from '../../../../lib/owner';
import { readOrder, tierFor, writeOrder } from '../../../../lib/orders';
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
  const product = tierFor(order);
  const stripe = getStripe();
  const origin = new URL(request.url).origin;
  const session = await stripe.checkout.sessions.create({ mode: 'payment', success_url: `${origin}/?checkout=success`, cancel_url: `${origin}/?checkout=cancelled`, line_items: [{ price_data: { currency: 'usd', unit_amount: product.priceCents, product_data: { name: `Personalized ${product.label} + Matching Storybook PDF` } }, quantity: 1 }], metadata: { orderId, tier: order.tier, targetRuntimeSeconds: String(product.targetRuntimeSeconds), resumeFromScene: '7', finalScenes: String(product.sceneCount), finalStorybookPages: String(product.storybookPages) } });
  await writeOrder({ ...order, ownerId: signedInOwner, purchase: { status: 'checkout-created', checkoutSessionId: session.id, resumeFromScene: 7 } });
  return NextResponse.json({ checkoutUrl: session.url });
}
