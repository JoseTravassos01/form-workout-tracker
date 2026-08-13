# Próximas melhorias — fluxo de treino e cargas

Este documento registra melhorias futuras com foco em reduzir o número de ações necessárias durante o treino e facilitar a consulta do histórico.

## 1. Exercícios específicos por programa e por dia

Os exercícios exibidos devem continuar vindo exclusivamente dos programas estruturados a partir de:

- `docs/research/treino-homem.md`
- `docs/research/treino-mulher.md`

Não criar exercícios novos nos componentes da interface e não misturar exercícios entre os programas.

Ao abrir um treino, o sistema deve exibir os exercícios específicos daquele dia, respeitando:

- programa e perfil do usuário autenticado;
- bloco atual;
- semana atual;
- ordem definida na pesquisa;
- número de séries prescrito;
- faixa de repetições prescrita;
- RIR prescrito;
- intervalo de descanso;
- observações técnicas e regras de progressão da pesquisa.

No programa feminino, o treino de superiores deve permanecer com exatamente seis exercícios: dois de costas, dois de ombros, um de tríceps e um de bíceps.

## 2. Iniciar treino com a ficha completa do dia

Ao selecionar **Iniciar treino**, a tela deve carregar uma ficha operacional completa, com um card para cada exercício do dia.

Cada card deve mostrar, de forma destacada:

- nome do exercício;
- grupo muscular;
- equipamento, quando disponível;
- número de séries;
- faixa ou número de repetições;
- RIR alvo;
- descanso recomendado;
- instruções e observações da pesquisa;
- carga e execução da sessão anterior;
- sugestão de progressão, quando aplicável.

Exemplo de apresentação:

```text
Hack squat
3 séries · 8–12 repetições · 2 RIR
Descanso: 180 s

Última vez:
120 kg × 10 @2
120 kg × 9 @2
120 kg × 8 @1
```

O usuário deve conseguir registrar cada série sem sair do card:

- carga utilizada;
- repetições realizadas;
- RIR real;
- série concluída;
- observação opcional.

Os campos de carga e repetições devem ser grandes, rápidos de editar e adequados para uso no celular.

## 3. Registrar e salvar as cargas utilizadas

Durante a sessão, a carga utilizada em cada série deve ser salva como um registro vinculado a:

- usuário/perfil autenticado;
- sessão de treino;
- exercício prescrito;
- exercício;
- número da série;
- data da execução.

O registro deve ser persistido no D1 somente após confirmação do servidor. Em caso de falha de conexão, a interface deve manter a informação localmente como **Não sincronizado** e permitir retry posterior.

Não informar que uma carga foi salva enquanto o servidor não confirmar a operação.

## 4. Histórico de cargas e consulta posterior

As cargas registradas devem aparecer na área de histórico do exercício e na página de progressão de força.

Para cada exercício, consultar e exibir:

- cargas das últimas sessões;
- repetições por série;
- RIR real;
- maior carga registrada;
- melhor número de repetições;
- volume realizado;
- evolução da carga ao longo do tempo;
- data da sessão.

O histórico deve ser filtrado server-side pelo perfil autenticado. Um usuário nunca pode consultar cargas ou sessões de outro usuário alterando IDs na URL ou no request.

## 5. Mostrar automaticamente a última execução ao iniciar

Ao iniciar um novo treino, o sistema deve buscar a última sessão concluída ou registrada para cada exercício daquele dia e preencher uma seção **Última vez**.

Regras:

1. procurar a execução anterior do mesmo exercício para o mesmo perfil;
2. ordenar pela sessão mais recente;
3. mostrar todas as séries registradas da última execução relevante;
4. se não existir histórico, mostrar um estado vazio claro;
5. não copiar automaticamente a carga para a nova sessão sem confirmação do usuário;
6. usar a carga anterior apenas como referência e auxílio de preenchimento rápido.

Estado vazio sugerido:

```text
Ainda não há histórico para este exercício.
Registre a primeira sessão para acompanhar sua evolução.
```

## 6. Sugestão de progressão com base no histórico

A sugestão deve utilizar somente as regras codificadas a partir da pesquisa correspondente.

Exemplo operacional para uma prescrição de `3×8–12`:

- todas as séries no topo da faixa, com RIR adequado e técnica preservada: sugerir incremento de carga;
- séries ainda abaixo do topo: manter a carga e buscar mais repetições;
- queda repetida de performance ou sinais de fadiga: não aumentar a carga;
- sugestão sempre exige confirmação do usuário;
- a aplicação nunca altera automaticamente a carga prescrita.

Quando a pesquisa apresentar uma alternativa ou condição ambígua, mostrar a ambiguidade e deixar a decisão para o usuário/profissional. Não transformar uma alternativa em regra automática sem suporte explícito.

## 7. Fluxo simplificado durante o treino

Fluxo esperado:

1. usuário toca em **Iniciar treino**;
2. sistema mostra somente os exercícios do dia;
3. cada exercício mostra prescrição e última execução;
4. usuário informa carga, repetições e RIR de cada série;
5. ao concluir uma série, o descanso é iniciado conforme a prescrição;
6. o registro é salvo e recebe status de sincronização;
7. usuário conclui o exercício;
8. usuário conclui o treino;
9. os dados ficam disponíveis imediatamente no histórico e na progressão após confirmação do servidor.

## 8. Critérios de aceite

- O treino masculino mostra apenas exercícios prescritos no programa masculino e no bloco atual.
- O treino feminino mostra apenas exercícios prescritos no programa feminino e no bloco atual.
- Cada exercício mostra séries, repetições, RIR e descanso da fonte correspondente.
- A última execução aparece automaticamente quando existir histórico.
- A carga de cada série pode ser registrada pelo celular em poucos toques.
- Cargas, repetições e RIR ficam salvos no D1 e aparecem no histórico.
- Falhas de rede não apagam dados digitados e não geram falso status de sincronização.
- A consulta de histórico respeita o usuário autenticado.
- A progressão sugerida segue as regras da pesquisa e nunca altera a carga automaticamente.
- O programa feminino mantém exatamente seis exercícios no treino de superiores.
