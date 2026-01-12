# Incubadora - Dashboard de Influenciadores

Dashboard interno para monitoramento e análise de influenciadores políticos, integrado com Apify para coleta de dados de múltiplas plataformas (Instagram, X, YouTube, Kwai, TikTok).

## 🚀 Funcionalidades

- **Dashboard Geral**: Visão agregada de KPIs (Seguidores, Posts, Crescimento), gráficos de evolução e distribuição por plataforma/estado/gênero.
- **Relatórios**: Cards 1:1 para cada influenciador com desempenho das últimas 4 semanas, exportáveis como imagem (PNG) para compartilhamento.
- **Rankings**: Geração de rankings semanais e mensais com variação percentual e absoluta.
- **Exportação de Dados**: Exportação geral em Excel (.xlsx).
- **Gestão de Usuários**: Níveis de acesso (Admin Global, Admin Regional, System Admin).

## 🛠️ Stack Tecnológico

- **Frontend**: React, Vite, Tailwind CSS, ApexCharts.
- **Backend**: Node.js, Express, Prisma ORM.
- **Banco de Dados**: PostgreSQL.
- **Infraestrutura**: Docker & Docker Compose.

## 📋 Pré-requisitos

- Docker e Docker Compose instalados.
- Node.js 20+ (apenas se for rodar localmente fora do Docker).

## 🔧 Configuração e Execução

### 1. Configurar Variáveis de Ambiente

Copie o arquivo de exemplo e ajuste as variáveis necessárias:

```bash
cp .env.example .env
```

Principais variáveis no `.env`:

- `DATABASE_URL`: URL de conexão com o PostgreSQL.
- `AUTH_SECRET`: Segredo para assinatura de cookies de sessão.
- `FRONTEND_URL`: URL base do frontend (ex: `http://localhost:4173`).
- `CORS_ALLOWED_ORIGINS`: (Opcional) Lista de origens adicionais permitidas pelo CORS, separadas por vírgula (ex: `http://127.0.0.1:4173`).
- `APIFY_TOKEN`: Token de integração com a Apify (necessário para sincronização de dados).

### 2. Executar com Docker (Recomendado)

Suba toda a stack (Frontend, Backend, Banco de Dados):

```bash
docker compose up -d --build
```

- **Frontend**: [http://localhost:4173](http://localhost:4173)
- **Backend**: [http://localhost:3000](http://localhost:3000)

### 3. Migrações e Seed

Na primeira execução, é necessário criar o esquema do banco e popular com dados iniciais:

```bash
# Executar dentro do container do backend
docker exec -i incubadora-backend-1 npx prisma migrate dev --name init
docker exec -i incubadora-backend-1 npm run prisma:seed
```

> **Nota**: Se estiver usando `distrobox` ou similar, prefixe os comandos docker com o executor do host (ex: `distrobox-host-exec docker ...`).

## 🔑 Credenciais de Acesso

O seed padrão cria os seguintes usuários para testes:

| Papel | Email | Senha |
|-------|-------|-------|
| **Admin Padrão** | `admin@example.com` | `changeme123` |
| **System Admin** | `system@incubadora.com` | `system_admin_secure` |

> ⚠️ **Importante**: Altere estas senhas imediatamente em ambiente de produção.

## 📂 Estrutura do Projeto

```
/
├── frontend/           # Aplicação React (Vite)
│   ├── src/components  # Componentes reutilizáveis
│   ├── src/pages       # Páginas da aplicação (Dashboard, Relatórios, etc.)
│   └── src/context     # Contexto global (Auth, Estado)
├── backend/            # API Node.js (Express)
│   ├── src/controllers # Lógica dos endpoints
│   ├── src/services    # Regras de negócio e integrações (Apify)
│   └── prisma/         # Schema do banco de dados e migrações
└── docker-compose.yml  # Orquestração dos containers
```

## 🤝 Contribuição

1. Para correções em ambiente de desenvolvimento, verifique se a URL de acesso corresponde ao `FRONTEND_URL` ou adicione-a ao `CORS_ALLOWED_ORIGINS`.
2. Mantenha o padrão de código (ESLint + Prettier).
3. Utilize branches para features (`feat/nome-da-feature`) ou correções (`fix/nome-do-bug`).

## 📝 Decisões de Design

### Mapeamento de Séries

Os valores internos do banco de dados (`A2`, `A3`) são mapeados para labels de exibição diferentes na UI:

| Valor no BD | Label na UI  |
|-------------|--------------|
| `A2`        | Série B      |
| `A3`        | Série C      |

**Motivo**: Evitar migração de banco de dados ao renomear categorias. A configuração está centralizada em `frontend/src/components/SeriesBadge.jsx`.

## 📄 Licença

**Proprietário e Confidencial.**
Este projeto é de código fechado (closed source). A redistribuição, cópia ou uso não autorizado é estritamente proibido.
Todos os direitos reservados à Incubadora (2025).
