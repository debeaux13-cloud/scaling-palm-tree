import Stripe from 'stripe';
export function isStripeConfigured() { return Boolean(process.env.STRIPE_SECRET_KEY?.startsWith('sk_')); }
export function getStripe() { const key = process.env.STRIPE_SECRET_KEY; if (!key || !isStripeConfigured()) throw new Error('Stripe is not configured.'); return new Stripe(key); }
