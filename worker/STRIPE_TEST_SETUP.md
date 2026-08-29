# Stripe test checkout

This checkout is intentionally enabled only in Preview and Development. It creates a one-time $49 Stripe test Checkout session for one personalized movie plus its matching Storybook PDF.

## Current contract recorded on the same job

- free preview: Scenes 1–6 and a matching six-page Storybook PDF
- paid order: the webhook marks that same job as paid and records `resumeFromScene: 7`
- final delivery target: Scenes 1–18 movie MP4 and matching 18-page Storybook PDF

## Required Stripe dashboard action

Create a test-mode webhook endpoint for the Worker Preview deployment:

`https://<worker-preview-url>/api/stripe/webhook`

Subscribe to `checkout.session.completed`, then add its signing secret as `STRIPE_WEBHOOK_SECRET` to Worker Preview and Development only.

## Important implementation status

The checkout and verified payment gate are included here. The current Worker app does not yet have the scene-by-scene movie renderer or PDF builder, so the webhook deliberately records payment and does not begin Scenes 7–18. Those must be implemented before any Production checkout is enabled.
