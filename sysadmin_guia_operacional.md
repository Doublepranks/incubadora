# Guia Operacional (Sysadmin) - Incubadora Dashboard

## 1. Subir stack limpa em produção
1) Ajuste `.env` com valores reais: `DATABASE_URL`, `POSTGRES_PASSWORD`, `AUTH_SECRET`, `FRONTEND_URL`, `VITE_API_URL`, `COOKIE_SECURE=true` (HTTPS), `PORT=3000`.
2) Derrube e limpe volumes (perde todos os dados):
   ```sh
   docker compose down -v
   docker volume rm incubadora_pgdata   # se existir
   ```
3) Rebuild do zero e subir:
   ```sh
   docker compose build --no-cache
   docker compose up -d
   ```
4) Aplicar schema e seed:
   ```sh
   docker exec -it incubadora-backend-1 npx prisma migrate deploy
   docker exec -it incubadora-backend-1 npm run prisma:seed
   ```

## 2. Checks rápidos pós-subida
- Health: `curl -i http://localhost:3000/api/health`
- Logs backend: `docker logs incubadora-backend-1 --tail 200`
- Login via API (troque email/senha do seed):
  ```sh
  curl -i -X POST https://api.incubadora.app.br/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"SEED_EMAIL","password":"SEED_SENHA"}'
  ```
  (esperado: status 200 + header Set-Cookie)

## 3. Criar ou atualizar um system_admin manualmente
1) Entrar no container backend:
   ```sh
   docker exec -it incubadora-backend-1 sh
   ```
2) Gerar hash bcrypt da senha desejada (não rehash o hash):
   ```sh
   node -e "const b=require('bcryptjs'); console.log(b.hashSync('SENHA_FORTE',10))"
   ```
3) Fora do container, inserir/atualizar usuário no Postgres (escape os `$`):
   ```sh
   HASH='\$2a\$10\$...cole_o_hash...'
   docker exec -it incubadora-postgres-1 psql -U postgres -d dashboard -c \
   "insert into \"User\" (name,email,role,password_hash) values ('System Admin','sysadmin@local','system_admin','${HASH}')
    on conflict (email) do update set password_hash=excluded.password_hash, name=excluded.name;"
   ```

## 4. Atualizar senha de um usuário existente
1) Gerar novo hash bcrypt (passo 3.2).
2) Atualizar no Postgres escapando `$`:
   ```sh
   HASH='\$2a\$10\$...novo_hash...'
   docker exec -it incubadora-postgres-1 psql -U postgres -d dashboard -c \
   "update \"User\" set password_hash='${HASH}' where email='alvo@dominio.com';"
   ```
3) Validar:
   ```sh
   docker exec -it incubadora-postgres-1 psql -U postgres -d dashboard -c \
   "select email, role, password_hash, length(password_hash) from \"User\" where email='alvo@dominio.com';"
   ```
   (hash deve ter 60 chars e começar com `$2a$` ou `$2b$`)

## 5. Atualizar email de um usuário
```sh
docker exec -it incubadora-postgres-1 psql -U postgres -d dashboard -c \
"update \"User\" set email='novo_email@dominio.com' where email='antigo_email@dominio.com';"
```
Depois do update, faça login com o novo email e a senha existente.

## 6. Variáveis críticas (deve ser consistente em todas as instâncias)
- `DATABASE_URL` e `POSTGRES_PASSWORD`: obrigatórios para conectar ao banco.
- `AUTH_SECRET`: único e igual em todas as instâncias do backend.
- `FRONTEND_URL`: domínio real do front (CORS/cookies).
- `COOKIE_SECURE=true` apenas se estiver servindo via HTTPS (produção).

## 7. Dicas para evitar problemas de login
- Nunca rehash um hash; sempre gere a partir da senha em texto.
- Confirme que só existe um backend ativo e todos usam o mesmo `AUTH_SECRET`.
- Se `COOKIE_SECURE=true`, teste sempre via HTTPS; em HTTP de teste, use `COOKIE_SECURE=false`.
