# Arquitetura

## Decisão de stack

A aplicação é uma SPA React 19 + TypeScript + Vite 8, servida junto de uma API Hono por um único Cloudflare Worker. O build usa `@cloudflare/vite-plugin`; o deploy é uma unidade atômica de Worker + Static Assets. Esta é a abordagem full-stack atualmente recomendada pela Cloudflare para React: [tutorial oficial](https://developers.cloudflare.com/workers/vite-plugin/tutorial/) e [guia React](https://developers.cloudflare.com/workers/framework-guides/web-apps/react/).

- Runtime: Cloudflare Workers, Web APIs e `nodejs_compat`.
- API: Hono, rotas REST modulares, validação Zod.
- Banco: Cloudflare D1 (SQLite), Drizzle ORM no Worker, migrations SQL versionadas.
- Frontend: React Router, Tailwind CSS 4, Lucide, Recharts.
- Offline: service worker para shell/assets e IndexedDB para fila explícita de mutations pendentes.
- Testes: Vitest (domínio/API) e Playwright (fluxos críticos).

Workers Static Assets serve arquivos cacheados sem invocar o Worker; somente `/api/*` usa `run_worker_first`. Rotas SPA retornam `index.html`. A configuração usa `wrangler.jsonc` como fonte de verdade, conforme as [boas práticas atuais](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/).

## Estrutura

```text
src/                    SPA
  app/                  composição, providers e rotas
  components/           UI reutilizável
  features/             auth, dashboard, training, calendar, progress,
                        recovery, science e profile
  lib/                  cliente API, offline queue e utilitários
  styles/               tema global
worker/                 Worker/API
  routes/               controladores Hono por domínio
  middleware/           sessão, CSRF/origin, headers, erros
  services/             casos de uso
  repositories/         toda persistência D1/Drizzle
  db/                    schema e fábrica Drizzle
  data/programs/         seeds estruturados derivados das pesquisas
  domain/                regras puras compartilháveis/testáveis
  validation/            schemas Zod de entrada
shared/                  DTOs/contratos sem dependência de runtime
migrations/              migrations D1
scripts/                 seed configurado por secrets
tests/                   unitários, integração e E2E
docs/                    pesquisa, extração, mapeamento e operação
```

## Modelo e isolamento

O vínculo é `users → athlete_profiles → training_programs`. Sexo e username não decidem programa em código. Toda rota privada resolve a sessão, obtém `userId`/`athleteProfileId` do servidor e passa esse escopo ao service/repository. IDs enviados pelo cliente nunca substituem o escopo autenticado. Consultas de treino/log/medida usam joins ou filtros compostos pelo perfil autenticado; acesso cruzado resulta em 404 para não revelar existência.

D1 contém usuários, sessões, perfis, programas/blocos/dias, exercícios/prescrições/cardio, sessões/logs, medidas, estado do programa, overrides, check-ins e atividades extras. `athlete_program_assignments` define a vigência temporal de cada versão: o calendário resolve a versão pela data, enquanto uma sessão já criada continua ligada ao seu `training_day_id` histórico. `exercise_id` é canônico e mantém cargas entre versões; `exercise_prescription_id` preserva a prescrição exata da sessão. Índices seguem os acessos principais (`user_id`, perfil+data, sessão+exercício, exercício+data). Foreign keys e `CHECK`s preservam enumerações/faixas. Seeds têm IDs determinísticos e `ON CONFLICT`, portanto são idempotentes.

Trocas de exercício podem ser locais ou persistentes. `exercise_substitution_preferences` guarda a escolha para exposições futuras, e `workout_exercise_customizations` materializa a escolha por sessão sem reescrever programa, sessão concluída ou histórico.

Mutations sensíveis carregam `version`; updates usam `WHERE id = ? AND version = ?`, incrementam versão e retornam 409 se outro dispositivo venceu. Criação de série usa `UNIQUE(exercise_log_id,set_number)` + upsert com versão. Operações compostas usam `D1.batch`, que a [documentação D1](https://developers.cloudflare.com/d1/worker-api/d1-database/) define como transacional.

## Autenticação

- Sem cadastro público.
- Seed autenticado por `SEED_SECRET`, disponível só até as contas/programas existirem; produção deve removê-lo após bootstrap.
- Usernames/senhas iniciais vêm de secrets (`wrangler secret put`), nunca de fonte/config versionada.
- Password hash: PBKDF2-HMAC-SHA-256 via Web Crypto, salt aleatório de 16 bytes e 600.000 iterações; formato autoexplicativo e comparação em tempo constante.
- Sessão: token aleatório de 256 bits no cookie `__Host-gym_session`, somente hash SHA-256 no D1; `HttpOnly`, `Secure` em produção, `SameSite=Strict`, `Path=/`, expiração absoluta, rotação no login e invalidação no logout.
- CSRF: SameSite estrito + verificação server-side de `Origin`/`Sec-Fetch-Site` em métodos mutáveis; API same-origin, sem CORS aberto.
- Login: janela de tentativas persistida no D1 por hash de username+IP, resposta genérica e bloqueio temporário. Nenhuma senha/token é logada.
- Headers: CSP, HSTS em produção, frame deny, nosniff, referrer e permissions policy.

## Fluxo de dados

```text
React view → API client → Hono route → Zod → Service → Repository → Drizzle/D1
     ↑                                                              ↓
     └──────────────── DTO confirmado pelo servidor ─────────────────┘
```

A UI só declara “Sincronizado” depois de 2xx. Mutations sem resposta ficam em IndexedDB com payload, chave de idempotência e versão observada; a UI mostra “Não sincronizado” e permite retry. Conflitos 409 não são sobrescritos automaticamente.

## Programa científico

Os componentes não contêm nomes de exercícios. Seeds em `worker/data/programs` mantêm as versões históricas e as fichas atuais derivadas dos dois PDFs em `new_correct_train/`; validadores asseguram as invariantes e decisões de transcrição descritas em `docs/RESEARCH_MAPPING.md`. Sugestão de progressão e recuperação são funções puras parametrizadas pela política do programa. A aplicação sugere e pede confirmação; jamais reescreve prescrição ou carga automaticamente.

A geração opcional por IA existe somente no planejamento pessoal. O Worker envia um contexto mínimo ao endpoint Chat Completions da DeepSeek, solicita JSON, limita tamanho/tempo da resposta e valida o objeto integralmente com Zod. O modelo não recebe ferramentas ou acesso ao D1. A resposta preenche o construtor editável já existente; apenas uma segunda ação explícita do usuário cria o ciclo pelo mesmo repositório manual. A tabela `ai_workout_generations` registra somente metadados operacionais e tokens para controle de custo, nunca o pedido ou o rascunho.

## Observabilidade e erros

O Worker gera um `requestId`, registra JSON estruturado com método, rota, status, duração e erro sanitizado. Não registra bodies, credenciais, tokens, notas pessoais ou medidas. Erros esperados retornam código e mensagem segura; inesperados retornam 500 genérico. Logs/traces estão habilitados no Wrangler com amostragem configurada.
