# Movie + matching Storybook contract

Each customer order owns exactly 18 scene records. Each record keeps the scene number only as an internal identifier, the exact narration spoken in the movie scene, the exact video prompt, and paths for the rendered scene artwork and scene MP4.

## Preview

- Scenes 1–6 are available before purchase.
- The preview is a 60-second movie assembled from six 10-second scene clips.
- The paid Storybook is generated only after every final scene has its exact rendered artwork and narration asset.

## Paid fulfillment

- Stripe confirms one $49 payment for the movie and matching Storybook as a single product.
- The webhook unlocks Scenes 7–18 on the same order. It never recreates Scenes 1–6.
- The final product is an 18-scene movie and one 18-page Storybook PDF.
- Customer-facing pages never show internal labels such as `Scene 1`.

## Fulfillment gate

The current APIs deliberately block PDF assembly until every page has an exact rendered scene artwork asset and its original narration. This prevents a second story, different art, or placeholder pages from reaching a customer.
