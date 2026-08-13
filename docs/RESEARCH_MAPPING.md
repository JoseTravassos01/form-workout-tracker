# Mapeamento pesquisa → aplicação

Este é o contrato de rastreabilidade entre as duas fontes históricas e tudo que o produto pode prescrever, sugerir ou explicar. A extração de cada linha de treino está em `PROGRAM_EXTRACTION.md`; os documentos integrais estão em `docs/research/` e os PDFs originais em `pesquisas/`.

## Identidade e isolamento

| Entidade/experiência | Fonte | Regra de implementação |
|---|---|---|
| Programa masculino | Pesquisa masculina, título e contexto inicial; seções “Estratégia anual” e “Treinos completos” | `training_program` versionado associado ao `athlete_profile`; nenhuma decisão consulta username/sexo |
| Programa feminino | Pesquisa feminina, §§1–8 | Programa independente associado por FK; nunca reutiliza prescrição masculina |
| Perfil masculino | Pesquisa masculina: 1,90 m, 96 kg, retorno após ~1 ano; prioridades panturrilha/abdômen | Altura/peso inicial podem ser seedados como fatos da pesquisa; nome/data/credencial vêm de secret/configuração |
| Perfil feminino | Pesquisa feminina §1: dados antropométricos não informados | Campos desconhecidos nulos; não inventar carga, calorias, altura/peso ou metas |
| Tema individual | Requisito do produto, não pesquisa | `theme_key`/`accent_color` pertencem ao perfil e não mudam o conteúdo do programa |

## Calendário e blocos

| O que a UI exibe | Masculino | Feminino | Persistência/derivação |
|---|---|---|---|
| 4 blocos anuais | Readaptação; Acumulação; Especialização; Consolidação | Base técnica/volume moderado; Hipertrofia progressiva; Especialização glúteos/pernas; Consolidação/alta qualidade | `training_blocks`; 13 semanas por bloco é convenção documentada por falta de distribuição exata da semana 52 |
| Semana/dia atual | Pesquisa define meses e dias da semana, não data civil inicial | Idem | `program_start_date` + timezone do atleta + eventual `program_state` manual; função pura `calculateCurrentWeek` |
| Divisão | Seg Upper A; ter Lower A; qua Upper B; sex Lower B | Seg inferiores A; ter superior; qua inferiores B; sex inferiores C | `training_days` por bloco, nunca JSX hardcoded |
| Cardio | Qui/sáb/dom, doses por fase | Qui/sáb/dom, doses e alternativa HIIT por fase | `cardio_prescriptions`; aparece como item de calendário e gera log próprio |
| Reagendamento | Pesquisa não redefine o programa | Pesquisa não redefine o programa | `calendar_overrides` cria exceção sem alterar `training_days`; `resolveScheduledWorkout` prioriza override válido |
| Perdido/descanso/extra | Operação de acompanhamento, não prescrição científica | Igual | Status/log separado; não altera seed nem progressão anual |

## Treinos e exercícios

Cada exercício, ordem, série, faixa de reps, faixa/direção de RIR, descanso, músculo e nota mostrados vem das tabelas de “Treinos completos” e está enumerado em `PROGRAM_EXTRACTION.md`.

| Superfície | Mapeamento |
|---|---|
| Dashboard “Hoje” | Resolve o dia semanal do bloco do perfil autenticado; nome e contagem vêm de `training_days` + `exercise_prescriptions`; duração só aparece quando a pesquisa informa ou quando houver histórico real suficiente claramente rotulado como estimativa observada |
| Semana atual | Une quatro dias de força, três itens de cardio/recuperação e logs/overrides; não cria sessão extra |
| Treino de hoje | Renderiza prescrições ordenadas do banco. Inputs registram `load_kg`, reps, RIR real e conclusão sem modificar a prescrição |
| Última vez/histórico | Consulta somente logs anteriores do mesmo atleta + exercício; não usa valores hipotéticos das pesquisas |
| Cronômetro | Usa `rest_seconds_min/max` extraído. Exibe a faixa; início automático usa o mínimo como convenção operacional explícita e permite +30/pular/pausar |
| Concluir exercício/treino | Estado operacional calculado por logs; não é regra de treinamento. Conclusão exige persistência confirmada |
| Histórico/gráficos | Carga, reps, volume e datas são dados reais do usuário; notas técnicas e faixas vêm da prescrição/fonte |

### Invariantes femininas verificáveis

Em todos os blocos há exatamente uma sessão superior, com exatamente seis prescrições: duas marcadas `back`, duas `shoulders`, uma `triceps`, uma `biceps`; nenhuma `chest`. Há três sessões inferiores (segunda, quarta, sexta). Um validador de seed e testes impedem qualquer divergência.

### Invariantes masculinas verificáveis

Há exatamente quatro sessões Upper/Lower nos dias fixos; panturrilhas aparecem quatro vezes por semana na ficha completa de cada bloco e o volume direto cruza 11/14/15/16; abdômen progride 6/10/10/10 séries diretas conforme a tabela de volume da pesquisa.

## Progressão

| Regra exibida/sugerida | Fonte masculina | Fonte feminina | Comportamento do software |
|---|---|---|---|
| Dupla progressão | “Seu sistema de progressão principal” | §13 | Função pura recebe prescrição + última sessão comparável; nunca usa IA |
| Aumentar carga | Todas as séries no topo, RIR/técnica corretos; menor incremento, ~2–5% | Topo em todas; ~2,5–5% pernas/compostos, menor incremento isoladores | Retorna `increase_load` com faixa/texto; usuário confirma carga. Técnica deve ser confirmada; sem confirmação não sugere aumento |
| Manter carga | Exemplo 12/11/10; uma sessão ruim não estagnação | Performance estável/subindo, buscar +1 rep | Retorna `hold_and_add_reps` |
| Queda | Investigar sono/alimentação/ordem/descanso/fadiga; ≥2 exposições importam | Queda ≥2 sessões + sinais de fadiga | Retorna `hold_and_review_recovery`; nunca diagnostica |
| Adicionar séries | Somente após ~2–3 semanas e cinco critérios | Só prioritários após ~4–6 semanas e recuperação boa | Apenas recomendação textual/checklist; não altera seed/prescrição automaticamente |
| Trocar exercício | Dor recorrente, estagnação prolongada, anatomia/equipamento, melhor estímulo/fadiga | Dor persistente, incompatibilidade, padronização, equipamento, estagnação | Sinaliza decisão; não substitui sozinho |

Ambiguidade feminina preservada: a narrativa diz “todas ou quase todas”, mas o fluxograma/exemplo usa todas. A regra automatizada conservadora exige todas; “quase todas” requer confirmação humana e não gera aumento automático.

## Recuperação e deload

| Estado/ação | Masculino | Feminino |
|---|---|---|
| Verde | Performance estável/melhor e recuperado | Reps/carga subindo, sono normal, DOMS resolvida, sem dor articular |
| Amarelo | Sessão ruim isolada: não mudar; recuperação local ruim: manter carga/reduzir 1–2 séries | 1–2 sinais leves ou treino ruim isolado: manter, não adicionar série, +1 RIR temporário |
| Vermelho | ≥2 exposições, sem explicação: −20–30%; fadiga sistêmica: deload | ≥2 quedas + múltiplos sinais: reduzir volume/deload 5–7 dias |
| Gatilho deload | ≥2 sinais persistentes listados na pesquisa | Queda objetiva ≥2 sessões + ≥2 sinais listados |
| Protocolo | Séries 40–60%; carga 90–95%/longe da falha; RIR 4–5; cardio −20–30%; 4 sessões curtas possíveis | Séries −~50%; carga 85–90% ou menor; RIR 4–5; retirar HIIT; manter exercícios/dias |

O check-in pergunta somente pelos sinais enumerados nas pesquisas: performance, sono, DOMS, dor articular, motivação, sensação de carga/fadiga e perda inesperada de RIR. `evaluateRecoveryStatus` recebe também dados objetivos de duas sessões quando exigidos. Mensagens usam “sinais compatíveis com fadiga acumulada” e “considere deload”; nunca “overtraining” nem diagnóstico.

## Cardio

| Programa/fase | Prescrição de fonte | UI/log |
|---|---|---|
| Masculino M1 | Qui 30–35 RPE 3–4; sáb 35–45 RPE 3–4; dom 20–40 RPE 2–3; sem HIIT | Modalidade, faixa de duração, RPE, objetivo; registra duração/modalidade/RPE real |
| Masculino M2 | 35–45; 40–50; 30–45 nas mesmas intensidades | Idem |
| Masculino M3–M4 | Qui 35–50; sáb 45–60; dom caminhada 30–45 ou protocolo opcional de bike | Alternativa só aparece como opcional e condicionada à performance normal |
| Feminino todos | Qui 30–40 bike/elíptico RPE 3–4; sáb 30–45 caminhada inclinada/bike RPE 3–4; dom caminhada 40–60 RPE 2–3 | Idem |
| Feminino F3–F4 | Sábado pode substituir parte por 6×1 forte/2 leve, máximo 1×/sem, se recuperação muito boa | HIIT opt-in; alerta para remover primeiro se pernas pesadas/performance cair |

Nenhum programa calcula FC com `220 − idade`, pois as pesquisas explicitamente proíbem inventar idade/FC-alvo. “Zone 2” é operacionalizado por RPE/teste da fala conforme a fonte.

## Peso, medidas e progresso

| Recurso | Masculino | Feminino | Cálculo |
|---|---|---|---|
| Peso | Idealmente diário, média móvel 7 dias | 3–7 manhãs/sem, média semanal | `calculateWeeklyWeightAverage`; nunca tratar uma medição isolada como tendência |
| Cintura | Semanal | Cada 4 semanas | Frequência recomendada por programa |
| Quadril | Semanal/quinzenal | Cada 4 semanas (quadril/glúteos) | Mesmo ponto/condição |
| Braço/coxa/panturrilha | 3–4 semanas | Coxa/panturrilha 4 semanas; braço 6–8 | Histórico e gráfico, sem meta inventada |
| Gordura | Tendência, bioimpedância não absoluta | 8–12 semanas, mesmo método | Campo opcional, rotulado estimativa |
| Strength | Carga/reps/RIR toda sessão | Igual | Melhor carga, reps, volume e tendência vêm apenas de logs reais |

## Base científica

`/app/science` usa resumos curtos dos seguintes trechos, mantendo a fonte por programa:

- Volume/frequência: resumos executivos e seções de volume.
- RIR/falha: tabelas iniciais + regras globais/progressão.
- Descanso/ROM: regras gerais e observações de exercício.
- Progressão: seção masculina “Seu sistema de progressão principal” e feminina §13.
- Cardio: seções específicas de cardio concorrente.
- Deload: seções masculinas/femininas de deload.
- Panturrilhas/abdômen: estratégias específicas de cada pesquisa.
- Glúteos/posteriores e ciclo menstrual: somente pesquisa feminina.
- Recomposição, gordura localizada e memória muscular: somente pesquisa masculina.

Referências clicáveis são importadas das listas finais dos documentos (PMID/DOI/URL). A aplicação declara: “Programa criado a partir de pesquisa científica realizada em 2026.” Não reproduz nem inventa citação ausente.

## Elementos de produto sem alegação científica

Login, cookies, PWA, retry offline, calendário visual, streak, toasts, gráficos, tema, navegação, versionamento otimista e status de sincronização são infraestrutura/UX. Eles podem organizar e registrar o programa, mas não são apresentados como recomendações científicas.

## Checklist obrigatório de validação seed × fonte

1. Quantidade de blocos = 4 por programa.
2. Dias de musculação = seg/ter/qua/sex em todos os blocos.
3. Todos os exercícios e ordens batem com `PROGRAM_EXTRACTION.md`.
4. Séries, reps, RIR e descanso batem linha a linha.
5. Feminino superior = exatamente 6 e distribuição 2/2/1/1 em todos os blocos.
6. Cardios e alternativas condicionais batem por bloco.
7. Protocolos de progressão/deload permanecem separados por programa.
8. Slots ambíguos/individualizados continuam marcados para confirmação.
9. Nenhuma carga inicial é seedada a partir de exemplos hipotéticos.
10. Nenhuma senha/credencial real existe nos dados versionados.

### Resultado da conferência

Conferência manual concluída em 13/08/2026, comparando os arquivos estruturados
`worker/data/programs/male-program.ts` e
`worker/data/programs/female-program.ts` com a extração linha a linha e, em
seguida, com os dois documentos-fonte. Os dez itens acima foram confirmados.
As invariantes mecânicas (quatro blocos, semanas, dias, faixas e composição do
superior feminino) também são verificadas por `tests/domain/program.test.ts`.
Não foi encontrada divergência de exercício, ordem, séries, repetições, RIR,
descanso ou cardio. As decisões que a fonte deixa abertas permanecem rotuladas
como ambiguidade/alternativa dependente de confirmação humana; não foram
convertidas em prescrição automática.
