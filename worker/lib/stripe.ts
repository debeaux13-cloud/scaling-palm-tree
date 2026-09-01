import Stripe from 'stripe';

function activeStripeKey() {
  // Temporary launch-test switch: when explicitly enabled, use the sandbox key even
  // on the production customer domain. Live credentials remain untouched.
  if (process.env.STRIPE_CHECKOUT_MODE === 'test') return process.env.STRIPE_TEST_SECRET_KEY;
  return process.env.STRIPE_SECRET_KEY;
}

export function isStripeConfigured() {
  const key = activeStripeKey();
  return Boolean(key?.startsWith(process.env.STRIPE_CHECKOUT_MODE === 'test' ? 'sk_test_' : 'sk_'));
}

export function getStripe() {
  const key = activeStripeKey();
  if (!key || !isStripeConfigured()) throw new Error('Stripe is not configured.');
  return new Stripe(key);
}
