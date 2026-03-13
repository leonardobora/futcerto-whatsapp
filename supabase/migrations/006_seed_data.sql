-- Migration: 006_seed_data
-- Dados iniciais para desenvolvimento e testes

-- Usuários de teste
INSERT INTO users (id, phone, name, profile) VALUES
  ('00000000-0000-0000-0000-000000000001', '5511999990001', 'Admin FutCerto', 'admin'),
  ('00000000-0000-0000-0000-000000000002', '5511999990002', 'João Gestor', 'gestor'),
  ('00000000-0000-0000-0000-000000000003', '5511999990003', 'Pedro Jogador', 'jogador'),
  ('00000000-0000-0000-0000-000000000004', '5511999990004', 'Maria Jogadora', 'jogador')
ON CONFLICT (phone) DO NOTHING;

-- Quadras de teste
INSERT INTO courts (id, owner_id, name, sport, address, city, state, lat, lng, price_per_hour, amenities) VALUES
  (
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    'Arena FutCerto - Quadra 1',
    'society',
    'Rua das Quadras, 100',
    'São Paulo',
    'SP',
    -23.5505,
    -46.6333,
    150.00,
    ARRAY['estacionamento', 'vestiário', 'iluminação', 'bar']
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000002',
    'Arena FutCerto - Quadra 2',
    'futsal',
    'Rua das Quadras, 100',
    'São Paulo',
    'SP',
    -23.5506,
    -46.6334,
    120.00,
    ARRAY['estacionamento', 'vestiário', 'iluminação']
  )
ON CONFLICT (id) DO NOTHING;

-- Reservas de teste
INSERT INTO bookings (court_id, player_id, date, start_time, end_time, duration_hours, total_price, status) VALUES
  (
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000003',
    CURRENT_DATE + INTERVAL '1 day',
    '10:00',
    '11:00',
    1.0,
    150.00,
    'confirmed'
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000004',
    CURRENT_DATE + INTERVAL '2 days',
    '14:00',
    '16:00',
    2.0,
    240.00,
    'pending'
  )
ON CONFLICT DO NOTHING;
