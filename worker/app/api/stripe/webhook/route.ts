import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { readOrder, writeOrder } from '../../../../lib/orders';
import { getStripe, isStripeConfigured } from '../../../../lib/stripe';
export async function POST(request: Request) {
  if (!isStripeConfigured()) return NextResponse.json({ error: 'Stripe webhook is not configured.' }, { status: 503 });
  const signature = request.headers.get('stripe-signature'); const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) return NextResponse.json({ error: 'Stripe webhook verification is not configured.' }, { status: 503 });
  let event: Stripe.Event; try { event = getStripe().webhooks.constructEvent(await request.text(), signature, secret); } catch { return NextResponse.json({ error: 'Invalid Stripe webhook signature.' }, { status: 400 }); }
  if (event.type !== 'checkout.session.completed') return NextResponse.json({ received: true });
  const session = event.data.object as Stripe.Checkout.Session; const orderId = session.metadata?.orderId;
  if (!orderId || session.payment_status !== 'paid') return NextResponse.json({ received: true });
  const order = await readOrder(orderId); if (!order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  const paid = { ...order, status: 'ready-for-fulfillment' as const, continuationStatus: order.continuationStatus === 'planned' ? 'planned' as const : 'ready' as const, purchase: { status: 'paid' as const, checkoutSessionId: session.id, paidAt: new Date().toISOString(), resumeFromScene: 7 } };
  await writeOrder(paid);
  if (!paid.paymentWebhookUrl) return NextResponse.json({ error: 'Movie workflow is not waiting for payment.' }, { status: 409 });
  const resumed = await fetch(paid.paymentWebhookUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ orderId, checkoutSessionId: session.id }) });
  if (!resumed.ok) return NextResponse.json({ error: 'Unable to resume movie workflow.' }, { status: 502 });
  return NextResponse.json({ received: true, resumeFromScene: 7 });
}
