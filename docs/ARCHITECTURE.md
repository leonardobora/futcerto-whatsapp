# Arquitetura FutCerto v2.0

## Visão Geral

FutCerto v2.0 é uma plataforma **WhatsApp-First** para agendamento de quadras esportivas. Toda a experiência do usuário acontece via mensagens de texto, sem necessidade de app ou website.

## Componentes Principais

### 1. Canal de Entrada (WhatsApp)
Recebe mensagens via webhook e roteia para o agente correto.

### 2. Router de Agentes
Identifica o perfil do usuário (gestor ou jogador) e direciona para o agente especializado.

### 3. Agentes de IA
- **GestorAgent**: Gerencia quadras, horários, reservas e relatórios
- **JogadorAgent**: Busca quadras, faz reservas, gerencia agenda pessoal

### 4. Ferramentas (Tools)
Funções especializadas que os agentes podem invocar:
- `buscarQuadras`: Localiza quadras por região/modalidade
- `verificarDisponibilidade`: Checa horários livres
- `criarReserva`: Executa o agendamento
- `cancelarReserva`: Cancela uma reserva existente
- `listarReservasGestor`: Retorna reservas de uma quadra
- `gerenciarBloqueios`: Bloqueia/desbloqueia horários

### 5. Banco de Dados (Supabase)
PostgreSQL gerenciado com RLS (Row Level Security) para isolamento de dados por tenant.

## Fluxo de uma Reserva

```
Usuário WhatsApp
    ↓
Webhook (Evolution API / OpenClaw / Tyxter)
    ↓
ChannelAdapter (normaliza o payload)
    ↓
MessageRouter (identifica perfil)
    ↓
JogadorAgent (processa intenção)
    ↓
Tool: verificarDisponibilidade
    ↓
Tool: criarReserva
    ↓
Resposta via WhatsApp
```

## Decisões de Design

### Por que WhatsApp-First?
- 98% dos brasileiros têm WhatsApp instalado
- Zero fricção de onboarding (sem download, sem cadastro complexo)
- Notificações nativas sem custo adicional

### Por que múltiplos canais?
- **Evolution API**: Controle total, ideal para desenvolvimento e testes
- **OpenClaw**: Marketplace, sem infraestrutura própria
- **Tyxter**: Enterprise, SLA garantido, suporte dedicado
