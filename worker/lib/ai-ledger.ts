import { neon } from '@neondatabase/serverless';

function sql() {
  const connectionString = process.env.AI_LEDGER_DATABASE_URL;
  if (!connectionString) throw new Error('AI spend ledger is not configured. Paid generation is blocked.');
  return neon(connectionString);
}

let schema: Promise<void> | undefined;

function ensureSchema() {
  schema ??= Promise.all([
    sql()`
      CREATE TABLE IF NOT EXISTS stripe_webhook_events (
        event_id TEXT PRIMARY KEY,
        received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `,
    sql()`
      CREATE TABLE IF NOT EXISTS ai_generation_ledger (
        order_id TEXT NOT NULL,
        scene_number INTEGER NOT NULL CHECK (scene_number BETWEEN 7 AND 18),
        state TEXT NOT NULL CHECK (state IN ('requested', 'completed', 'failed')),
        operation JSONB,
        blob_pathname TEXT,
        error TEXT,
        requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMPTZ,
        PRIMARY KEY (order_id, scene_number)
      )
    `,
  ]).then(async () => { await sql()`ALTER TABLE ai_generation_ledger ADD COLUMN IF NOT EXISTS operation JSONB`; });
  return schema;
}

export async function claimPaidSceneGeneration(orderId: string, sceneNumber: number) {
  await ensureSchema();
  const rows = await sql()`
    INSERT INTO ai_generation_ledger (order_id, scene_number, state)
    VALUES (${orderId}, ${sceneNumber}, 'requested')
    ON CONFLICT (order_id, scene_number) DO NOTHING
    RETURNING order_id
  `;
  return rows.length === 1;
}

export async function recordPaidSceneOperation(orderId: string, sceneNumber: number, operation: unknown) {
  await sql()`
    UPDATE ai_generation_ledger
    SET operation = ${JSON.stringify(operation)}::jsonb
    WHERE order_id = ${orderId} AND scene_number = ${sceneNumber}
  `;
}

export async function recordPaidSceneCompletion(orderId: string, sceneNumber: number, blobPathname: string) {
  await sql()`
    UPDATE ai_generation_ledger
    SET state = 'completed', blob_pathname = ${blobPathname}, completed_at = NOW()
    WHERE order_id = ${orderId} AND scene_number = ${sceneNumber}
  `;
}

export async function recordPaidSceneFailure(orderId: string, sceneNumber: number, error: string) {
  await sql()`
    UPDATE ai_generation_ledger
    SET state = 'failed', error = ${error}, completed_at = NOW()
    WHERE order_id = ${orderId} AND scene_number = ${sceneNumber}
  `;
}

export async function getPaidSceneOperation(orderId: string, sceneNumber: number) {
  await ensureSchema();
  const rows = await sql()`SELECT operation FROM ai_generation_ledger WHERE order_id = ${orderId} AND scene_number = ${sceneNumber}`;
  return rows[0]?.operation as unknown | undefined;
}

export async function authorizeManualPaidSceneRetry(orderId: string, sceneNumber: number, reason: string, adminId: string) {
  await ensureSchema();
  await sql()`
    CREATE TABLE IF NOT EXISTS ai_generation_retry_audit (
      id BIGSERIAL PRIMARY KEY,
      order_id TEXT NOT NULL,
      scene_number INTEGER NOT NULL,
      reason TEXT NOT NULL,
      admin_id TEXT NOT NULL,
      authorized_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  const rows = await sql()`
    WITH removed AS (
      DELETE FROM ai_generation_ledger
      WHERE order_id = ${orderId} AND scene_number = ${sceneNumber} AND state = 'failed'
      RETURNING order_id, scene_number
    ), audit AS (
      INSERT INTO ai_generation_retry_audit (order_id, scene_number, reason, admin_id)
      SELECT order_id, scene_number, ${reason}, ${adminId} FROM removed
      RETURNING id
    )
    SELECT id FROM audit
  `;
  return rows.length === 1;
}

export async function claimStripeWebhookEvent(eventId: string) {
  await ensureSchema();
  const rows = await sql()`
    INSERT INTO stripe_webhook_events (event_id) VALUES (${eventId})
    ON CONFLICT (event_id) DO NOTHING
    RETURNING event_id
  `;
  return rows.length === 1;
}
