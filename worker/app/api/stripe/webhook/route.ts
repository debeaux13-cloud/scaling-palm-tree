import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { readJob, writeCurrentJob } from '../../../../lib/jobs';
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
  const jobId = session.metadata?.jobId;
  if (!jobId || session.payment_status !== 'paid') return NextResponse.json({ received: true });
  const job = await readJob(jobId);
  if (!job) return NextResponse.json({ error: 'Order job not found.' }, { status: 404 });

  await writeCurrentJob({ ...job, purchase: { status: 'paid', checkoutSessionId: session.id, paidAt: new Date().toISOString(), resumeFromScene: 7 } });
  // Scene 7–18 rendering and the matching 18-page PDF are intentionally not started here until that pipeline is implemented.
  return NextResponse.json({ received: true, resumeFromScene: 7 });
}
