# Ativação das fichas de `new_correct_train`

## Resultado

- Masculino: `program:male-2026:2026.1` → `program:male-2026:2026.2`.
- Feminino: `program:female-2026:2026.2` → `program:female-2026:2026.3`.
- Female V1 e V2 e Male V1 permanecem no banco como versões históricas.

## Banco de dados

Não foi necessária uma migration nova. A migration `0007_female_program_v2_versioning.sql`, apesar do nome histórico, já fornece o versionamento genérico usado pelos dois perfis:

- vigência em `athlete_program_assignments`;
- vínculo de sessão à prescrição exata;
- exercício canônico para continuidade de cargas;
- preferências persistentes de substituição.

A mudança é aplicada pelo seed idempotente. Em uma instalação nova, as versões históricas recebem períodos fechados e a versão atual começa na data da execução. Em uma instalação existente, atribuições já gravadas não são reescritas; a atribuição aberta anterior é encerrada antes da nova ativação.

## Ordem de publicação

1. Garantir que a migration `0007` já está aplicada no ambiente.
2. Fazer deploy do Worker/SPA contendo os novos seeds.
3. Executar o seed no ambiente desejado.
4. Conferir `athlete_profiles.current_program_id` para os IDs atuais acima.
5. Validar uma sessão histórica e uma sessão futura de cada perfil.

O seed não deve ser usado para transportar dados de treino entre bancos. Ele apenas cria/atualiza a estrutura científica e as contas configuradas; sessões e medições permanecem no D1 do próprio ambiente.
