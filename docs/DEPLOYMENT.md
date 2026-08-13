# Deploy no Cloudflare Workers

O projeto usa dois ambientes completamente separados:

| Branch | Worker | Banco D1 | Comando de deploy |
|---|---|---|---|
| `main` | `form-workout-tracker` | `form-workout-tracker-prod-db` | `npm run deploy` |
| `dev` | `form-workout-tracker-dev` | `form-workout-tracker-dev-db` | `npm run deploy:dev` |

O fluxo esperado e `dev` -> pull request -> `main`. Um push em `dev` atualiza apenas o ambiente de desenvolvimento. O merge na `main` atualiza producao.

## Migracoes

Execute as migrations antes do primeiro deploy e sempre que uma nova migration for adicionada:

```powershell
npm run db:migrate:dev
npm run db:migrate:remote
```

Migrations devem ser testadas primeiro em `dev`. Antes de uma migration destrutiva em producao, exporte ou faça backup do D1.

## Cloudflare Builds

A conexao inicial com o GitHub exige autorizacao interativa no painel da Cloudflare. Em **Workers & Pages**, conecte o mesmo repositorio a cada Worker usando estas configuracoes:

### Producao

- Worker: `form-workout-tracker`
- Repositorio: `JoseTravassos01/form-workout-tracker`
- Branch de producao: `main`
- Build command: `npm run check:ci`
- Deploy command: `npm run deploy`
- Non-production branch builds: desativado

### Desenvolvimento

- Worker: `form-workout-tracker-dev`
- Repositorio: `JoseTravassos01/form-workout-tracker`
- Branch de producao: `dev`
- Build command: `npm run check:ci`
- Deploy command: `npm run deploy:dev`
- Non-production branch builds: desativado

O nome de cada Worker no painel deve coincidir com o `name` correspondente em `wrangler.jsonc`.

## Regra de branches

- trabalhe e envie commits para `dev`;
- abra um pull request de `dev` para `main`;
- faca o merge somente depois das verificacoes passarem;
- nunca faça merge de `main` para `dev` com a intencao de publicar producao: quem publica producao e a `main`.

Os arquivos `.dev.vars` e `.env*` nao devem ser commitados. Secrets de bootstrap devem ser cadastrados separadamente em cada Worker e removidos depois do seed, conforme o README.
