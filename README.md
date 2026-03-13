# FutCerto v2.0 — WhatsApp-First Quadra Booking

FutCerto é uma plataforma de agendamento de quadras esportivas operada inteiramente via WhatsApp, com suporte a múltiplos canais de comunicação.

## Arquitetura

Veja [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) para detalhes completos.

## Configuração Rápida

1. Clone o repositório
2. Copie `.env.example` para `.env` e preencha as variáveis
3. Execute `docker-compose up -d`
4. Rode as migrações: `npx supabase db push`

## Plataformas Suportadas

- **Evolution API** (self-hosted, desenvolvimento)
- **OpenClaw** (marketplace, produção)
- **Tyxter Studio** (enterprise, alta escala)

Veja [docs/PLATFORMS.md](docs/PLATFORMS.md) para comparação detalhada.
