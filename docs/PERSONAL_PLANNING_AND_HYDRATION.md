# Planejamento pessoal, cardio e hidratação

## Decisões de arquitetura

As funcionalidades pessoais são aditivas e não substituem nem reescrevem os programas científicos ativos.

- `personal_cardio_plans` guarda cardio único ou recorrente até o fim da semana/mês.
- `custom_program_periods` liga um programa criado pelo usuário a um período de 4 ou 12 semanas.
- O treino pessoal reutiliza `training_programs`, `training_blocks`, `training_days` e `exercise_prescriptions`. Assim, a execução usa o mesmo fluxo de sessões, séries, RIR, descanso e histórico.
- Um dia definido no ciclo pessoal prevalece visualmente sobre o dia científico correspondente durante o período, mas `athlete_profiles.current_program_id` não é alterado.
- Ao encerrar um cardio ou ciclo, somente o agendamento futuro deixa de aparecer. Sessões e registros antigos continuam no banco.

## Cardio pessoal

No calendário, o usuário escolhe uma data, modalidade, duração, RPE e um dos escopos:

- somente o dia;
- até o fim da semana;
- até o fim do mês.

Nos escopos recorrentes, os dias da semana são escolhidos explicitamente. Cardios pessoais usam `cardio_sessions` como os cardios prescritos, mas são associados por `personal_cardio_plan_id`.

## Hidratação

`hydration_logs` registra cada quantidade com data local e chave de idempotência. `hydration_settings` guarda meta, horário e ativação do lembrete por atleta.

A meta inicial de 2.000 ml é apenas um valor editável da interface, não uma recomendação clínica individual. O lembrete local:

- exige permissão iniciada por ação do usuário;
- só alerta quando a meta ainda não foi atingida;
- evita repetir o alerta no mesmo dia;
- funciona enquanto o PWA/site está aberto ou volta ao foco.

Notificações confiáveis com o aplicativo totalmente fechado exigem uma fase adicional de Web Push com assinatura do navegador, armazenamento de subscriptions e disparo agendado no servidor.

## Ciclo mensal ou trimestral

O construtor aceita:

- 4 ou 12 semanas;
- até sete dias por semana;
- até 12 exercícios por dia;
- séries, faixa de repetições, faixa de RIR, descanso e observações.

Quando o nome digitado corresponde a um exercício canônico já existente, essa entidade é reutilizada. Exercícios novos recebem identidade estável e específica do atleta, permitindo que ciclos futuros com o mesmo nome preservem o histórico.

## Migration

`0008_personal_planning_and_hydration.sql` apenas cria tabelas, índices e a coluna opcional `cardio_sessions.personal_cardio_plan_id`. Ela não contém `DROP`, `DELETE` ou alteração destrutiva dos programas existentes.
