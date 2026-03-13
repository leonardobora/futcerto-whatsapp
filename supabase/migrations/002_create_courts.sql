-- Migration: 002_create_courts
-- Cria a tabela de quadras esportivas

CREATE TABLE IF NOT EXISTS courts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sport TEXT NOT NULL CHECK (sport IN ('futebol', 'society', 'futsal', 'beach_soccer', 'outros')),
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'SP',
  lat DECIMAL(10, 8),
  lng DECIMAL(11, 8),
  price_per_hour DECIMAL(10, 2) NOT NULL,
  amenities TEXT[] DEFAULT '{}',
  photos TEXT[] DEFAULT '{}',
  active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_courts_owner ON courts(owner_id);
CREATE INDEX idx_courts_city ON courts(city);
CREATE INDEX idx_courts_sport ON courts(sport);
CREATE INDEX idx_courts_active ON courts(active);

-- RLS
ALTER TABLE courts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public courts are viewable by all" ON courts
  FOR SELECT USING (active = true);

CREATE POLICY "Owners can manage own courts" ON courts
  USING (auth.uid()::text = owner_id::text);

CREATE POLICY "Service role has full access" ON courts
  USING (auth.role() = 'service_role');

CREATE TRIGGER courts_updated_at
  BEFORE UPDATE ON courts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
