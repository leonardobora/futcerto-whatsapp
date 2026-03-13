-- Migration: 005_create_time_blocks
-- Bloqueios de horário por gestores

CREATE TABLE IF NOT EXISTS time_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  court_id UUID NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  reason TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT no_block_overlap UNIQUE (court_id, date, start_time)
);

-- Índices
CREATE INDEX idx_blocks_court ON time_blocks(court_id);
CREATE INDEX idx_blocks_date ON time_blocks(date);

-- RLS
ALTER TABLE time_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Court owners can manage blocks" ON time_blocks
  USING (
    EXISTS (
      SELECT 1 FROM courts
      WHERE courts.id = time_blocks.court_id
      AND courts.owner_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Service role has full access" ON time_blocks
  USING (auth.role() = 'service_role');
