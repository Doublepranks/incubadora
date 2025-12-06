# Dashboard de Influenciadores — Estrutura do MVP

Repositório organizado em `frontend/` (React + Vite + Tailwind + ApexCharts) e `backend/` (Node + Express + Prisma + PostgreSQL). Uso interno, alinhado ao PRD de dashboard/relatórios para monitoramento de influenciadores.

## Estrutura
- `frontend/`: app Vite atual (mock), rotas `/login`, `/` e `/influencer/:id`, Tailwind e ApexCharts.
- `backend/`: scaffold Express + Prisma, rotas base `/api/health`, schema com `users`, `influencers`, `social_profiles`, `metrics_daily`, `sync_logs`.
- `docker-compose.yml`: serviços `frontend`, `backend` e `postgres` (porta 4173/3000/5432).
- `.env.example`: variáveis necessárias (DB, auth secret, Apify token, flags de cookie).

## Requisitos
- Node 20+ (para execuções locais sem Docker).
- Docker + Docker Compose (para subir stack completa).

## Limpeza de mocks e normalização de Nadson
Se precisar remover os influenciadores de mock (Ana Costa, Bruno Lima, Carla Mendes, Diego Rocha, Elisa Prado) e consolidar apenas um registro do Nadson:
- Script: `backend/scripts/cleanup_demo_data.js`
- O que faz:
  - Remove os 5 mockados acima.
  - Procura entradas cujo nome contenha “nadson” (case-insensitive); mantém a que tiver mais métricas/perfis, remove duplicatas e renomeia para `Nadson Ferreira`, cidade `Moju`, estado `PA`.
- Como rodar (com docker-compose levantado):
  ```bash
  docker exec -i incubadora-backend-1 node scripts/cleanup_demo_data.js
  ```

## Como rodar (Docker)
1) Copie `.env.example` para `.env` e ajuste valores (especialmente `AUTH_SECRET`, `DATABASE_URL`, `COOKIE_SECURE`).  
2) `docker-compose up -d` (sobe Postgres, backend, frontend).  
   - Frontend: http://localhost:4173  
   - Backend: http://localhost:3000/api/health  
3) Após ajustar schema, rode migrações no contêiner ou local: `cd backend && npx prisma migrate dev` (use a mesma `DATABASE_URL`).

## Como rodar local (sem Docker)
### Backend
```bash
cd backend
cp ../.env.example ../.env   # se ainda não existir .env
npm install
npx prisma generate
npm run prisma:seed          # opcional, cria/atualiza admin se SEED_ADMIN_* estiverem setados
npm run dev
```
Backend escuta em `PORT` (padrão 3000).

### Frontend
```bash
cd frontend
npm install
npm run dev -- --host --port 4173
```
Frontend em `http://localhost:4173` (ajuste `VITE_API_URL` conforme backend). O contexto de autenticação chama `/auth/login`, `/auth/me`, `/auth/logout` no backend com cookies (`credentials: include`).

## Integração Apify
- Configure no `.env` do backend:
  - `APIFY_TOKEN=...`
  - `APIFY_ACTOR_ID=...` (ex.: `wsp_usuario/actor-name` ou ID do actor)
  - `ENABLE_SYNC_JOB=true|false` (cron liga/desliga)
  - `SYNC_CRON=0 3 * * MON` (padrão semanal, segunda 03:00 UTC)
- Endpoint manual: `POST /api/sync/run` dispara a coleta e grava em `metrics_daily` + `sync_logs`.
- Job agendado segue o cron acima (desabilite com `ENABLE_SYNC_JOB=false`).

## Próximos passos (fase 1 → 2)
- Implementar autenticação real (email/senha, cookies HttpOnly/Secure).
- Expor rotas `/auth`, `/influencers`, `/metrics`, `/geo`, `/reports` consumindo Prisma.
- Integrar Apify service e rotinas de coleta (jobs diários) populando `metrics_daily` e `sync_logs`.
- Atualizar frontend para consumir backend real (filtros período/plataforma, relatórios 1:1, exportação Excel, compartilhamento PNG). 
