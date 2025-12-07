CONTEXTO DO PROJETO

Você é um agente de código trabalhando neste repositório para construir uma dashboard interna de monitoramento de influenciadores políticos.

- Uso interno (MBL), sem SEO, sem acesso público.
- O usuário faz login e cai em um Dashboard Geral com visão agregada de todos os influenciadores.
- Depois pode navegar por Estado → Município → Influenciador.
- Há uma tela de Relatórios com cards 1:1 (pensados em 1080x1080), mostrando desempenho das últimas 4 semanas, exportação em Excel e botão de compartilhamento em PNG.
- Dados vêm de uma API externa (Apify), processados por um backend Node.js e salvos em PostgreSQL.

O projeto será desenvolvido via vibecoding no Cursor com GPT Codex. Mantenha o código simples, limpo e profissional.

STACK E DECISÕES FIXAS (NÃO MUDAR SEM SER PEDIDO)

Frontend:
- React.
- Vite como build tool.
- Tailwind CSS para estilização.
- ApexCharts (via react-apexcharts) para gráficos.
- Functional components + Hooks (não usar class components).

Backend:
- Node.js.
- Express (ou framework HTTP simples).
- Autenticação usando Auth.js/NextAuth ou solução equivalente:
- Login por email + senha.
- Sessão via cookies HTTP-only.
- Integração externa via API Apify.

Banco:
- PostgreSQL (único SGBD).
- Usar ORM (recomendado: Prisma). Se não, usar Knex ou queries bem organizadas.

Plataformas suportadas no MVP:
- Instagram.
- X (Twitter).
- YouTube.
- Kwai.
- TikTok.

Infra:
- Tudo em Docker, orquestrado por docker-compose.
- Caddy na VPS fará reverse proxy e TLS (fora deste repo).

Não trocar React por Next, nem PostgreSQL por outro banco, nem ApexCharts por outra lib sem instrução explícita do usuário.

ESTRUTURA RECOMENDADA DO REPOSITÓRIO

Raiz do projeto (sugestão):

frontend/ – React + Vite + Tailwind + ApexCharts
backend/ – Node + Express + ORM + Auth
docker/ – Dockerfiles e scripts auxiliares (opcional)
docker-compose.yml
.env.example
README.md

Frontend (src/):
- components/
- pages/ ou routes/
- layouts/
- hooks/
- lib/

Separar:
- Layout geral (com sidebar).
- Páginas (Dashboard Geral, Relatórios, Detalhe de influenciador).

Backend (src/):
- routes/
- controllers/
- services/ (Apify, lógica de domínio)
- repositories/
- middlewares/
- config/ (db, auth, env, etc.)

Rotas REST por recurso:
- /auth
- /influencers
- /metrics
- /geo
- /reports

ESTILO DE CÓDIGO E BOAS PRÁTICAS

Geral:
- Preferir TypeScript. Se usar JavaScript, manter padrão consistente.
- Usar ESLint + Prettier.
- Nomes claros para variáveis, funções e arquivos.
- Comentários curtos, em inglês.
- Textos da interface em português (Brasil).

Frontend:
- Sempre functional components + Hooks.
- Layout: sidebar fixa à esquerda, área principal à direita.
- Tailwind:
- Configurar tokens básicos no tailwind.config (cores, espaçamentos, tipografia).
- Evitar classes gigantescas; extrair para componentes quando necessário.
- ApexCharts:
- Criar componentes dedicados para cada gráfico (ex.: TotalFollowersChart, TopInfluencersChart, PlatformDistributionChart, InfluencerWeeklySparkline).
- Separar configuração (options/series) da lógica de dados.

Backend:
- Padrão Rota → Controller → Service → Repository.
- Validar entradas (ids, filtros, datas).
- Erros em JSON consistente, por exemplo:

{ "error": true, "message": "Descrição clara do erro", "details": { "field": "explicação opcional" } }

MODELO DE DADOS (ALTO NÍVEL)

Entidades principais:

User:
- id
- name
- email
- password_hash
- role
- created_at
- updated_at

Influencer:
- id
- name
- avatar_url (URL da foto; no frontend usar avatarUrl)
- state (UF)
- city
- notes
- created_at
- updated_at

SocialProfile:
- id
- influencer_id
- platform: “instagram” | “x” | “youtube” | “kwai” | “tiktok”
- handle
- url
- external_id (id/slug usado pela Apify)
- created_at

MetricDaily (nome sugestão):
- id
- social_profile_id
- date
- followers_count
- posts_count
- created_at

SyncLog:
- id
- social_profile_id (opcional)
- started_at
- finished_at
- status: “success” | “error”
- error_message (nullable)

Boas práticas:
- Não duplicar soma de seguidores no banco; calcular no service.
- Índice em MetricDaily: (social_profile_id, date).
- Criar um tipo central para plataformas, por exemplo:

type Platform = "instagram" | "x" | "youtube" | "kwai" | "tiktok"

AUTENTICAÇÃO E SEGURANÇA

- Login por email + senha.
- Senhas:
- Sempre com hash (bcrypt ou similar).
- Nunca armazenar em texto plano.
- Sessão:
- Cookies HttpOnly.
- Secure.
- SameSite Lax ou Strict, conforme necessário.
- Segredos (tokens, senhas de banco, etc.):
- Nunca commitar.
- Sempre via variáveis de ambiente (process.env).
- Manter .env.example com o nome das variáveis usadas.

Logs:
- Logar email, IP, timestamp e status (sucesso/erro) no login.
- Nunca logar senhas ou tokens.

INTEGRAÇÃO COM APIFY

- Toda a lógica de Apify deve ficar em um service dedicado, por exemplo: backend/src/services/apifyService.ts

Funções típicas:
- fetchProfileMetrics(profile, since?).
- fetchAllProfilesMetrics() para jobs agendados.

- Token Apify sempre via process.env.APIFY_TOKEN (nome ajustável).
- Tratar falhas:
- Tentar retry simples quando fizer sentido.
- Registrar status em SyncLog.
- Propagar erros de forma controlada (sem vazar segredos).

UX DO DASHBOARD (TELAS PRINCIPAIS)

8.1 Tela de Login

- Campos: email, senha.
- Botão “Entrar”.
- Feedback claro em caso de erro (credenciais inválidas).
- Bloquear acesso a qualquer rota protegida sem login.

8.2 Dashboard Geral

Filtros no topo:
- Período: 7 / 30 / 90 dias.
- Plataforma: Todas / Instagram / X / YouTube / Kwai / TikTok.
- Estado (UF).
- Município (filtrado pela UF, opcional).

Conteúdo:
- Cards de KPI:
- Total de influenciadores.
- Total de seguidores agregados.
- Crescimento percentual no período.
- Total de postagens no período.
- Gráficos com ApexCharts:
- Evolução de seguidores totais (linha).
- Top 10 influenciadores por crescimento (barras).
- Distribuição por plataforma (pizza ou barras).
- Tabela:
- Nome, Estado, Município, seguidores totais, posts no período, crescimento de seguidores.
- Clique na linha abre página de detalhe.

8.3 Página de Detalhe do Influenciador

Header:
- Avatar (com fallback).
- Nome.
- Estado e Município.
- Ícones/links para Instagram, X, YouTube, Kwai, TikTok.

KPIs:
- Seguidores totais (somando todas as redes).
- Crescimento de seguidores no período (valor e %).
- Posts no período.
- Média de posts por dia.

Gráficos:
- Evolução de seguidores totais no tempo.
- Posts por dia ou semana.
- Seção ou abas por plataforma com métricas específicas.

Filtros:
- Período (7 / 30 / 90 dias) ajustável sem recarregar a página inteira (usar chamadas à API).

8.4 Tela de Relatórios

Rota sugerida: /reports

Na sidebar:
- Seção “Menu”:
- Dashboard Geral.
- Relatórios.

Filtros no topo da tela de Relatórios:
- Campo de busca por nome de influenciador.
- Dropdown de Estado (UF).
- Dropdown de Município (dependente da UF).

Grid de cards 1:1 (pensados em 1080 x 1080):
- Cada card representa um influenciador e deve conter:
- Avatar (avatarUrl) com fallback.
- Nome do influenciador.
- Gráfico compacto (ApexCharts) das últimas 4 semanas de seguidores:
- Eixo X: semanas (4 pontos).
- Uma série por plataforma ativa (Instagram, X, YouTube, Kwai, TikTok).
- Textos ou badges com a porcentagem de ganho de seguidores desde a semana passada para cada rede.
- A semana começa na segunda-feira.
- Soma total de seguidores (todas as redes) daquele influenciador.

Botão de compartilhamento do card:
- Abaixo de cada card, um botão “Compartilhar” (ou ícone + texto).
- Comportamento:
- No frontend, capturar a área do card e gerar um PNG em alta definição (proporção 1:1, resolvendo algo equivalente a 1080 x 1080).
- Tentar utilizar a Web Share API (navigator.share) para abrir o painel nativo de compartilhamento do dispositivo (mobile/desktop suportado), anexando o PNG como arquivo quando possível.
- Fallback quando navigator.share não estiver disponível ou não aceitar arquivos:
- Iniciar download do PNG para o usuário compartilhar manualmente.
- E/ou abrir o PNG em nova aba/janela para fácil salvamento.

Paginação:
- Se houver muitos influenciadores, paginar a listagem ou usar lazy-loading (ex.: 12 ou 24 cards por página) para não renderizar dezenas de gráficos de uma vez.

Botão “Exportar relatório geral”:
- Na parte superior (por exemplo, canto direito).
- Aciona um endpoint de backend, como: GET /reports/general/export?format=xlsx
- Backend gera arquivo Excel (.xlsx) usando lib apropriada (ex.: exceljs).
- O relatório inclui todos os influenciadores retornados pelos filtros atuais (ou todos, se não houver filtro).
- Colunas mínimas:
- Nome.
- Estado.
- Município.
- Seguidores por rede (Instagram, X, YouTube, Kwai, TikTok).
- Soma total de seguidores.
- Percentual de crescimento na última semana por rede.
- Não incluir avatar/fotos no Excel, apenas dados numéricos/textuais.

Backend para relatórios:
- Centralizar:
- Agrupamento semanal (segunda a domingo).
- Cálculo das últimas 4 semanas para cada perfil/plataforma.
- Cálculo da variação percentual na última semana.
- O frontend deve receber os dados já agregados, prontos para serem usados em cards e exportação.

DOCKER E DEPLOY

- Objetivo: subir tudo com um único comando docker-compose up -d.
- Serviços principais no docker-compose:
- frontend
- backend
- postgres

Regras:
- Backend depende de Postgres (depends_on).
- Usar uma rede interna compartilhada.
- Criar volume para dados do Postgres.
- Expor backend em uma porta previsível (ex.: 3000) e frontend em outra (ex.: 4173 ou 80).

O Caddy será configurado em outra stack, apontando subdomínios para essas portas internas.

ACESSIBILIDADE E QUALIDADE

- Garantir bom contraste e tipografia legível.
- Permitir navegação por teclado na sidebar e nos filtros.
- Evitar poluição visual; foco nas métricas.
- Componentes de UI devem ser testáveis.

COMO O AGENTE DEVE TRABALHAR NO CURSOR

Fazer mudanças incrementais:
- Evitar reescrever arquivos grandes inteiros sem necessidade.
- Focar nas partes pedidas pelo usuário.

Respeitar a estrutura existente:
- Antes de criar novas pastas/arquivos, ver o que já existe.
- Se precisar mover ou renomear, deixar claro em comentários/commits.

Explicar decisões importantes:
- Especialmente mudanças em schema de banco, rotas e contratos de API.

Evitar overengineering no MVP:
- Priorizar:
- Login.
- Dashboard Geral.
- Página de Detalhe do influenciador.
- Tela de Relatórios (cards 1:1, compartilhamento em PNG, exportação Excel).
- Refatorar depois, se necessário.

Não inventar serviços externos:
- Não adicionar novas APIs externas sem pedido explícito.

Se o humano pedir para mudar qualquer decisão estrutural (ORM, ports, layout, etc.), siga a nova instrução mesmo que contrarie este arquivo.

ENCODING
- Manter arquivos em UTF-8 (sem BOM) e evitar salvar textos com caracteres corrompidos.
- Se encontrar strings quebradas (ex.: Ã§, Ã£), normalize o trecho para UTF-8 antes de editar.
- Prefira ASCII/UTF-8 ao colar blocos grandes ou saídas de ferramentas; revise o encoding antes de abrir PRs.