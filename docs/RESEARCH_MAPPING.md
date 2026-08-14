# Mapeamento das fichas atuais

Este documento registra como os dois PDFs de `new_correct_train/` chegam ao banco e à interface. As pesquisas em `pesquisas/` e as transcrições em `docs/research/treino-*.md` continuam preservadas como fontes das versões históricas.

## Versões ativas

| Perfil | Fonte atual | Versão | Versões preservadas |
|---|---|---|---|
| Feminino | `new_correct_train/Programa de Treino Glúteo Médio.pdf` | `female-2026:2026.3` | `2026.1` e `2026.2` |
| Masculino | `new_correct_train/Programa Anual de Hipertrofia e Recomposição.pdf` | `male-2026:2026.2` | `2026.1` |

O seed cria IDs determinísticos e usa `ON CONFLICT`, por isso pode ser repetido. Ele ativa apenas a versão mais nova de cada perfil e não apaga programas, sessões, séries, cargas, medidas ou calendário anteriores.

## Preservação do histórico

`athlete_program_assignments` determina a versão válida por data. Cada sessão continua vinculada ao `training_day_id` e ao `exercise_prescription_id` usados quando foi criada. O `exercise_id` permanece canônico entre versões, de modo que o histórico de um exercício compartilhado — por exemplo Hip Thrust, Hack Squat ou Cadeira Abdutora — continua reunido.

Trocas persistentes ficam em `exercise_substitution_preferences` e personalizações da sessão em `workout_exercise_customizations`. Nenhuma delas reescreve a ficha-base nem uma sessão antiga.

## Programa feminino V3

Divisão semanal do PDF:

| Dia | Sessão |
|---|---|
| Segunda | Lower A — Glúteo Médio + Glúteo Máximo |
| Terça | Upper — Manutenção de Superiores |
| Quarta | Lower B — Quadríceps + Glúteo Médio |
| Quinta | Descanso total / recuperação ativa |
| Sexta | Lower C — Posteriores + Glúteo Máximo |
| Sábado | Especialização curta — Glúteo Médio + Panturrilha + Core |
| Domingo | Descanso total |

O superior possui exatamente seis exercícios: dois de costas, dois de ombros, um de tríceps e um de bíceps, sem peitoral. O trabalho direto de glúteo médio ocorre somente segunda, quarta e sábado. O contador não inclui Búlgaro, prancha lateral ou outros estímulos secundários.

Volume direto adotado por bloco: `11 / 13 / 15 / 12` séries semanais.

### Decisão sobre divergências internas do PDF feminino

O documento contém tabelas cuja soma literal criaria quatro exposições diretas e volumes superiores ao próprio resumo anual. Para não inventar volume nem contrariar a estrutura declarada, a implementação trata como autoridade:

1. o resumo anual de `11 / 13 / 15 / 12` séries;
2. a regra textual de três exposições diretas por semana;
3. a distribuição segunda, quarta e sábado.

Sexta mantém posteriores e glúteo máximo, sem criar uma quarta exposição direta. Essa resolução está explícita no seed e nos testes.

## Programa masculino V2

Divisão semanal do PDF:

| Dia | Sessão |
|---|---|
| Segunda | Upper Body A — Peitoral + Dorsais |
| Terça | Lower Body A — Quadríceps + Posteriores |
| Quarta | Push B — Peitoral + Deltoides + Tríceps |
| Quinta | Descanso obrigatório da musculação + Zone 2 |
| Sexta | Pull B — Costas + Bíceps |
| Sábado | Legs B — Posteriores + Glúteos + Quadríceps |
| Domingo | Especialização curta — Panturrilha + Abdômen + Zone 2 |

Cada bloco transcreve sua própria tabela de exercícios, séries, repetições, RIR e descanso. A ficha detalhada totaliza 16 séries semanais de panturrilha e 12 de abdômen. O resumo narrativo do PDF menciona 16 séries de abdômen, mas as três prescrições detalhadas somam 12; a aplicação usa as fichas executáveis, e não completa quatro séries sem uma prescrição correspondente.

## Progressão e recuperação

- A progressão usa faixa de repetições, RIR, técnica confirmada e desempenho anterior.
- Atingir o topo em todas as séries gera apenas a mensagem para considerar aumento de carga.
- A carga nunca é aumentada automaticamente.
- Uma sessão isolada abaixo do esperado não muda a ficha.
- Deload e redução de volume permanecem recomendações orientadas pelos sinais previstos no programa.
- O cronômetro usa exatamente o descanso gravado na prescrição.

## Calendário

O calendário é derivado de `training_days`, `cardio_prescriptions`, atribuições temporais e reagendamentos; os nomes não ficam fixos no JSX. Em telas pequenas, a visão mensal mostra uma grade compacta sem rolagem horizontal e uma agenda legível do dia selecionado. A visão semanal usa cartões verticais.

## Invariantes testadas

1. Todas as versões antigas continuam válidas e seedáveis.
2. Os aliases atuais apontam para Female V3 e Male V2.
3. O seed repetido não duplica entidades.
4. O histórico V1 continua consultável após ativar versões novas.
5. Novas sessões usam a versão atual correta para cada perfil.
6. O superior feminino tem seis exercícios e nenhum peitoral.
7. Glúteo médio direto aparece em três dias e soma `11 / 13 / 15 / 12`.
8. Quinta-feira não contém musculação pesada nos programas atuais.
9. A progressão não altera carga automaticamente.
10. Nenhuma migration contém `DROP`, `DELETE` ou `TRUNCATE`.
