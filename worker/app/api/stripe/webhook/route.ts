import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { readOrder, writeOrder } from '../../../../lib/orders';
import { getStripe, isStripeTestEnvironment } from '../../../../lib/stripe';
export async function POST(request: Request) {
  if (!isStripeTestEnvironment()) return NextResponse.json({ error: 'Test webhook is enabled only for Preview and Development.' }, { status: 403 });
  const signature = request.headers.get('stripe-signature'); const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) return NextResponse.json({ error: 'Stripe webhook verification is not configured.' }, { status: 503 });
  let event: Stripe.Event; try { event = getStripe().webhooks.constructEvent(await request.text(), signature, secret); } catch { return NextResponse.json({ error: 'Invalid Stripe webhook signature.' }, { status: 400 }); }
  if (event.type !== 'checkout.session.completed') return NextResponse.json({ received: true });
  const session = event.data.object as Stripe.Checkout.Session; const orderId = session.metadata?.orderId;
  if (!orderId || session.payment_status !== 'paid') return NextResponse.json({ received: true });
  const order = await readOrder(orderId); if (!order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  await writeOrder({ ...order, status: 'ready-for-fulfillment', continuationStatus: order.continuationStatus === 'planned' ? 'planned' : 'ready', purchase: { status: 'paid', checkoutSessionId: session.id, paidAt: new Date().toISOString(), resumeFromScene: 7 } });
  return NextResponse.json({ received: true, resumeFromScene: 7 });
}
