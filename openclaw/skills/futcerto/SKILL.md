# FutCerto Skill — OpenClaw

## Descrição

Skill oficial do FutCerto para a plataforma OpenClaw. Gerencia o fluxo completo de agendamento de quadras esportivas via WhatsApp.

## Capacidades

- Busca de quadras por localização e modalidade
- Agendamento e cancelamento de reservas
- Aprovação/recusa para gestores
- Notificações automáticas

## Configuração no OpenClaw Dashboard

1. Acesse Skills > Nova Skill
2. Nome: `FutCerto`
3. Webhook URL: `https://seu-dominio.com/webhook/openclaw`
4. Método: POST
5. Headers: `X-API-Key: sua-chave`

## Palavras-chave de Ativação

- `quadra`, `reserva`, `agendar`, `futebol`, `futsal`, `society`
- `cancelar reserva`, `minhas reservas`
- `aprovar`, `recusar` (exclusivo para gestores)

## Intenções Mapeadas

| Intenção | Exemplos |
|----------|----------|
| buscar_quadra | \"quero reservar uma quadra\", \"tem quadra de futsal?\" |
| fazer_reserva | \"reservar quadra X para sábado 10h\" |
| ver_reservas | \"minhas reservas\", \"o que tenho marcado\" |
| cancelar_reserva | \"cancelar reserva FC-1234\" |
| aprovar_reserva | \"aprovar FC-1234\" |
| recusar_reserva | \"recusar FC-1234 horário ocupado\" |
