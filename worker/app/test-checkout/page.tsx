import { auth } from '@clerk/nextjs/server';
import { notFound } from 'next/navigation';
import { TestCheckoutClient } from './test-checkout-client';

function ownerMatches(userId: string | null, configured: string | undefined) {
  if (!userId || !configured) return false;
  const normalized = configured.startsWith('user:user_') ? configured.slice(5) : configured;
  return normalized === userId;
}

export default async function TestCheckoutPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const { userId } = await auth();
  if (!ownerMatches(userId, process.env.MCS_TEST_CHECKOUT_OWNER)) notFound();
  const { order } = await searchParams;
  if (!order) notFound();
  return <TestCheckoutClient orderId={order} />;
}
