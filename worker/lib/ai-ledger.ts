import { neon } from '@neondatabase/serverless';

function sql() {
  const connectionString = process.env.AI_LEDGER_DATABASE_URL;
  if (!connectionString) throw new Error('AI spend ledger is not configured. Paid generation is blocked.');
  return neon(connectionString);
}

let schema: Promise<void> | undefined;

function ensureSchema() {
  schema ??= sql()`
    CREATE TABLE IF NOT EXISTS ai_generation_ledger (
      order_id TEXT NOT NULL,
      scene_number INTEGER NOT NULL CHECK (scene_number BETWEEN 7 AND 18),
      state TEXT NOT NULL CHECK (state IN ('requested', 'completed', 'failed')),
      blob_pathname TEXT,
      error TEXT,
      requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMPTZ,
      PRIMARY KEY (order_id, scene_number)
    )
  `.then(() => undefined);
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
