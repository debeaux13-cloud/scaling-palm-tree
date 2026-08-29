import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { readOrder, tierFor, writeOrder } from '../../../../lib/orders';
import { getStripe, isStripeTestEnvironment } from '../../../../lib/stripe';

export async function POST(request: Request) {
  if (!isStripeTestEnvironment()) return NextResponse.json({ error: 'Test webhook is enabled only for Preview and Development.' }, { status: 403 });
  const signature = request.headers.get('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) return NextResponse.json({ error: 'Stripe webhook verification is not configured.' }, { status: 503 });

  let event: Stripe.Event;
  try { event = getStripe().webhooks.constructEvent(await request.text(), signature, secret); }
  catch { return NextResponse.json({ error: 'Invalid Stripe webhook signature.' }, { status: 400 }); }
  if (event.type !== 'checkout.session.completed') return NextResponse.json({ received: true });

  const session = event.data.object as Stripe.Checkout.Session;
  const orderId = session.metadata?.orderId;
  if (!orderId || session.payment_status !== 'paid') return NextResponse.json({ received: true });
  const order = await readOrder(orderId);
  if (!order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });

  for (const scene of order.scenes.slice(6)) if (scene.status === 'locked') scene.status = 'ready';
  order.status = 'ready-for-fulfillment';
  order.finalStorybook = { pageCount: tierFor(order).storybookPages, status: 'blocked-missing-scene-assets' };
  await writeOrder({ ...order, purchase: { status: 'paid', checkoutSessionId: session.id, paidAt: new Date().toISOString(), resumeFromScene: 7 } });
  // Payment unlocks only the same order's existing Scenes 7–18. Rendering remains explicit and never regenerates Scenes 1–6.
  return NextResponse.json({ received: true, resumeFromScene: 7 });
}
