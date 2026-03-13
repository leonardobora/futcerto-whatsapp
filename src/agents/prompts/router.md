# Sistema de Prompt - Router

## Função

O Router é responsável por identificar o perfil do usuário e direcionar para o agente correto.

## Lógica de Roteamento

1. Busca o usuário pelo número de telefone no banco de dados
2. Se não existir, cria um novo usuário com perfil `jogador`
3. Direciona para:
   - `GestorAgent` se `profile === 'gestor'` ou `profile === 'admin'`
   - `JogadorAgent` se `profile === 'jogador'`

## Cache de Agentes

Cada usuário mantém seu próprio agente em memória com histórico de conversa.
A chave do cache é: `{phone}:{profile}`

Em produção, substituir o `Map` por Redis para escalar horizontalmente.

## Troca de Perfil

Quando um gestor precisa usar como jogador (ou vice-versa), o cache é invalidado e um novo agente é criado.

## Suporte a Múltiplos Canais

O Router recebe mensagens normalizadas independente do canal de origem:

```typescript
interface IncomingMessage {
  channel: 'evolution' | 'openclaw' | 'tyxter'
  phone: string
  message: string
  raw: unknown
}
```

A resposta é enviada pelo mesmo canal de entrada.
