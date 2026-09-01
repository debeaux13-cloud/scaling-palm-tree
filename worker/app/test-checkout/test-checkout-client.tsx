'use client';

import { useState } from 'react';

export function TestCheckoutClient({ orderId }: { orderId: string }) {
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState('This sandbox checkout is visible only to the configured test owner.');
  async function start() {
    setWorking(true);
    try {
      const response = await fetch('/api/orders/test-checkout', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ orderId, tier: 'three' }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Test checkout could not start.');
      window.location.assign(data.checkoutUrl);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Test checkout could not start.');
      setWorking(false);
    }
  }
  return <main style={{maxWidth:640,margin:'80px auto',padding:24}}><p>OWNER TEST ONLY</p><h1>Stripe Sandbox Checkout</h1><p>Order: {orderId}</p><button onClick={() => void start()} disabled={working}>{working ? 'Opening Stripe sandbox…' : 'TEST — Unlock 3-minute movie'}</button><p>{message}</p></main>;
}
