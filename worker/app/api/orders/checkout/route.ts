import { NextResponse } from 'next/server';
import { requireStudioAccess } from '../../../../lib/auth';
import { readOrder, writeOrder } from '../../../../lib/orders';
import { getStripe, isStripeTestEnvironment } from '../../../../lib/stripe';

export async function POST(request: Request) {
  const denied = requireStudioAccess(request);
  if (denied) return denied;
  if (!isStripeTestEnvironment()) return NextResponse.json({ error: 'Test checkout is enabled only for Preview and Development.' }, { status: 403 });

  const { orderId } = await request.json();
  if (typeof orderId !== 'string') return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
  const order = await readOrder(orderId);
  if (!order) return NextResponse.json({ error: 'preview order not found' }, { status: 404 });
  if (order.status !== 'awaiting-payment') return NextResponse.json({ error: 'Complete the six-scene preview before checkout.' }, { status: 409 });
  if (order.purchase.status === 'paid') return NextResponse.json({ error: 'This order is already paid.' }, { status: 409 });

  const stripe = getStripe();
  const origin = new URL(request.url).origin;
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    success_url: `${origin}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/?checkout=cancelled`,
    line_items: [{ price_data: { currency: 'usd', unit_amount: 4900, product_data: { name: 'Personalized Movie + Matching Storybook PDF', description: 'One personalized 18-scene movie and matching 18-page Storybook PDF. Your free preview covers Scenes 1–6.' } }, quantity: 1 }],
    metadata: { orderId, product: 'personalized-movie-and-matching-storybook', previewScenes: '1-6', resumeFromScene: '7', finalScenes: '1-18', finalStorybookPages: '18' },
  });
  await writeOrder({ ...order, purchase: { status: 'checkout-created', checkoutSessionId: session.id, resumeFromScene: 7 } });
  return NextResponse.json({ checkoutUrl: session.url });
}
