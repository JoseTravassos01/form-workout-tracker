# Extração integral dos programas

Este documento é a especificação de dados que os seeds e validadores da aplicação devem obedecer. Ele foi extraído dos documentos históricos em `docs/research/treino-homem.md` (PDF original: 28 páginas) e `docs/research/treino-mulher.md` (PDF original: 29 páginas), lidos integralmente em 12 de agosto de 2026.

Convenções: todas as séries abaixo são efetivas, não aquecimentos; `a→b` expressa a progressão de RIR descrita pela pesquisa; `/lado` significa por perna; descanso em segundos é a representação persistida equivalente ao texto da pesquisa. Alternativas ligadas por `/` ou `ou` são preservadas, não resolvidas arbitrariamente pelo software.

## Ambiguidades e limites preservados

1. Os Markdown pedidos não existiam inicialmente. Os dois PDFs em `pesquisas/` foram identificados pelos títulos correspondentes e transcritos mecanicamente em `docs/research/`; os PDFs continuam sendo os históricos imutáveis.
2. Ambos os estudos usam blocos de “aproximadamente 12–13 semanas” e meses 1–3, 4–6, 7–9 e 10–12, sem distribuir inequivocamente a 52ª semana. O seed usa semanas 1–13, 14–26, 27–39 e 40–52 (13 semanas cada), marcado como convenção de calendário do software, não como nova prescrição.
3. Uma faixa de descanso como `2,5–3 min` vira `150–180 s`. Um valor único vira mínimo=máximo. Nenhum cronômetro escolhe silenciosamente um ponto dentro de uma faixa: a UI apresenta a faixa e usa o mínimo como disparo inicial configurável.
4. `3→2 RIR` e `2→1 RIR` descrevem evolução dentro da onda/bloco; a pesquisa não determina um RIR por semana. O dado mantém a faixa/direção, e a UI não inventa interpolação semanal.
5. A pesquisa feminina permite, nos blocos 3–4 e com ótima recuperação, substituir parte do sábado por HIIT opcional. A masculina permite intervalos opcionais no domingo dos blocos avançados. Essas opções são alternativas condicionais e nunca agenda obrigatória.
6. O bloco masculino 4 manda usar os melhores exercícios do log em alguns slots. O seed preserva os slots `Melhor supino do seu log`, `Melhor remada apoiada` e `Hack/agachamento melhor tolerado`; a escolha exige confirmação humana baseada no histórico.
7. Quando a pesquisa traz um nome amplo (`Flexora`, `Tríceps`, `Bíceps`) ou escolha (`máquina ou barra`), o software não presume equipamento/variante não escrito.
8. Duração de treino é informada apenas no bloco feminino 1 (70–85, 45–60, 75–90, 65–80 min). Outros blocos/perfil não recebem estimativa inventada; o campo fica nulo.
9. Não há nomes reais, credenciais, data inicial, idade ou dados corporais completos para os dois perfis. Esses valores são configuração/entrada, não conteúdo de programa.

## Programa masculino

Fonte: `treino-homem.md`. Contexto informado pela pesquisa: homem, 1,90 m, 96 kg, cerca de três anos prévios de musculação, aproximadamente um ano destreinado e uma semana desde o retorno. Prioridades: recomposição, panturrilhas e abdômen. Agenda fixa de musculação: segunda, terça, quarta e sexta.

### Regras globais masculinas

- Split: segunda Upper A, terça Lower A, quarta Upper B, sexta Lower B; cardio/recuperação quinta, sábado e domingo.
- Aquecimento: 5–8 min leves se ajudar; no primeiro composto do padrão, 2–4 aproximações sem fadiga (`muito leve 5–8`, `~50% × 5`, `~70% × 3`, `~85% × 1–2`). Não contam como séries efetivas.
- Técnica: maior ROM sem dor e controlável, descida controlada; carga só progride preservando amplitude e execução.
- Descanso geral: compostos pesados ~150–180 s; máquinas/isoladores 90–120 s. As prescrições específicas prevalecem.
- Falha: não obrigatória; 0–1 RIR reservado principalmente à última série de isoladores seguros, não RDL/hack/supino pesado.
- Readaptação: semanas 1–2, uma série a menos em todo exercício com ≥3 séries, ~3–4 RIR; a partir da semana 3, ficha completa e aproximação gradual de 2 RIR.

### Bloco M1 — Readaptação (meses 1–3; semanas de software 1–13)

Objetivo: recuperar técnica e tolerância a volume; RIR predominante 3–4→2; recomposição moderada.

#### Segunda — Upper A + panturrilha

| # | Exercício | Séries | Reps | RIR | Descanso s | Principal | Observação |
|---|---|---:|---|---|---|---|---|
| 1 | Supino máquina ou barra | 3 | 6–10 | 3→2 | 180 | Peitoral | 3–4 aquec.; escápulas estáveis; ROM confortável; sem rebote |
| 2 | Remada apoiada no peito | 3 | 8–12 | 3→2 | 120–180 | Costas superiores | 2 aquec.; evitar extensão lombar |
| 3 | Supino inclinado halteres | 2 | 8–12 | 3→2 | 120 | Peitoral | 1–2 aquec.; descida profunda se ombro tolerar |
| 4 | Puxada neutra | 2 | 8–12 | 2–3 | 120 | Dorsais | 1 aquec.; alongar dorsais no topo |
| 5 | Elevação lateral no cabo | 2 | 12–20 | 2 | 90 | Deltoide lateral | Sem impulso excessivo |
| 6 | Tríceps polia | 2 | 10–15 | 2 | 90 | Tríceps | Cotovelo estável |
| 7 | Rosca no cabo | 2 | 10–15 | 2 | 90 | Bíceps | Alongamento completo sem deslocar ombro |
| 8 | Panturrilha em pé | 3 | 8–12 | 2 | 120 | Gastrocnêmio/sóleo | 1–2 aquec.; 1–2 s em dorsiflexão profunda; sem quicar |

#### Terça — Lower A + abdômen

| # | Exercício | Séries | Reps | RIR | Descanso s | Principal | Observação |
|---|---|---:|---|---|---|---|---|
| 1 | Hack squat | 3 | 6–10 | 3→2 | 180 | Quadríceps | 3–4 aquec.; profundidade máxima controlável |
| 2 | Romanian deadlift | 3 | 6–10 | 3 | 180 | Posterior/glúteo | 2–3 aquec.; quadril para trás; coluna estável |
| 3 | Leg press | 2 | 10–15 | 2–3 | 120–180 | Quadríceps | ROM profundo sem retroversão excessiva |
| 4 | Flexora | 2 | 10–15 | 2 | 120 | Posterior | Controle no alongamento |
| 5 | Panturrilha sentada | 2 | 10–15 | 2 | 90–120 | Sóleo | Pausa alongada inferior |
| 6 | Cable crunch | 3 | 8–15 | 2 | 90–120 | Reto abdominal | Flexionar tronco/pelve, não apenas puxar braços |

#### Quarta — Upper B + panturrilha

| # | Exercício | Séries | Reps | RIR | Descanso s | Principal | Observação |
|---|---|---:|---|---|---|---|---|
| 1 | Supino inclinado máquina | 3 | 8–12 | 2–3 | 120–180 | Peitoral | 2 aquec.; máquina estável facilita readaptação |
| 2 | Puxada alta | 3 | 6–10 | 2–3 | 120–180 | Dorsais | 2 aquec.; sem balançar tronco |
| 3 | Remada máquina | 2 | 10–15 | 2 | 120 | Costas superiores | Buscar retração sem encurtar ROM |
| 4 | Pec deck | 2 | 10–15 | 2 | 90–120 | Peitoral | Alongamento confortável |
| 5 | Elevação lateral | 2 | 12–20 | 2 | 90 | Deltoide lateral | Técnica estrita |
| 6 | Crucifixo inverso | 2 | 12–20 | 2 | 90 | Deltoide posterior | Sem encolher ombros |
| 7 | Tríceps acima da cabeça | 2 | 10–15 | 2 | 90 | Tríceps | Buscar comprimento longo |
| 8 | Rosca Scott | 2 | 10–15 | 2 | 90 | Bíceps | Não tirar braço do apoio |
| 9 | Panturrilha em pé | 3 | 10–15 | 2 | 90–120 | Gastrocnêmio | ROM total + pausa inferior |

#### Sexta — Lower B + panturrilha + abs

| # | Exercício | Séries | Reps | RIR | Descanso s | Principal | Observação |
|---|---|---:|---|---|---|---|---|
| 1 | Leg press ou agachamento | 3 | 8–12 | 2–3 | 180 | Quadríceps | 3 aquec.; escolher versão tecnicamente melhor |
| 2 | Hip thrust | 2 | 8–12 | 2 | 120–180 | Glúteos | Extensão do quadril, não lombar |
| 3 | Extensora | 2 | 10–15 | 2 | 90–120 | Quadríceps | Controle em ambos sentidos |
| 4 | Flexora sentada | 3 | 10–15 | 2 | 120 | Posterior | Permitir alongamento |
| 5 | Adutora | 2 | 12–20 | 2 | 90 | Adutores | ROM confortável |
| 6 | Panturrilha em pé | 3 | 8–12 | 2 | 120 | Gastrocnêmio | Alongamento profundo controlado |
| 7 | Reverse crunch | 3 | 8–15 | 2 | 90 | Abdômen | Retroversão pélvica; não só flexão de quadril |

Cardio M1: quinta bike/caminhada inclinada 30–35 min RPE 3–4; sábado Zone 2 35–45 min RPE 3–4; domingo caminhada 20–40 min RPE 2–3. Nada de HIIT nas primeiras semanas.

### Bloco M2 — Acumulação (meses 4–6; semanas de software 14–26)

Objetivo: volume produtivo maior; panturrilhas e abdômen ganham prioridade; RIR predominante 1–3.

#### Segunda — Upper A

| # | Exercício | Séries | Reps | RIR | Descanso s | Observação |
|---|---|---:|---|---|---|---|
| 1 | Supino barra/máquina | 3 | 6–10 | 2 | 180 | 3–4 aquec.; double progression |
| 2 | Remada apoiada | 3 | 6–10 | 2 | 180 | 2 aquec.; sem roubo |
| 3 | Supino inclinado halteres | 3 | 8–12 | 2 | 120–180 | ROM profundo |
| 4 | Puxada neutra | 3 | 8–12 | 2 | 120–180 | Alongamento superior |
| 5 | Elevação lateral cabo | 3 | 12–20 | 1–2 | 90 | Última pode ~1 RIR |
| 6 | Tríceps polia | 3 | 10–15 | 1–2 | 90 | Sem falha obrigatória |
| 7 | Rosca cabo | 3 | 10–15 | 1–2 | 90 | Técnica estrita |
| 8 | Panturrilha em pé | 4 | 8–12 | 1–2 | 120 | Priorizar ROM e dorsiflexão |

#### Terça — Lower A

| # | Exercício | Séries | Reps | RIR | Descanso s | Observação |
|---|---|---:|---|---|---|---|
| 1 | Hack squat | 4 | 6–10 | 2 | 180 | 3–4 aquec. |
| 2 | Romanian deadlift | 3 | 6–10 | 2 | 180 | Quadril dominante |
| 3 | Leg press | 3 | 10–15 | 1–2 | 120–180 | Profundidade consistente |
| 4 | Flexora | 3 | 10–15 | 1–2 | 120 | ROM completo |
| 5 | Panturrilha sentada | 3 | 10–15 | 1–2 | 120 | Pausa inferior |
| 6 | Cable crunch | 3 | 8–15 | 1–2 | 90–120 | Progredir carga |

#### Quarta — Upper B

| # | Exercício | Séries | Reps | RIR | Descanso s | Observação |
|---|---|---:|---|---|---|---|
| 1 | Supino inclinado máquina | 3 | 8–12 | 2 | 120–180 | 2–3 aquec. |
| 2 | Barra/puxada | 3 | 6–10 | 2 | 120–180 | Peso corporal ou carga progressiva |
| 3 | Remada máquina | 3 | 8–12 | 2 | 120–180 | Estável |
| 4 | Pec deck/crossover | 2 | 10–15 | 1–2 | 90–120 | Alongamento controlado |
| 5 | Elevação lateral | 3 | 12–20 | 1–2 | 90 | Sem impulso excessivo |
| 6 | Crucifixo inverso | 2 | 12–20 | 1–2 | 90 | Técnica |
| 7 | Extensão de tríceps acima da cabeça | 2 | 10–15 | 1–2 | 90 | Posição alongada |
| 8 | Rosca Scott | 2 | 10–15 | 1–2 | 90 | Controle |
| 9 | Panturrilha em pé | 3 | 10–15 | 1–2 | 120 | ROM total |
| 10 | Ab wheel | 2 | 6–12 | 2 | 90–120 | Aumentar alcance mantendo pelve estável |

#### Sexta — Lower B

| # | Exercício | Séries | Reps | RIR | Descanso s | Observação |
|---|---|---:|---|---|---|---|
| 1 | Agachamento/leg press | 4 | 8–12 | 2 | 180 | 3 aquec. |
| 2 | Hip thrust | 3 | 8–12 | 2 | 120–180 | Trava pelo quadril |
| 3 | Extensora | 3 | 10–15 | 1–2 | 120 | Última pode ~1 RIR |
| 4 | Flexora sentada | 3 | 10–15 | 1–2 | 120 | ROM consistente |
| 5 | Adutora | 2 | 12–20 | 1–2 | 90 | Sem dor |
| 6 | Panturrilha em pé | 4 | 8–12 | 1–2 | 120 | Não encurtar ROM por carga |
| 7 | Elevação de joelhos/pernas | 3 | 8–15 | 1–2 | 90 | Retroversão pélvica |
| 8 | Ab wheel | 2 | 6–12 | 2 | 90 | Anti-extensão |

Cardio M2: quinta bike/caminhada inclinada 35–45 min RPE 3–4; sábado Zone 2 40–50 min RPE 3–4; domingo caminhada leve 30–45 min RPE 2–3.

### Bloco M3 — Especialização (meses 7–9; semanas de software 27–39)

Objetivo: manter grandes grupamentos e priorizar panturrilhas/abdômen; panturrilhas aparecem primeiro em duas sessões.

#### Segunda — Upper A + panturrilha prioritária

| # | Exercício | Séries | Reps | RIR | Descanso s | Observação |
|---|---|---:|---|---|---|---|
| 1 | Panturrilha em pé | 4 | 6–10 | 1–2 | 120–180 | 2 aquec.; vem primeiro |
| 2 | Supino halteres | 3 | 6–10 | 1–2 | 180 | 3 aquec. |
| 3 | Remada unilateral cabo | 3 | 8–12 | 1–2 | 120 | Alongar sem rodar tronco |
| 4 | Inclinado Smith | 3 | 8–12 | 1–2 | 120–180 | ROM profundo |
| 5 | Puxada | 3 | 8–12 | 1–2 | 120 | Controle |
| 6 | Elevação lateral cabo | 3 | 12–20 | 1 | 90 | Falha opcional só na última |
| 7 | Tríceps | 2 | 10–15 | 1–2 | 90 | Controle |
| 8 | Rosca | 2 | 10–15 | 1–2 | 90 | Controle |

#### Terça — Lower A + abs

| # | Exercício | Séries | Reps | RIR | Descanso s | Observação |
|---|---|---:|---|---|---|---|
| 1 | Hack squat | 3 | 6–10 | 1–2 | 180 | 3–4 aquec. |
| 2 | RDL | 3 | 6–10 | 2 | 180 | Não levar à falha |
| 3 | Leg press | 3 | 10–15 | 1–2 | 120–180 | ROM profundo |
| 4 | Flexora deitada | 3 | 10–15 | 1–2 | 120 | Alongamento |
| 5 | Panturrilha sentada | 3 | 10–15 | 1–2 | 120 | Pausa inferior |
| 6 | Cable crunch | 4 | 8–15 | 1–2 | 90–120 | Sobrecarga progressiva |

#### Quarta — Upper B

| # | Exercício | Séries | Reps | RIR | Descanso s | Observação |
|---|---|---:|---|---|---|---|
| 1 | Panturrilha no leg press | 4 | 12–20 | 1–2 | 90–120 | Joelho estendido; ROM total |
| 2 | Inclinado máquina | 3 | 8–12 | 1–2 | 120–180 | 2 aquec. |
| 3 | Barra/puxada | 3 | 6–10 | 1–2 | 120–180 | Progredir carga |
| 4 | Remada apoiada | 3 | 8–12 | 1–2 | 120–180 | Estável |
| 5 | Crossover | 2 | 10–15 | 1–2 | 90 | Alongamento controlado |
| 6 | Elevação lateral | 3 | 12–20 | 1 | 90 | Última próxima da falha |
| 7 | Crucifixo inverso | 2 | 12–20 | 1–2 | 90 | Controle |
| 8 | Tríceps overhead | 2 | 10–15 | 1–2 | 90 | Alongado |
| 9 | Rosca Scott | 2 | 10–15 | 1–2 | 90 | Controle |
| 10 | Elevação de joelhos | 3 | 10–15 | 1–2 | 90 | Retroversão pélvica |

#### Sexta — Lower B

| # | Exercício | Séries | Reps | RIR | Descanso s | Observação |
|---|---|---:|---|---|---|---|
| 1 | Afundo/Búlgaro com passo longo moderado | 3 | 8–12/lado | 2 | 120–180 | 2 aquec.; equilíbrio antes da carga |
| 2 | Hip thrust | 3 | 8–12 | 1–2 | 120–180 | Controle |
| 3 | Extensora | 3 | 10–15 | 1 | 120 | Última 0–1 RIR opcional |
| 4 | Flexora sentada | 3 | 10–15 | 1–2 | 120 | Posição alongada |
| 5 | Adutora | 2 | 12–20 | 1–2 | 90 | ROM confortável |
| 6 | Panturrilha em pé | 4 | 8–12 | 1 | 120 | Alta prioridade técnica |
| 7 | Ab wheel | 3 | 6–12 | 1–2 | 90 | Anti-extensão |

Cardio M3: quinta Zone 2 35–50 min RPE 3–4; sábado Zone 2 45–60 min RPE 3–4; domingo caminhada 30–45 min RPE 2–3 ou, opcional e condicionado a performance normal de pernas, bike `5 min fácil → 5–6 × (1 min forte RPE 8–9 + 2 min fácil) → 5 min fácil`.

### Bloco M4 — Consolidação (meses 10–12; semanas de software 40–52)

Objetivo: usar exercícios com melhor resposta individual; especialização sustentável; maximizar estímulo/fadiga. Substituições individualizadas exigem decisão humana.

#### Segunda — Upper A

| # | Exercício | Séries | Reps | RIR | Descanso s | Observação |
|---|---|---:|---|---|---|---|
| 1 | Panturrilha em pé | 4 | 6–10 | 1 | 120–180 | Prioridade |
| 2 | Melhor supino do seu log | 3 | 6–10 | 1–2 | 180 | 3 aquec.; slot a confirmar |
| 3 | Melhor remada apoiada | 3 | 6–10 | 1–2 | 180 | 2 aquec.; slot a confirmar |
| 4 | Inclinado | 3 | 8–12 | 1–2 | 120 | ROM |
| 5 | Puxada | 3 | 8–12 | 1–2 | 120 | ROM |
| 6 | Elevação lateral | 3 | 12–20 | 1 | 90 | 0–1 opcional na última |
| 7 | Tríceps | 2 | 10–15 | 1 | 90 | Sobrecarga |
| 8 | Bíceps | 2 | 10–15 | 1 | 90 | Sobrecarga |

#### Terça — Lower A

| # | Exercício | Séries | Reps | RIR | Descanso s | Observação |
|---|---|---:|---|---|---|---|
| 1 | Hack/agachamento melhor tolerado | 4 | 6–10 | 1–2 | 180 | 3–4 aquec.; slot a confirmar |
| 2 | RDL | 3 | 6–10 | 2 | 180 | Nunca sacrificar coluna por RIR |
| 3 | Leg press | 3 | 10–15 | 1–2 | 120–180 | Profundo |
| 4 | Flexora | 3 | 10–15 | 1 | 120 | Controle |
| 5 | Panturrilha sentada | 4 | 10–15 | 1 | 120 | Alongamento |
| 6 | Cable crunch | 4 | 8–15 | 1 | 90–120 | Progressão como qualquer músculo |

#### Quarta — Upper B

| # | Exercício | Séries | Reps | RIR | Descanso s | Observação |
|---|---|---:|---|---|---|---|
| 1 | Panturrilha leg press | 4 | 12–20 | 1 | 120 | Joelho estendido |
| 2 | Inclinado máquina | 3 | 8–12 | 1–2 | 120–180 | 2 aquec. |
| 3 | Barra/puxada | 3 | 6–10 | 1–2 | 120–180 | Progressão |
| 4 | Remada máquina | 3 | 8–12 | 1–2 | 120 | Estável |
| 5 | Pec deck/crossover | 2 | 10–15 | 1 | 90 | 0–1 opcional |
| 6 | Elevação lateral | 3 | 12–20 | 1 | 90 | Técnica |
| 7 | Crucifixo inverso | 2 | 12–20 | 1 | 90 | Técnica |
| 8 | Tríceps overhead | 2 | 10–15 | 1 | 90 | Alongado |
| 9 | Rosca Scott | 2 | 10–15 | 1 | 90 | Controle |
| 10 | Hanging knee raise | 3 | 8–15 | 1 | 90 | Pelve participa |

#### Sexta — Lower B

| # | Exercício | Séries | Reps | RIR | Descanso s | Observação |
|---|---|---:|---|---|---|---|
| 1 | Búlgaro | 3 | 8–12/lado | 1–2 | 120–180 | Controle |
| 2 | Hip thrust | 3 | 8–12 | 1–2 | 120–180 | Técnica |
| 3 | Extensora | 3 | 10–15 | 1 | 90–120 | Falha apenas opcional |
| 4 | Flexora sentada | 3 | 10–15 | 1 | 120 | Alongamento |
| 5 | Adutora | 2 | 12–20 | 1 | 90 | Controle |
| 6 | Panturrilha em pé | 4 | 8–12 | 1 | 120 | Série de alta qualidade |
| 7 | Ab wheel | 3 | 6–12 | 1–2 | 90 | Amplitude progressiva |

Cardio M4: igual ao M3; intervalos continuam opcionais e condicionados à performance de pernas.

### Progressão, fadiga e monitoramento masculinos

- Dupla progressão: manter carga e aumentar reps na faixa; subir somente quando todas as séries alcançarem o topo com RIR e técnica prescritos. Menor incremento disponível, aproximadamente 2–5% como referência prática.
- Não subir se só a primeira série chegou ao topo (exemplo explícito: `12/11/10`). Uma sessão ruim não é estagnação.
- Considerar +1 série semanal apenas após ~2–3 semanas de técnica boa, recuperação antes da sessão seguinte, sem dor articular crescente, déficit não agressivo e progresso insuficiente apesar de esforço adequado.
- Reduzir ~20–30% do volume do grupamento quando coexistirem: performance em queda por ≥2 exposições, dor muscular até a próxima sessão, piora importante de motivação/RPE, dor articular/tendínea crescente.
- Deload quando ≥2 sinais persistirem: ~5–10% de queda em várias sessões; perda de ≥2 reps na mesma carga/RIR em duas exposições; dores musculares incomuns/persistentes; dor articular/tendínea crescente; treinos subitamente mais difíceis; sono/disposição e performance piores.
- Protocolo de deload: 5–7 dias; séries 40–60%; carga ~90–95% ou mesma carga bem longe da falha; RIR 4–5; nenhuma falha; cardio −20–30% se fatigado; até 4 sessões curtas.
- Check-in: estável/melhor + recuperado = verde/progredir; sessão ruim isolada = não mudar; problema explicado por sono/dieta/cardio = corrigir recuperação; ≥2 exposições sem explicação = reduzir 20–30%; fadiga sistêmica alta = deload.
- Peso: preferencialmente diário ao acordar; média móvel de 7 dias. Cintura/abdômen semanal; quadril semanal/quinzenal; braço/coxa/panturrilha a cada 3–4 semanas; fotos a cada 4 semanas; carga/reps/RIR toda sessão; bioimpedância só como tendência.

## Programa feminino

Fonte: `treino-mulher.md`. Contexto: mulher adulta saudável, academia comercial, prioridade glúteos → quadríceps → posteriores → panturrilhas. Uma única sessão superior semanal com exatamente 2 costas + 2 ombros + 1 tríceps + 1 bíceps, sem peito nem extras.

### Regras globais femininas

- Split: segunda Inferiores A, terça Superior mínimo, quarta Inferiores B, sexta Inferiores C; cardio/recuperação quinta, sábado e domingo.
- Aquecimento de inferiores: 5–8 min leves, mobilidade dinâmica se necessário, 3–4 aproximações no primeiro composto; 1–2 nos pesados seguintes se necessário. Superior: 2–3 no primeiro puxador e 1–2 no desenvolvimento.
- Técnica: maior amplitude confortável/controlável sem perda grosseira de posição; não perseguir profundidade artificial.
- Iniciante/retorno de pausa longa: semanas 1–2, somente 2 séries nos exercícios prescritos com 3, 3–4 RIR; semanas 3–4 entram na prescrição normal.
- Compostos geralmente 2–3 RIR no começo da onda e 1–2 depois; isoladores podem 0–1 seletivamente na última série/blocos posteriores. Agachamento, RDL e Bulgarian não vão regularmente à falha.

### Bloco F1 — Base técnica e volume moderado (meses 1–3; semanas de software 1–13)

Objetivo: técnica, tolerância e baseline; RIR 3→2; volume conservador.

#### Segunda — Inferiores A — quadríceps + glúteos (70–85 min)

| # | Exercício | Séries | Reps | RIR | Descanso s | Observação |
|---|---|---:|---|---|---|---|
| 1 | Hack squat | 3 | 6–10 | 3→2 | 150–180 | Amplitude confortável; 3–4 aproximações |
| 2 | Leg press 45° | 2 | 10–15 | 2–3 | 120–180 | Não tirar pelve do encosto |
| 3 | Bulgarian split squat | 2 | 8–12/lado | 2–3 | 120 | Passada confortável; controle profundo |
| 4 | Cadeira extensora | 2 | 10–15 | 2 | 90–120 | Pausa curta na contração; progressão objetiva |
| 5 | Panturrilha em pé | 3 | 8–12 | 2 | 90–120 | Dorsiflexão controlada; sem quicar |
| 6 | Cable crunch | 2 | 10–15 | 2 | 60–90 | Progressão de carga, não apenas reps |

#### Terça — Superior mínimo (45–60 min; exatamente seis)

| Grupo | Exercício | Séries | Reps | RIR | Descanso s | Observação |
|---|---|---:|---|---|---|---|
| Costas 1 | Puxada alta pegada neutra | 2 | 8–12 | 2–3 | 120 | 2–3 aproximações leves |
| Costas 2 | Remada apoiada no peito | 2 | 8–12 | 2–3 | 120 | Apoio reduz fadiga lombar |
| Ombro 1 | Desenvolvimento em máquina | 2 | 8–12 | 2–3 | 120 | Único padrão de empurrar |
| Ombro 2 | Elevação lateral no cabo | 2 | 12–20 | 2 | 60–90 | Controle, sem balanço |
| Tríceps | Tríceps no cabo acima da cabeça | 2 | 10–15 | 2 | 60–90 | Alongamento confortável |
| Bíceps | Rosca Scott máquina/cabo | 2 | 10–15 | 2 | 60–90 | Não retirar braço do apoio |

#### Quarta — Inferiores B — posteriores + glúteos (75–90 min)

| # | Exercício | Séries | Reps | RIR | Descanso s | Observação |
|---|---|---:|---|---|---|---|
| 1 | Romanian deadlift | 3 | 6–10 | 3→2 | 150–180 | Parar antes de perder posição |
| 2 | Flexora sentada | 3 | 8–12 | 2 | 90–120 | Priorizar posição alongada |
| 3 | Hip thrust | 3 | 8–12 | 2–3 | 120–180 | Pelve controlada; sem hiperextensão lombar |
| 4 | Afundo reverso | 2 | 10–12/lado | 2 | 120 | Passo longo/moderado conforme conforto |
| 5 | Panturrilha sentada | 2 | 12–20 | 2 | 90 | Complemento, não principal |
| 6 | Ab wheel | 2 | 6–12 | 2–3 | 90 | Aumentar amplitude mantendo pelve |

#### Sexta — Inferiores C — glúteos + pernas (65–80 min)

| # | Exercício | Séries | Reps | RIR | Descanso s | Observação |
|---|---|---:|---|---|---|---|
| 1 | Hip thrust | 2 | 6–10 | 2 | 120–180 | Dia de carga relativamente maior |
| 2 | Extensão de quadril 45° com viés glúteo | 2 | 10–15 | 2 | 90–120 | Movimento do quadril; sem hiperextensão lombar |
| 3 | Leg press | 2 | 10–15 | 2 | 120 | Amplitude controlada |
| 4 | Flexora deitada | 2 | 10–15 | 2 | 90–120 | Complementa flexora sentada |
| 5 | Abdução de quadril em máquina | 2 | 15–25 | 1–2 | 60–90 | Sem impulso |
| 6 | Panturrilha em pé | 3 | 10–15 | 1–2 | 90–120 | Alongar embaixo; subida completa |

Cardio F1: quinta bike/elíptico 30–40 min leve–moderado RPE 3–4/teste da fala; sábado caminhada inclinada ou bike 30–45 min moderada RPE 3–4; domingo caminhada 40–60 min leve RPE 2–3.

### Bloco F2 — Hipertrofia progressiva (meses 4–6; semanas de software 14–26)

Objetivo: volume moderado–alto para prioritários; RIR 2→1; superior permanece sem aumento.

#### Segunda — Inferiores A

| # | Exercício | Séries | Reps | RIR | Descanso s | Observação |
|---|---|---:|---|---|---|---|
| 1 | Pendulum squat ou hack | 3 | 6–10 | 2→1 | 180 | 3–4 aproximações |
| 2 | Bulgarian split squat | 2 | 8–12/lado | 2 | 120 | Progressão por perna |
| 3 | Cadeira extensora | 3 | 10–15 | 1–2 | 90–120 | Última pode 1 RIR |
| 4 | Panturrilha em pé | 4 | 8–12 | 1–2 | 90–120 | Sem quicar |
| 5 | Cable crunch | 3 | 10–15 | 1–2 | 60–90 | Sobrecarga progressiva |

#### Terça — Superior (os mesmos seis)

Puxada neutra 2×8–12 @1–2, 120 s; Remada apoiada 2×8–12 @1–2, 120 s; Desenvolvimento máquina 2×8–12 @1–2, 120 s; Elevação lateral cabo 2×12–20 @1–2, 60–90 s; Tríceps overhead 2×10–15 @1–2, 60–90 s; Rosca Scott 2×10–15 @1–2, 60–90 s. Observações: manter, sem série extra, técnica estrita/comprimento longo.

#### Quarta — Inferiores B

Romanian deadlift 3×6–10 @2, 180 s, sem buscar falha; Flexora sentada 4×8–12 @1–2, 120 s, principal flexão de joelho; Hip thrust 4×8–12 @1–2, 120–180 s; Extensão 45° viés glúteo 2×10–15 @1–2, 90–120 s; Panturrilha sentada 2×12–20 @1–2, 90 s; Ab wheel 3×6–12 @2, 90 s.

#### Sexta — Inferiores C

Agachamento Smith 3×8–12 @2, 150–180 s; Hip thrust 3×6–10 @1–2, 120–180 s; Afundo reverso 2×10–12/lado @2, 120 s; Flexora deitada 2×10–15 @1–2, 90–120 s; Abdução máquina 3×15–25 @1, 60 s (última 0–1 opcional); Panturrilha em pé 3×10–15 @1, 90–120 s.

Cardio F2: quinta Zone 2 conforme base 30–40 min; sábado Zone 2 30–45 min; domingo recuperação ativa 40–60 min, intensidades RPE idênticas à tabela global feminina.

### Bloco F3 — Especialização de glúteos/pernas (meses 7–9; semanas de software 27–39)

#### Segunda — Inferiores A

Agachamento Smith profundo confortável 3×6–10 @2→1, 180 s; Bulgarian split squat 3×8–12 @1–2, 120–150 s; Leg press 3×10–15 @1–2, 120 s; Cadeira extensora 2×12–18 @1, 90 s (última 0–1 opcional); Panturrilha em pé 4×8–12 @1, 90–120 s; Cable crunch 3×10–15 @1–2, 60–90 s.

#### Terça — Superior (exatamente seis)

Puxada neutra 2×8–12 @1–2, 120 s; Remada apoiada 2×8–12 @1–2, 120 s; Desenvolvimento máquina 2×8–12 @1–2, 120 s; Elevação lateral cabo 2×12–20 @1, 60–90 s (última 0–1 aceitável); Tríceps overhead 2×10–15 @1, 60–90 s; Rosca Scott 2×10–15 @1, 60–90 s.

#### Quarta — Inferiores B

Romanian deadlift 3×6–10 @1–2, 180 s; Flexora sentada 4×8–12 @1, 120 s; Hip thrust 3×8–12 @1–2, 120–180 s; Extensão 45° glúteo 2×10–15 @1, 90–120 s; Panturrilha sentada 3×12–20 @1, 90 s; Ab wheel 3×6–12 @1–2, 90 s.

#### Sexta — Inferiores C

Hip thrust 3×6–10 @1, 120–180 s; Afundo reverso 3×8–12/lado @1–2, 120 s; Extensão de quadril no cabo/máquina 2×12–20 @1, 60–90 s; Flexora deitada 2×10–15 @1, 90 s; Abdução máquina 3×15–25 @0–1 só na última, 60 s; Panturrilha em pé 3×10–15 @1, 90 s, com parciais alongadas opcionais só após reps completas.

Cardio F3: quinta bike/elíptico 30–40 min RPE 3–4; sábado caminhada inclinada/bike 30–45 min RPE 3–4 ou opcionalmente substituir parte por `6×1 min forte RPE ~8 + 2 min leves`; domingo caminhada 40–60 min RPE 2–3. Retirar HIIT primeiro se quadríceps pesado/performance cair.

### Bloco F4 — Consolidação e alta qualidade (meses 10–12; semanas de software 40–52)

#### Segunda — Inferiores A

Hack squat 3×6–10 @1–2, 180 s; Leg press 3×8–12 @1–2, 150 s; Walking lunge 2×10–14 passos/lado @1–2, 120 s; Cadeira extensora 3×10–15 @1, 90 s; Panturrilha em pé 4×8–12 @1, 90–120 s; Cable crunch 3×8–15 @1–2, 90 s.

#### Terça — Superior (exatamente seis)

Puxada neutra 2×8–12 @1–2, 120 s; Remada apoiada 2×8–12 @1–2, 120 s; Desenvolvimento máquina 2×8–12 @1–2, 120 s; Elevação lateral cabo 2×12–20 @1, 60 s; Tríceps overhead 2×10–15 @1, 60–90 s; Rosca Scott 2×10–15 @1, 60–90 s.

#### Quarta — Inferiores B

Romanian deadlift 3×6–10 @1–2, 180 s; Flexora sentada 4×8–12 @1, 120 s; Hip thrust Smith 4×8–12 @1–2, 120–180 s; Panturrilha sentada 3×12–20 @1, 90 s; Ab wheel 3×6–12 @1–2, 90 s.

#### Sexta — Inferiores C

Bulgarian split squat 3×8–12/lado @1–2, 120–150 s; Glute drive/hip thrust máquina 3×8–12 @1, 120 s; Kickback no cabo 2×12–20 @1, 60 s; Flexora deitada 2×10–15 @1, 90 s; Abdução máquina 3×15–25 @0–1 só na última, 60 s; Panturrilha em pé 3×10–15 @1, 90 s.

Cardio F4: mesmo esquema do F3; HIIT continua opcional e condicional.

### Progressão, fadiga e monitoramento femininos

- Dupla progressão: manter carga enquanto avança na faixa; quando todas (ou, no texto explicativo, “todas ou quase todas”) as séries alcançarem o topo com RIR e técnica corretos, sugerir menor incremento prático; compostos/máquinas de perna ~2,5–5%, isoladores menor incremento disponível. Por segurança, a implementação automática usa **todas**; “quase todas” é exibido como ambiguidade que exige decisão humana.
- Performance estável/subindo: manter carga e buscar +1 repetição. Queda por ≥2 sessões + fadiga: não adicionar volume e avaliar redução/deload.
- +1 série semanal somente em músculo prioritário após ~4–6 semanas sem tendência em medidas/desempenho, com boa recuperação e séries boas. Não adicionar se carga/reps progridem, há dor articular, fadiga até a próxima sessão ou performance cai.
- Deload quando queda objetiva em ≥2 sessões + ≥2 sinais: dor muscular persistente interferindo, piora de sono, motivação marcadamente baixa, cargas anormalmente pesadas, dor articular crescente, perda inesperada de ~2 RIR.
- Deload 5–7 dias: séries −~50%; carga ~85–90% ou menor; RIR 4–5; nenhuma falha; mesmos dias possíveis; cardio apenas leve/moderado, retirar HIIT; manter exercícios.
- Autorregulação: verde = reps/cargas subindo, sono normal, DOMS resolvida, sem dor articular → progredir; amarelo = 1–2 sinais leves/uma sessão ruim → manter carga, não adicionar séries, +1 RIR temporariamente; vermelho = queda ≥2 sessões + múltiplos sinais → reduzir volume/deload; dor aguda/localizada → interromper exercício e avaliar profissional se persistir.
- Monitoramento: peso 3–7 manhãs/sem e média semanal; cintura, quadril/glúteos, coxa, panturrilha e fotos a cada 4 semanas; braço a cada 6–8; cargas/reps/RIR toda sessão; sono/fadiga/dor diário com revisão semanal; gordura a cada 8–12 semanas pelo mesmo método.

## Volumes de referência (validação cruzada)

Masculino, séries diretas: panturrilhas 11→14→15→até 16; abdômen 6→10→10→10; peitoral 10→11→11→11; quadríceps 10→14→12→13; posteriores 8→9→9→9.

Feminino, séries diretas aproximadas: glúteo máximo 7→9→10→9; quadríceps 11→11–13→~11–12→9–11; posteriores 8→9→9→9; panturrilhas 8→9→10→10; core 4→6→6→6; costas 4 em todos; braços 2 cada em todos. O superior permanece sempre com os mesmos seis movimentos/categorias e 2 séries por exercício.

## Referências e ciência a expor

A página `/app/science` deve armazenar e apresentar somente referências listadas nos documentos. Categorias mapeadas: volume/frequência; cargas/repetições; RIR/falha; descanso; ROM/comprimento muscular; variação; cardio concorrente; deload; panturrilhas; glúteos/posteriores (feminino); recomposição/memória muscular (masculino); ciclo menstrual/baixa disponibilidade energética (feminino). PMIDs/DOIs e URLs vêm literalmente das seções de referência de cada pesquisa; nenhuma referência é sintetizada pelo software.
