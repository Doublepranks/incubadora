# Social Metrics Orchestrator - Documentação de Integração

## Visão Geral

O **Social Metrics Orchestrator** é um Actor da Apify que coleta métricas de redes sociais (seguidores, posts) de múltiplas plataformas de forma automatizada. Ele serve como um ponto central de coleta, delegando para actors especializados da Apify Store e executando scraping customizado quando necessário.

---

## Plataformas Suportadas

| Plataforma | Método de Coleta | Actor/Scraper |
|------------|------------------|---------------|
| Instagram | Actor da Store | `apify/instagram-profile-scraper` |
| TikTok | Actor da Store | `apidojo/tiktok-scraper` |
| YouTube | Scraping próprio | Puppeteer customizado |
| X (Twitter) | Actor da Store | `apidojo/twitter-user-scraper` |
| Kwai | Scraping próprio | Puppeteer customizado |

---

## Formato de Entrada (Input)

```json
{
  "profiles": [
    {
      "platform": "instagram",
      "username": "cristiano"
    },
    {
      "platform": "youtube",
      "username": "MrBeast"
    },
    {
      "platform": "tiktok",
      "username": "khaby.lame"
    },
    {
      "platform": "x",
      "username": "elonmusk"
    },
    {
      "platform": "kwai",
      "username": "usuario_kwai"
    }
  ]
}
```

### Campos do Input

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `profiles` | array | Sim | Lista de perfis a coletar |
| `profiles[].platform` | string | Sim | Plataforma: `instagram`, `tiktok`, `youtube`, `x`, `kwai` |
| `profiles[].username` | string | Sim | Nome de usuário (sem @) |
| `profiles[].url` | string | Não | URL completa do perfil (sobrescreve username) |

---

## Formato de Saída (Output)

O Actor gera um **dataset** com um registro por perfil processado:

```json
{
  "platform": "youtube",
  "username": "MrBeast",
  "date": "2025-12-05",
  "followers_count": 327000000,
  "posts_count": 850,
  "sync_status": "ok",
  "error_code": null,
  "error_message": null,
  "attempt": 1,
  "runId": "actor-run-id",
  "sourceActorId": "custom-youtube"
}
```

### Campos do Output

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `platform` | string | Plataforma do perfil |
| `username` | string | Nome de usuário |
| `date` | string | Data da coleta (YYYY-MM-DD) |
| `followers_count` | number \| null | Número de seguidores/inscritos |
| `posts_count` | number \| null | Número de posts/vídeos |
| `sync_status` | string | Status: `ok` ou `error` |
| `error_code` | string \| null | Código categorizado do erro (ex.: `timeout`, `not_found`, `parse_error`, `rate_limit`, `blocked`, `captcha`, `error`) |
| `error_message` | string \| null | Mensagem de erro (se houver) |
| `attempt` | number | Tentativa (1 no orquestrador principal) |
| `runId` | string | ID do run do actor |
| `sourceActorId` | string \| null | Actor da Store ou scraper que gerou o item |

---

## Integração via API

### 1. Executar o Actor

```bash
POST https://api.apify.com/v2/acts/{ACTOR_ID}/runs?token={API_TOKEN}
Content-Type: application/json

{
  "profiles": [
    { "platform": "youtube", "username": "MrBeast" }
  ]
}
```

### 2. Aguardar Conclusão (Polling)

```bash
GET https://api.apify.com/v2/actor-runs/{RUN_ID}?token={API_TOKEN}
```

Resposta quando concluído:
```json
{
  "status": "SUCCEEDED",
  "defaultDatasetId": "abc123..."
}
```

### 3. Obter Resultados do Dataset

```bash
GET https://api.apify.com/v2/datasets/{DATASET_ID}/items?token={API_TOKEN}
```

---

## Integração via Webhook (Recomendado)

Configure um webhook para receber os resultados automaticamente:

### Configurar no Console Apify:
1. Vá em **Actors** → **social-metrics-orchestrator** → **Integrations**
2. Adicione um **Webhook**
3. Configure:
   - **Event**: `RUN_SUCCEEDED`
   - **URL**: `https://seu-backend.com/api/apify/webhook`
   - **Payload template**: (deixe padrão ou customize)

### Payload recebido no webhook:

```json
{
  "eventType": "ACTOR.RUN.SUCCEEDED",
  "eventData": {
    "actorId": "...",
    "actorRunId": "...",
    "defaultDatasetId": "..."
  }
}
```

### Exemplo de Handler no Backend (Node.js):

```typescript
import { ApifyClient } from 'apify-client';

app.post('/api/apify/webhook', async (req, res) => {
  const { eventData } = req.body;
  
  const client = new ApifyClient({ token: process.env.APIFY_TOKEN });
  const dataset = client.dataset(eventData.defaultDatasetId);
  const { items } = await dataset.listItems();
  
  // Salvar no PostgreSQL
  for (const item of items) {
    await db.query(`
      INSERT INTO social_metrics (platform, username, date, followers_count, posts_count, sync_status, error_message)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (platform, username, date) DO UPDATE SET
        followers_count = EXCLUDED.followers_count,
        posts_count = EXCLUDED.posts_count,
        sync_status = EXCLUDED.sync_status,
        error_message = EXCLUDED.error_message
    `, [item.platform, item.username, item.date, item.followers_count, item.posts_count, item.sync_status, item.error_message]);
  }
  
  res.status(200).send('OK');
});
```

---

## Execução Programática (Node.js)

```typescript
import { ApifyClient } from 'apify-client';

const client = new ApifyClient({ token: process.env.APIFY_TOKEN });

async function collectMetrics(profiles: Array<{platform: string, username: string}>) {
  // Executar o actor e aguardar conclusão
  const run = await client.actor('winterly_beech/social-metrics-orchestrator').call({
    profiles
  }, {
    memory: 2048,  // MB de memória
    timeout: 600   // segundos (10 min)
  });
  
  // Buscar resultados
  const { items } = await client.dataset(run.defaultDatasetId).listItems();
  
  return items;
}

// Uso
const results = await collectMetrics([
  { platform: 'youtube', username: 'MrBeast' },
  { platform: 'instagram', username: 'cristiano' }
]);

console.log(results);
```

---

## Agendamento (Scheduling)

Para coletar métricas diariamente:

1. No Console Apify → **Actors** → **social-metrics-orchestrator**
2. Clique em **Schedules** → **Create new**
3. Configure:
   - **Cron**: `0 6 * * *` (todo dia às 6h UTC)
   - **Input**: JSON com a lista de perfis

---

## Limites e Considerações

| Aspecto | Valor/Nota |
|---------|------------|
| **Memória recomendada** | 2048 MB (por causa do Kwai/Puppeteer) |
| **Timeout recomendado** | 600 segundos (10 min) |
| **Custo médio** | ~$0.30 por 100 perfis (pode variar conforme atores da Store) |
| **Rate limits** | Respeita os limits de cada Actor da Store |
| **Kwai** | Mais instável, pode precisar de proxies |
| **Retry** | O backend pode acionar um segundo orquestrador (retry) para erros `timeout`, `rate_limit`, `blocked`, `captcha`, `parse_error`, `error` |

---

## Tratamento de Erros

O Actor **nunca falha completamente**. Erros são registrados por perfil:

```json
{
  "platform": "instagram",
  "username": "perfil_invalido",
  "date": "2025-12-05",
  "followers_count": null,
  "posts_count": null,
  "sync_status": "error",
  "error_message": "Profile not found in actor results"
}
```

**Erros comuns:**
- `Profile not found` - Perfil não existe ou está privado
- `Navigation timed out` - Página não carregou a tempo
- `Could not extract followers` - Estrutura da página mudou

---

## Schema SQL Sugerido

```sql
CREATE TABLE social_metrics (
    id SERIAL PRIMARY KEY,
    platform VARCHAR(20) NOT NULL,
    username VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    followers_count BIGINT,
    posts_count INTEGER,
    sync_status VARCHAR(10) DEFAULT 'ok',
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT unique_profile_date UNIQUE (platform, username, date)
);

CREATE INDEX idx_social_metrics_profile ON social_metrics (platform, username);
CREATE INDEX idx_social_metrics_date ON social_metrics (date);
```

---

## Variáveis de Ambiente Necessárias

| Variável | Descrição |
|----------|-----------|
| `APIFY_TOKEN` | Token de API da Apify (obrigatório para chamar outros actors) |
| `APIFY_ACTOR_ID` | ID do orquestrador principal (usado pelo backend) |
| `APIFY_RETRY_ACTOR_ID` | (Opcional) ID do orquestrador de retry, se habilitado no backend |

---

## Links Úteis

- [Console Apify](https://console.apify.com)
- [Documentação da API Apify](https://docs.apify.com/api/v2)
- [Apify Client (npm)](https://www.npmjs.com/package/apify-client)
