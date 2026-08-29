import 'server-only';
import Stripe from 'stripe';

export function isStripeTestEnvironment() {
  return process.env.VERCEL_ENV !== 'production' && process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_');
}

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || !isStripeTestEnvironment()) throw new Error('Stripe test checkout is available only in Preview and Development.');
  return new Stripe(key);
}
