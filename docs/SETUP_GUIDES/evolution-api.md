# Setup Evolution API

## Pré-requisitos
- Docker e Docker Compose instalados
- Porta 8080 disponível

## Instalação

```bash
docker-compose up -d evolution
```

## Configuração

1. Acesse http://localhost:8080
2. Crie uma instância com o nome definido em `EVOLUTION_INSTANCE_NAME`
3. Escaneie o QR Code com o WhatsApp
4. Configure o webhook: `http://seu-servidor:3000/webhook/evolution`

## Variáveis de Ambiente

```
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=sua-chave-aqui
EVOLUTION_INSTANCE_NAME=futcerto
```
