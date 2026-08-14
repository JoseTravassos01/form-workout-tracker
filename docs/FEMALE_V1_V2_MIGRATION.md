# Migração Female Program V1 → V2

> Documento histórico da transição anterior. A versão feminina atualmente ativa é a V3 (`2026.3`), descrita em `docs/RESEARCH_MAPPING.md` e `docs/PROGRAM_VERSION_MIGRATION_2026_08.md`.

## Versões

- V1: `program:female-2026:2026.1`.
- V2: `program:female-2026:2026.2`.
- O perfil feminino passa a apontar para V2 em `athlete_profiles.current_program_id`.
- O programa masculino permanece `program:male-2026:2026.1` e não é modificado.

## Estratégia de preservação

A migration `0007_female_program_v2_versioning.sql` é aditiva. Ela não remove ou sobrescreve programas, blocos, dias, prescrições, sessões, séries, medidas ou calendário anteriores.

`athlete_program_assignments` registra o período de vigência de cada versão. A atribuição V1 começa na data histórica do programa e termina no dia anterior à ativação da V2. A atribuição V2 começa na primeira execução do seed que a ativa e permanece aberta.

O calendário escolhe a versão pela data consultada:

- datas dentro da vigência V1 usam blocos e dias V1;
- datas a partir da vigência V2 usam blocos e dias V2;
- reagendamentos continuam sendo exceções registradas e conservam a data original.

## Como o histórico continua ligado à versão correta

Cada `workout_session` referencia um `training_day_id`. Esse dia pertence a um bloco, e o bloco pertence a uma versão de `training_programs`. Portanto, uma sessão V1 continua ligada a V1 sem coluna duplicada ou atualização retroativa.

Cada `exercise_log` preserva simultaneamente:

- `exercise_prescription_id`: a prescrição exata e versionada usada naquela sessão;
- `exercise_id`: o exercício canônico usado para agrupar cargas e performances entre versões.

Assim, Hip Thrust, Agachamento Smith, Cadeira Abdutora e outros exercícios reutilizados mantêm o histórico de carga sem criar nomes artificiais como “Hip Thrust V2”. Medidas corporais pertencem ao perfil e não ao programa; nenhuma migração é necessária para preservá-las.

## Seed idempotente

O seed feminino grava V1 como versão histórica e V2 como versão atual usando IDs determinísticos e `ON CONFLICT`. Rodar o seed novamente:

- não duplica programas;
- não duplica blocos;
- não duplica dias;
- não duplica exercícios;
- não duplica prescrições;
- não reabre o período V1;
- não reinicia a semana quando V2 já está ativa.

Na primeira transição real de V1 para V2, `program_state` começa na semana 1/bloco 1 da nova versão. Execuções seguintes do seed preservam o estado já alcançado.

## Séries diretas de glúteo médio

A migration acrescenta `exercise_prescriptions.direct_glute_medius`. Somente os slots de Cadeira Abdutora e Abdução unilateral na polia da V2 recebem `1`. Compostos e movimentos unilaterais permanecem `0`, mesmo quando o glúteo médio aparece como estímulo secundário.

O indicador do dashboard soma:

- denominador: séries prescritas com `direct_glute_medius = 1` no bloco atual;
- numerador: séries concluídas na semana ligadas a essas prescrições.

## Trocas persistentes de exercício

`exercise_substitution_preferences` guarda a escolha canônica por perfil, programa e exercício de origem. A atleta pode selecionar uma recomendação ou digitar outro exercício. Um nome livre cria/reutiliza uma entidade canônica específica do perfil, permitindo que suas cargas também formem histórico.

Ao marcar “Usar nas próximas semanas”:

- a sessão atual recebe uma customização explícita;
- sessões futuras já abertas recebem a preferência somente se não tiverem personalização manual ou séries concluídas;
- sessões criadas depois materializam a preferência automaticamente;
- sessões concluídas e sessões anteriores não são reescritas.

Adicionar séries continua sendo uma customização de sessão. A prescrição científica base não é alterada e o contador de volume planejado usa as séries diretas prescritas, não transforma automaticamente qualquer exercício escolhido em série direta.

## Ordem operacional

1. Aplicar migrations localmente e no ambiente alvo.
2. Executar o seed uma vez no ambiente alvo.
3. Confirmar que o perfil feminino aponta para `2026.2` e que V1 continua presente.
4. Validar calendário em uma data anterior e posterior à vigência V2.
5. Fazer deploy do Worker/SPA após migrations e seed.

O código novo depende das tabelas e colunas da migration 0007; por isso a migration deve chegar ao D1 antes do deploy que usa a V2.
