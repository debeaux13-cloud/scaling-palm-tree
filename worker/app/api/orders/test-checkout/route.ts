import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { getOwner, requireSignedInOwner } from '../../../../lib/owner';
import { isProductTier, PRODUCT_TIERS, readOrder, writeOrder } from '../../../../lib/orders';

function authorizedTestOwner(signedInOwner: string) {
  const allowed = process.env.MCS_TEST_CHECKOUT_OWNER;
  return Boolean(allowed && signedInOwner === allowed);
}

export async function POST(request: Request) {
  const signedInOwner = await requireSignedInOwner();
  if (!signedInOwner) return NextResponse.json({ error: 'Sign in before test checkout.', needsAccount: true }, { status: 401 });
  if (!authorizedTestOwner(signedInOwner)) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  const key = process.env.STRIPE_TEST_SECRET_KEY;
  if (!key?.startsWith('sk_test_')) return NextResponse.json({ error: 'Test checkout is not configured.' }, { status: 503 });

  const { ownerId: currentOwner } = await getOwner();
  const { orderId, tier } = await request.json();
  if (typeof orderId !== 'string' || !isProductTier(tier)) return NextResponse.json({ error: 'orderId and movie package are required' }, { status: 400 });
  const order = await readOrder(orderId);
  if (!order || (order.ownerId !== currentOwner && order.ownerId !== signedInOwner)) return NextResponse.json({ error: 'preview order not found' }, { status: 404 });
  if (order.status !== 'awaiting-payment') return NextResponse.json({ error: 'Finish the 60-second preview before checkout.' }, { status: 409 });

  const product = PRODUCT_TIERS[tier];
  const stripe = new Stripe(key);
  const origin = new URL(request.url).origin;
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    success_url: `${origin}/?checkout=test-success&order=${order.id}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/?checkout=test-cancelled&order=${order.id}`,
    line_items: [{ price_data: { currency: 'usd', unit_amount: product.priceCents, product_data: { name: `[TEST] Personalized ${product.label} + Matching Storybook PDF` } }, quantity: 1 }],
    metadata: { orderId, tier, checkoutMode: 'test', targetRuntimeSeconds: String(product.targetRuntimeSeconds), resumeFromScene: '7', finalScenes: String(product.sceneCount), finalStorybookPages: String(product.storybookPages) },
  });
  await writeOrder({ ...order, ownerId: signedInOwner, tier, targetRuntimeSeconds: product.targetRuntimeSeconds, continuationStatus: 'awaiting-payment', finalStorybook: { pageCount: product.storybookPages, status: 'locked' }, purchase: { status: 'checkout-created', checkoutSessionId: session.id, resumeFromScene: 7 } });
  return NextResponse.json({ checkoutUrl: session.url });
}

export async function GET() {
  const signedInOwner = await requireSignedInOwner();
  return NextResponse.json({ enabled: Boolean(signedInOwner && authorizedTestOwner(signedInOwner)) });
}
