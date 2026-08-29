import { NextResponse } from 'next/server';
import { getOwner, requireSignedInOwner } from '../../../../lib/owner';
import { isProductTier, PRODUCT_TIERS, readOrder, writeOrder } from '../../../../lib/orders';
import { getStripe, isStripeTestEnvironment } from '../../../../lib/stripe';
export async function POST(request: Request) {
  if (!isStripeTestEnvironment()) return NextResponse.json({ error: 'Checkout is enabled only in Preview and Development test mode.' }, { status: 403 });
  const signedInOwner = await requireSignedInOwner();
  if (!signedInOwner) return NextResponse.json({ error: 'Create or sign in to your free account to save this movie and continue to checkout.', needsAccount: true }, { status: 401 });
  const { ownerId: currentOwner } = await getOwner(); const { orderId, tier } = await request.json();
  if (typeof orderId !== 'string' || !isProductTier(tier)) return NextResponse.json({ error: 'orderId and movie package are required' }, { status: 400 });
  const order = await readOrder(orderId);
  if (!order || (order.ownerId !== currentOwner && order.ownerId !== signedInOwner)) return NextResponse.json({ error: 'preview order not found' }, { status: 404 });
  if (order.status !== 'awaiting-payment') return NextResponse.json({ error: 'Finish the 60-second preview before checkout.' }, { status: 409 });
  const product = PRODUCT_TIERS[tier]; const stripe = getStripe(); const origin = new URL(request.url).origin;
  const session = await stripe.checkout.sessions.create({ mode: 'payment', success_url: `${origin}/?checkout=success&order=${order.id}`, cancel_url: `${origin}/?checkout=cancelled&order=${order.id}`, line_items: [{ price_data: { currency: 'usd', unit_amount: product.priceCents, product_data: { name: `Personalized ${product.label} + Matching Storybook PDF` } }, quantity: 1 }], metadata: { orderId, tier, targetRuntimeSeconds: String(product.targetRuntimeSeconds), resumeFromScene: '7', finalScenes: String(product.sceneCount), finalStorybookPages: String(product.storybookPages) } });
  await writeOrder({ ...order, ownerId: signedInOwner, tier, targetRuntimeSeconds: product.targetRuntimeSeconds, continuationStatus: 'awaiting-payment', finalStorybook: { pageCount: product.storybookPages, status: 'locked' }, purchase: { status: 'checkout-created', checkoutSessionId: session.id, resumeFromScene: 7 } });
  return NextResponse.json({ checkoutUrl: session.url });
}
