CREATE TABLE IF NOT EXISTS ai_generation_ledger (
  order_id TEXT NOT NULL,
  scene_number INTEGER NOT NULL CHECK (scene_number BETWEEN 7 AND 18),
  state TEXT NOT NULL CHECK (state IN ('requested', 'completed', 'failed')),
  blob_pathname TEXT,
  error TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  PRIMARY KEY (order_id, scene_number)
);
