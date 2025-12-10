# Social Metrics Retry Orchestrator

Orquestrador para reprocessar perfis com falha usando atores da Store da Apify.

## Entrada (input.json)
```json
{
  "profiles": [
    { "platform": "instagram", "username": "obrasildecima", "url": null, "attempt": 2, "error_code": "timeout" }
  ],
  "actorIds": {
    "instagram": "apify/instagram-scraper",
    "tiktok": "apify/tiktok-scraper",
    "youtube": "apify/youtube-scraper",
    "x": "apify/twitter-scraper",
    "kwai": "apify/kwai-scraper",
    "generic": null
  },
  "perRequestTimeoutSecs": 120,
  "maxConcurrency": 2,
  "backoffMs": 2000
}
```

## Saída (dataset)
Cada item no dataset segue o formato:
```json
{
  "platform": "instagram",
  "username": "obrasildecima",
  "url": "https://www.instagram.com/obrasildecima/",
  "date": "2025-12-08",
  "followers_count": 1234,
  "posts_count": 56,
  "sync_status": "ok",
  "error_code": null,
  "error_message": null,
  "attempt": 2,
  "runId": "current-run-id",
  "sourceActorId": "apify/instagram-scraper"
}
```
Em caso de falha, `sync_status="error"` e `error_code`/`error_message` preenchidos.

## Observações
- Use `actorIds` para mapear qual ator da Store chamar por plataforma. Deixe `generic` como fallback (ou null para não usar).
- Concentre-se em perfis que falharam no ator principal; defina `attempt` (ex.: 2) na entrada.
- Reduza `maxConcurrency` e use `backoffMs` para minimizar rate limits.
