# Planejamento pessoal com IA

## Escopo

A IA cria somente um rascunho editável para um ciclo pessoal de 4 ou 12 semanas. Ela não altera o programa científico ativo, não grava sessões e não escreve diretamente no D1.

O fluxo é:

1. o usuário descreve objetivo, disponibilidade, preferências e limitações;
2. o Worker reúne o programa atual, as prescrições do bloco atual, exercícios canônicos já conhecidos e um resumo das performances recentes;
3. a API Chat Completions da DeepSeek devolve um objeto JSON, guiado por JSON Schema no prompt e validado pelo servidor com Zod;
4. a interface preenche o construtor existente;
5. o usuário revisa e pode editar tudo;
6. somente o botão **Salvar no calendário** usa a rota normal de criação de ciclo pessoal.

O ciclo continua sendo aditivo: um dia pessoal prevalece no calendário durante o período, mas `athlete_profiles.current_program_id`, os programas científicos e os históricos anteriores permanecem intactos.

## Dados enviados

São enviados à DeepSeek:

- o texto digitado pelo usuário;
- sexo cadastrado no perfil;
- nome, descrição, versão, semana e bloco do programa atual;
- prescrições do bloco atual;
- nomes dos exercícios canônicos já associados ao perfil;
- resumo agregado de carga, repetições e RIR recentes.

Não são enviados nome do usuário, username, medidas corporais, notas de séries, notas pessoais, cookies, IDs internos do perfil ou credenciais.

A aplicação não persiste o pedido nem o rascunho da DeepSeek. O D1 mantém apenas uma auditoria operacional com modelo, duração, tamanho do pedido, status e tokens consumidos. O tratamento dos dados pela provedora segue os termos e a política da DeepSeek.

## Segurança e custo

- A rota exige a sessão privada existente e a mesma proteção de origem/CSRF das demais mutations.
- O modelo não recebe ferramentas nem acesso ao banco.
- A resposta tem limite de tamanho e tempo.
- O formato aceita no máximo sete dias, doze exercícios por dia e oito séries por exercício.
- O servidor aplica limite móvel de 24 horas por perfil. O padrão é 10 gerações e pode ser alterado por `AI_DAILY_GENERATION_LIMIT`.
- Falha, recusa, resposta incompleta ou JSON inválido nunca cria um programa.

## Configuração

`DEEPSEEK_API_KEY` é secret e nunca deve entrar no `wrangler.jsonc` ou no Git. Para desenvolvimento local, coloque a chave somente no `.dev.vars`.

Os valores não secretos são:

- `DEEPSEEK_MODEL`: padrão `deepseek-v4-flash`;
- `AI_DAILY_GENERATION_LIMIT`: padrão `10`.

Em Cloudflare, configure o secret separadamente em desenvolvimento e produção:

```powershell
npx wrangler secret put DEEPSEEK_API_KEY --env dev
npx wrangler secret put DEEPSEEK_API_KEY --env=""
```

Depois aplique a migration `0009_ai_workout_generation_audit.sql` antes do deploy.

## Limitações

O resultado é assistência de planejamento, não diagnóstico ou atendimento médico. A interface exige revisão humana e permite editar todas as prescrições antes de salvar. O histórico de carga só é reutilizado quando o nome gerado corresponde a um exercício canônico conhecido; exercícios realmente novos recebem a identidade pessoal estável já usada pelo construtor manual.
