# FORM — plataforma privada de treino

Aplicação full-stack, mobile-first e Cloudflare-native para acompanhar programas anuais privados de treinamento. O frontend React e a API Hono são publicados como uma única unidade no Cloudflare Workers; os dados persistentes ficam no D1.

Os programas científicos não são gerados por IA. Todo exercício, série, faixa de repetições, RIR, descanso, cardio, progressão, deload e texto científico desses programas é derivado das duas pesquisas versionadas em [`docs/research`](docs/research). A IA é opcional e cria apenas rascunhos de ciclos pessoais, sempre revisados antes de entrar no calendário. A rastreabilidade está em [`docs/RESEARCH_MAPPING.md`](docs/RESEARCH_MAPPING.md) e a extração integral em [`docs/PROGRAM_EXTRACTION.md`](docs/PROGRAM_EXTRACTION.md).

## O que está implementado

- duas contas privadas associadas no banco por `User → AthleteProfile → TrainingProgram`, sem condicionais por username;
- programas masculino e feminino independentes, quatro blocos e 52 semanas;
- dashboard, treino de hoje, semana/calendário, blocos, histórico por exercício, medidas, força, cardio, check-in, ciência e perfil;
- registro rápido de carga/reps/RIR, última sessão, notas, conclusão por série/exercício/treino e temporizador de descanso;
- sugestão determinística de dupla progressão e alerta de deload conforme a pesquisa, sem mudança automática da prescrição;
- calendário mensal/semanal, reagendamento não destrutivo, perdido, descanso e atividade extra;
- PWA com cache do shell, fila IndexedDB para mutations sem resposta, retry explícito e estados “Não sincronizado”/“Sincronizado”;
- autenticação por hash PBKDF2 com salt, sessão opaca em cookie HttpOnly, rate limit persistente, verificação de origem, CSP e isolamento server-side;
- optimistic concurrency, chaves de idempotência, constraints, foreign keys, índices e batches atômicos no D1;
- criação opcional de rascunho mensal/trimestral pela OpenAI, com Structured Output, prévia editável, limite diário e confirmação humana;
- testes unitários, integração no runtime Workers e E2E mobile com os dois perfis.

## Requisitos

- Node.js 22 ou superior;
- npm;
- conta Cloudflare para deploy;
- Wrangler autenticado (`npx wrangler login`) para operações remotas.

As versões de todas as dependências estão fixadas no `package.json` e no lockfile.

## Desenvolvimento local

1. Instale as dependências:

   ```powershell
   npm install
   ```

2. Copie `.dev.vars.example` para `.dev.vars` e substitua todos os exemplos. Esse arquivo é ignorado pelo Git. Use duas senhas longas, únicas e diferentes, gere `SEED_SECRET` com um gerenciador de senhas ou gerador criptográfico e informe `OPENAI_API_KEY` se quiser habilitar o planejador por IA.

   ```powershell
   Copy-Item .dev.vars.example .dev.vars
   ```

   `MALE_PROGRAM_START_DATE` e `FEMALE_PROGRAM_START_DATE` usam `YYYY-MM-DD` e definem a semana 1. São configuração operacional, não uma regra inventada de treino.

3. Crie/aplique o D1 local:

   ```powershell
   npm run db:migrate:local
   ```

4. Inicie o app em um terminal:

   ```powershell
   npm run dev
   ```

5. Com o servidor aberto, execute o seed em outro terminal:

   ```powershell
   npm run db:seed:local
   ```

6. Abra `http://localhost:5173` e use os usernames/senhas configurados em `.dev.vars`.

O seed usa IDs determinísticos e `ON CONFLICT`, portanto pode ser executado novamente sem duplicar programas. Ele não sobrescreve senha de conta já criada.

## Verificações

```powershell
npm run cf-typegen
npm run typecheck
npm run lint
npm test
npm run build
```

O atalho para essa sequência é:

```powershell
npm run check
```

Para o E2E mobile:

```powershell
npm run test:e2e:install
npm run test:e2e
```

O Playwright usa as credenciais de `.dev.vars` localmente; em CI, forneça as mesmas chaves como secrets do job. O teste cobre login masculino, visualização e registro do treino, conclusão, logout, login feminino, bloqueio de acesso cruzado, registro feminino, peso e progresso.

## Criar e publicar o D1

1. Autentique o Wrangler:

   ```powershell
   npx wrangler login
   ```

2. Crie os bancos de produção e desenvolvimento (este repositório já contém os IDs dos bancos provisionados):

   ```powershell
   npx wrangler d1 create form-workout-tracker-prod-db
   npx wrangler d1 create form-workout-tracker-dev-db
   ```

3. Copie os `database_id` retornados para os ambientes correspondentes em `wrangler.jsonc`. Não altere o binding `DB`.

4. Aplique as migrations primeiro em desenvolvimento e depois em produção:

   ```powershell
   npm run db:migrate:dev
   npm run db:migrate:remote
   ```

5. Cadastre temporariamente os secrets usados no bootstrap. Cada comando solicita o valor sem gravá-lo no repositório:

   ```powershell
   npx wrangler secret put SEED_SECRET
   npx wrangler secret put MALE_USERNAME
   npx wrangler secret put MALE_PASSWORD
   npx wrangler secret put MALE_DISPLAY_NAME
   npx wrangler secret put MALE_PROGRAM_START_DATE
   npx wrangler secret put FEMALE_USERNAME
   npx wrangler secret put FEMALE_PASSWORD
   npx wrangler secret put FEMALE_DISPLAY_NAME
   npx wrangler secret put FEMALE_PROGRAM_START_DATE
   ```

6. Faça o deploy:

   ```powershell
   npm run deploy
   ```

7. Execute o seed usando a URL publicada e o mesmo `SEED_SECRET` (o valor permanece apenas no ambiente do terminal):

   ```powershell
   $env:SEED_URL = "https://form-tracker.<seu-subdominio>.workers.dev"
   $env:SEED_SECRET = "<o-mesmo-segredo-configurado-no-worker>"
   npm run db:seed:remote
   Remove-Item Env:SEED_SECRET
   ```

8. Depois de confirmar os dois logins, remova os secrets de bootstrap. A aplicação em operação não precisa deles:

   ```powershell
   npx wrangler secret delete SEED_SECRET
   npx wrangler secret delete MALE_USERNAME
   npx wrangler secret delete MALE_PASSWORD
   npx wrangler secret delete MALE_DISPLAY_NAME
   npx wrangler secret delete MALE_PROGRAM_START_DATE
   npx wrangler secret delete FEMALE_USERNAME
   npx wrangler secret delete FEMALE_PASSWORD
   npx wrangler secret delete FEMALE_DISPLAY_NAME
   npx wrangler secret delete FEMALE_PROGRAM_START_DATE
   ```

`APP_ENV` já está como `production` no Wrangler versionado. Em desenvolvimento, `.dev.vars` o substitui por `development`; assim o cookie local funciona em HTTP, enquanto produção usa `Secure` e o prefixo `__Host-`.

## Scripts

| Script | Função |
|---|---|
| `npm run dev` | Vite + Worker + D1 local |
| `npm run build` | build production do Worker e assets |
| `npm run build:dev` | build do Worker e assets usando o ambiente `dev` |
| `npm run deploy` | build e deploy via Wrangler |
| `npm run deploy:dev` | build e deploy do ambiente isolado de desenvolvimento |
| `npm run db:migrate:local` | aplica migrations no D1 local |
| `npm run db:migrate:remote` | aplica migrations no D1 remoto |
| `npm run db:migrate:dev` | aplica migrations no D1 remoto de desenvolvimento |
| `npm run db:seed:local` | chama o seed protegido no servidor local |
| `npm run db:seed:remote` | chama o seed protegido na URL de produção |
| `npm run test` | regras puras e integração da API no workerd |
| `npm run test:e2e` | fluxo crítico mobile no Chromium |
| `npm run check` | typecheck, lint, unit/integration e build |
| `npm run check:ci` | verificações usadas pelo Cloudflare Builds antes do deploy |
| `npm run check:all` | `check` mais E2E |

## Segurança e operação

- Não faça commit de `.dev.vars`, `.env`, tokens, senhas, dumps D1 ou artefatos de teste.
- Todas as rotas privadas derivam `athleteProfileId` da sessão; IDs do request nunca escolhem o proprietário.
- O navegador recebe o token somente no cookie HttpOnly; o D1 armazena apenas seu hash.
- Um 409 significa conflito de versão. O cliente preserva a mutation pendente para revisão, sem sobrescrever silenciosamente.
- Logs incluem request ID, rota, status e duração, mas não bodies, senhas, tokens, medidas ou notas.
- Faça backup/exportação do D1 antes de migrations futuras e aplique migrations primeiro em um ambiente de teste.
- Para inspecionar produção, use o painel Workers & Pages ou `npx wrangler tail`; nunca acrescente logs de payload para depurar credenciais.

## Documentação técnica

- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md): branches, ambientes isolados e configuração do Cloudflare Builds.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): stack, camadas, banco, auth, concorrência e fluxo de dados.
- [`docs/PROGRAM_EXTRACTION.md`](docs/PROGRAM_EXTRACTION.md): extração detalhada das duas pesquisas.
- [`docs/RESEARCH_MAPPING.md`](docs/RESEARCH_MAPPING.md): pesquisa → seed → regra/API/UI.
- [`docs/AI_WORKOUT_PLANNING.md`](docs/AI_WORKOUT_PLANNING.md): fluxo de IA, dados enviados, limites e configuração.
- [`docs/research/README.md`](docs/research/README.md): proveniência dos Markdown extraídos e PDFs imutáveis.

As ambiguidades estão registradas nesses documentos. Em particular: a pesquisa usa blocos de aproximadamente 12–13 semanas sem distribuir explicitamente a semana 52; a implementação adota quatro blocos de 13 semanas e marca isso como convenção. Alternativas de exercício que dependem de equipamento/anatomia permanecem como seleção humana; o software não escolhe por conta própria.
