-- Migration: 004_create_conversation_history
-- Armazena o histórico de conversas para contexto da IA

CREATE TABLE IF NOT EXISTS conversation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content TEXT NOT NULL,
  tool_name TEXT,
  tool_result JSONB,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_conv_user ON conversation_history(user_id);
CREATE INDEX idx_conv_session ON conversation_history(session_id);
CREATE INDEX idx_conv_created ON conversation_history(created_at DESC);

-- RLS
ALTER TABLE conversation_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversations" ON conversation_history
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Service role has full access" ON conversation_history
  USING (auth.role() = 'service_role');

-- Limpeza automática de histórico antigo (30 dias)
CREATE OR REPLACE FUNCTION cleanup_old_conversations()
RETURNS void AS $$
BEGIN
  DELETE FROM conversation_history
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;
