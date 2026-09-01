import { auth } from '@clerk/nextjs/server';
import { notFound } from 'next/navigation';
import { TestCheckoutClient } from './test-checkout-client';

export default async function TestCheckoutPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const { userId } = await auth();
  const signedInOwner = userId ? `user:${userId}` : null;
  if (!signedInOwner || !process.env.MCS_TEST_CHECKOUT_OWNER || signedInOwner !== process.env.MCS_TEST_CHECKOUT_OWNER) notFound();
  const { order } = await searchParams;
  if (!order) notFound();
  return <TestCheckoutClient orderId={order} />;
}
