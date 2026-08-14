import { commonReferences, commonScienceTopics } from "./common";
import { cardio, day, exercise as x, recoveryDay, type ExerciseSeed, type ProgramSeed } from "./types";

const progressionPolicy = {
  kind: "double_progression",
  loadIncreasePercent: [2, 5],
  increaseWhen: "all_sets_at_rep_ceiling_with_prescribed_rir_and_stable_technique",
  holdWhen: "not_all_sets_at_ceiling_or_single_bad_session",
  neverAutomatic: true,
} as const;

const recoveryPolicy = {
  deloadDays: [7, 7],
  scheduledWeeks: [12, 24, 36],
  trigger: { minimumPersistentSignals: 2, comparableExposureRepLoss: 3 },
  deload: { volumePercent: [50, 50], rir: [4, 5], failure: false },
  localSetReduction: 1,
} as const;

const e = x;

function maleDays(
  monday: ExerciseSeed[],
  tuesday: ExerciseSeed[],
  wednesday: ExerciseSeed[],
  friday: ExerciseSeed[],
  saturday: ExerciseSeed[],
  sunday: ExerciseSeed[],
) {
  return [
    day(1, "Upper Body A — Peitoral + Dorsais", monday, "Sessão de alta tensão para peitoral e costas, com panturrilha."),
    day(2, "Lower Body A — Quadríceps + Posteriores", tuesday, "Treino principal de pernas com abdômen carregado."),
    day(3, "Push B — Peitoral + Deltoides + Tríceps", wednesday, "Segundo estímulo de empurrar e panturrilha em pé."),
    recoveryDay(4, "Descanso obrigatório da musculação", "Zone 2 leve e meta de passos; nenhuma musculação pesada."),
    day(5, "Pull B — Costas + Bíceps", friday, "Segundo estímulo de puxar com abdômen carregado."),
    day(6, "Legs B — Posteriores + Glúteos + Quadríceps", saturday, "Segundo treino de pernas com panturrilha sentada."),
    day(7, "Especialização curta — Panturrilha + Abdômen", sunday, "Sessão curta seguida de cardio Zone 2."),
  ];
}

function cardioDays(thursdayMinutes: number, sundayMinutes: number, steps: string) {
  return [
    cardio(4, "Zone 2 — recuperação ativa", [thursdayMinutes, thursdayMinutes], [3, 4], "Leve", "Caminhada, bicicleta ou elíptico em ritmo conversável.", `Dia sem musculação; meta diária: ${steps} passos.`),
    cardio(7, "Zone 2 — condicionamento", [sundayMinutes, sundayMinutes], [3, 4], "Leve–moderada", "Bicicleta ou caminhada inclinada, sem transformar em HIIT.", "Realizar após a especialização curta ou em horário separado."),
  ];
}

const block1Days = maleDays(
  [
    e("supino-barra", "Supino Reto com Barra", 3, [6, 8], [2, 2], [180, 180], "Peitoral", "chest", "Pegada média e pausa de um segundo no peito."),
    e("puxada-neutra", "Puxada Articulada ou Vertical Neutra", 3, [8, 10], [1, 2], [150, 150], "Dorsais", "back", "Conduza os cotovelos em direção ao quadril."),
    e("supino-inclinado-halteres", "Desenvolvimento Inclinado com Halteres", 3, [8, 10], [1, 2], [120, 120], "Peitoral clavicular", "chest", "Banco a 30° e amplitude completa."),
    e("remada-curvada-smith", "Remada Curvada com Barra ou Smith", 3, [8, 10], [1, 2], [120, 120], "Costas superiores", "back", "Tronco estável e cotovelos a aproximadamente 45°."),
    e("elevacao-lateral-cabo", "Elevação Lateral no Cabo", 4, [10, 12], [1, 1], [90, 90], "Deltoide lateral", "shoulders", "Cabo na altura do quadril e sem balanço."),
    e("panturrilha-smith", "Panturrilha em Pé no Smith", 4, [10, 12], [0, 1], [90, 90], "Panturrilhas", "calves", "Pause dois segundos no alongamento."),
  ],
  [
    e("hack-squat", "Agachamento Hack ou Leg Press 45°", 3, [8, 10], [1, 2], [180, 180], "Quadríceps", "quads", "Escolha a variante estável e use flexão profunda de joelho.", { requiresSelection: true }),
    e("cadeira-extensora", "Cadeira Extensora", 3, [10, 12], [1, 1], [120, 120], "Quadríceps", "quads", "Pause um segundo na extensão."),
    e("romanian-deadlift", "RDL com Barra", 3, [8, 10], [2, 2], [180, 180], "Posteriores", "hamstrings", "Quadril para trás e coluna neutra."),
    e("flexora-sentada", "Cadeira Flexora", 3, [10, 12], [1, 1], [90, 90], "Posteriores", "hamstrings", "Incline levemente o tronco para favorecer o alongamento."),
    e("cable-crunch", "Cable Crunch Ajoelhado", 4, [10, 12], [0, 1], [90, 90], "Reto abdominal", "core", "Flexione a coluna aproximando tórax e pelve."),
  ],
  [
    e("supino-inclinado-halteres", "Supino Inclinado com Halteres", 3, [8, 10], [1, 2], [150, 150], "Peitoral clavicular", "chest", "Use amplitude profunda e controlada."),
    e("crossover-polia-alta", "Crossover na Polia Alta", 3, [10, 12], [1, 1], [90, 90], "Peitoral", "chest", "Cruze levemente as mãos no final."),
    e("elevacao-lateral", "Elevação Lateral com Halteres", 4, [12, 15], [0, 1], [90, 90], "Deltoide lateral", "shoulders", "Tronco levemente inclinado e sem impulso."),
    e("triceps-testa-ez", "Tríceps Testa com Barra EZ", 3, [10, 12], [1, 1], [90, 90], "Tríceps", "triceps", "Mantenha os braços inclinados para alongar a cabeça longa."),
    e("triceps-corda", "Tríceps Pulley com Corda", 3, [10, 12], [0, 1], [90, 90], "Tríceps", "triceps", "Abra a corda no final da extensão."),
    e("panturrilha-leg-press", "Panturrilha no Leg Press", 4, [12, 15], [0, 1], [90, 90], "Panturrilhas", "calves", "Joelhos estendidos e pausa de dois segundos no fundo."),
  ],
  [
    e("remada-articulada-unilateral", "Remada Articulada Unilateral Neutra", 3, [8, 10], [1, 2], [120, 120], "Dorsais", "back", "Puxe em direção à crista ilíaca sem rodar o tronco."),
    e("puxada-aberta", "Puxada Aberta no Cabo", 3, [10, 12], [1, 1], [120, 120], "Costas superiores", "back", "Finalize aproximando as escápulas."),
    e("crucifixo-inverso", "Crucifixo Invertido", 3, [12, 15], [0, 1], [90, 90], "Deltoide posterior", "shoulders", "Faça abdução horizontal sem encolher os ombros."),
    e("rosca-inclinada-halteres", "Rosca com Halteres no Banco Inclinado", 3, [10, 12], [1, 1], [90, 90], "Bíceps", "biceps", "Mantenha os cotovelos atrás do tronco."),
    e("rosca-scott", "Rosca Scott", 3, [10, 12], [0, 1], [90, 90], "Bíceps", "biceps", "Não retire os braços do apoio."),
    e("elevacao-joelhos", "Elevação de Joelhos na Barra", 4, [12, 15], [0, 1], [90, 90], "Reto abdominal", "core", "Finalize com retroversão pélvica."),
  ],
  [
    e("flexora-deitada", "Mesa Flexora", 3, [8, 10], [1, 1], [120, 120], "Posteriores", "hamstrings", "Mantenha o quadril apoiado."),
    e("bulgarian-split-squat", "Agachamento Búlgaro com Halteres", 3, [8, 10], [1, 2], [120, 120], "Quadríceps e glúteos", "quads", "Tronco estável e amplitude consistente.", { repsLabel: "8–10 por perna" }),
    e("stiff-halteres", "Stiff Leg Deadlift com Halteres", 3, [10, 12], [1, 2], [150, 150], "Posteriores", "hamstrings", "Joelhos quase estendidos e alongamento profundo."),
    e("cadeira-extensora", "Cadeira Extensora Unilateral", 2, [12, 15], [0, 1], [90, 90], "Quadríceps", "quads", "Controle e pico de contração.", { repsLabel: "12–15 por perna" }),
    e("panturrilha-sentada", "Panturrilha Sentada", 4, [12, 15], [0, 1], [90, 90], "Panturrilhas", "calves", "Pause dois segundos na dorsiflexão."),
  ],
  [
    e("ab-machine-crunch", "Ab Machine ou Cable Crunch", 4, [12, 15], [0, 1], [90, 90], "Reto abdominal", "core", "Use carga progressiva e contração de um segundo."),
    e("panturrilha-unilateral-halter", "Panturrilha em Pé Unilateral com Halter", 4, [10, 12], [0, 0], [90, 90], "Panturrilhas", "calves", "Amplitude total no degrau."),
  ],
);

const block2Days = maleDays(
  [
    e("supino-inclinado-smith", "Supino Inclinado no Smith", 3, [6, 8], [1, 2], [180, 180], "Peitoral clavicular", "chest", "Banco a 30° e pausa controlada."),
    e("puxada-supinada", "Puxada Aberta com Pegada Supinada", 3, [8, 10], [1, 2], [150, 150], "Dorsais", "back", "Alongue totalmente no topo."),
    e("supino-halteres", "Supino Reto com Halteres", 3, [8, 10], [1, 1], [120, 120], "Peitoral", "chest", "Use amplitude máxima controlada."),
    e("remada-apoiada-peito", "Remada Apoiada no Peito", 3, [8, 10], [1, 1], [120, 120], "Costas superiores", "back", "Mantenha estabilidade torácica."),
    e("elevacao-lateral-cabo", "Elevação Lateral Unilateral no Cabo", 4, [10, 12], [0, 1], [90, 90], "Deltoide lateral", "shoulders", "Execução contínua por braço."),
    e("panturrilha-smith", "Panturrilha em Pé no Smith", 4, [8, 10], [0, 0], [90, 90], "Panturrilhas", "calves", "Carga alta sem perder a pausa alongada."),
  ],
  [
    e("leg-press", "Leg Press 45° Pesado", 3, [6, 8], [1, 2], [180, 180], "Quadríceps", "quads", "Amplitude total sem retroversão pélvica."),
    e("cadeira-extensora", "Cadeira Extensora", 3, [10, 12], [0, 0], [120, 120], "Quadríceps", "quads", "Partiais alongadas somente após a última série prevista."),
    e("stiff-barra", "Stiff com Barra", 3, [8, 10], [1, 2], [180, 180], "Posteriores", "hamstrings", "Estenda o quadril com joelhos estáveis."),
    e("flexora-deitada", "Mesa Flexora", 3, [10, 12], [1, 1], [90, 90], "Posteriores", "hamstrings", "Excêntrica em três segundos."),
    e("decline-crunch", "Decline Crunch com Anilha", 4, [10, 12], [0, 1], [90, 90], "Reto abdominal", "core", "Mantenha a anilha junto ao esterno."),
  ],
  [
    e("desenvolvimento-halteres", "Desenvolvimento com Halteres", 3, [6, 8], [1, 2], [150, 150], "Deltoide anterior", "shoulders", "Desça até a altura dos ombros."),
    e("crucifixo-inclinado-cabo", "Crucifixo Inclinado com Cabos", 3, [10, 12], [1, 1], [90, 90], "Peitoral clavicular", "chest", "Mantenha tensão em toda a amplitude."),
    e("elevacao-lateral-cabo", "Elevação Lateral no Cabo por Trás", 4, [10, 12], [0, 1], [90, 90], "Deltoide lateral", "shoulders", "Inicie com o cabo atrás do quadril."),
    e("triceps-testa-halteres", "Tríceps Testa com Halteres", 3, [8, 10], [1, 1], [90, 90], "Tríceps", "triceps", "Punhos neutros e posição estável."),
    e("triceps-frances-cabo", "Tríceps Francês Unilateral no Cabo", 3, [10, 12], [0, 1], [90, 90], "Tríceps", "triceps", "Alongamento profundo da cabeça longa."),
    e("panturrilha-leg-press", "Panturrilha no Leg Press", 4, [10, 12], [0, 0], [90, 90], "Panturrilhas", "calves", "Pause dois segundos em dorsiflexão."),
  ],
  [
    e("puxada-triangulo", "Puxada Frente com Triângulo", 3, [8, 10], [1, 1], [120, 120], "Dorsais", "back", "Puxe até a região esternal."),
    e("remada-t-bar", "Remada T-Bar", 3, [8, 10], [1, 2], [120, 120], "Costas superiores", "back", "Sem impulso lombar."),
    e("face-pull", "Face Pull com Corda", 3, [12, 15], [0, 1], [90, 90], "Deltoide posterior", "shoulders", "Puxe em direção à testa separando a corda."),
    e("rosca-barra-w", "Rosca Direta com Barra W", 3, [8, 10], [1, 1], [90, 90], "Bíceps", "biceps", "Tronco ereto, sem balanço."),
    e("rosca-martelo", "Rosca Martelo com Halteres", 3, [10, 12], [0, 1], [90, 90], "Bíceps e braquial", "biceps", "Pegada neutra estrita."),
    e("cable-crunch", "Cable Crunch Ajoelhado", 4, [10, 12], [0, 1], [90, 90], "Reto abdominal", "core", "Mantenha o quadril fixo."),
  ],
  [
    e("flexora-sentada", "Cadeira Flexora", 3, [8, 10], [1, 1], [120, 120], "Posteriores", "hamstrings", "Contração de um segundo e excêntrica lenta."),
    e("hack-squat", "Agachamento Hack com Pés Baixos", 3, [8, 10], [1, 2], [180, 180], "Quadríceps", "quads", "Use flexão profunda de joelho."),
    e("romanian-deadlift", "RDL com Halteres", 3, [8, 10], [1, 1], [150, 150], "Posteriores", "hamstrings", "Use amplitude máxima com coluna estável."),
    e("sissy-squat", "Sissy Squat ou Cadeira Extensora", 2, [12, 15], [0, 1], [90, 90], "Quadríceps", "quads", "Priorize o alongamento do reto femoral.", { requiresSelection: true }),
    e("panturrilha-sentada", "Panturrilha Sentada", 4, [10, 12], [0, 0], [90, 90], "Panturrilhas", "calves", "Pause dois segundos no alongamento."),
  ],
  [
    e("hanging-leg-raise", "Hanging Leg Raise", 4, [10, 12], [0, 1], [90, 90], "Reto abdominal", "core", "Eleve e rode a pelve, não apenas as pernas."),
    e("panturrilha-smith-unilateral", "Panturrilha em Pé Unilateral no Smith", 4, [10, 12], [0, 0], [90, 90], "Panturrilhas", "calves", "Pause no pico e no alongamento."),
  ],
);

const block3Days = maleDays(
  [
    e("supino-barra", "Supino Reto com Barra Livre", 3, [5, 7], [2, 2], [210, 210], "Peitoral", "chest", "Cada repetição parte de posição estável."),
    e("remada-pendlay", "Remada Pendlay com Barra", 3, [6, 8], [2, 2], [180, 180], "Costas superiores", "back", "A barra parte parada do solo."),
    e("desenvolvimento-militar", "Desenvolvimento Militar em Pé", 3, [6, 8], [2, 2], [180, 180], "Deltoide anterior", "shoulders", "Tronco firme e glúteos contraídos."),
    e("puxada-neutra", "Puxada Alta Neutra", 3, [8, 10], [1, 2], [120, 120], "Dorsais", "back", "Use uma puxada vertical profunda."),
    e("elevacao-lateral", "Elevação Lateral Pesada", 4, [8, 10], [1, 1], [90, 90], "Deltoide lateral", "shoulders", "Controle estrito sem impulso exagerado."),
    e("panturrilha-smith", "Panturrilha em Pé no Smith", 4, [8, 10], [0, 1], [90, 90], "Panturrilhas", "calves", "Pause dois segundos em dorsiflexão."),
  ],
  [
    e("agachamento-livre", "Agachamento Livre com Barra", 3, [6, 8], [2, 2], [210, 210], "Quadríceps", "quads", "Use profundidade abaixo do paralelo com controle."),
    e("romanian-deadlift", "RDL com Barra Livre", 3, [6, 8], [2, 2], [180, 180], "Posteriores", "hamstrings", "Carga alta sem perder a coluna neutra."),
    e("leg-press", "Leg Press 45°", 3, [8, 10], [1, 2], [150, 150], "Quadríceps", "quads", "Posição média dos pés."),
    e("flexora-sentada", "Cadeira Flexora", 3, [8, 10], [1, 1], [90, 90], "Posteriores", "hamstrings", "Controle a fase excêntrica."),
    e("ab-machine-crunch", "Ab Machine ou Cable Crunch", 4, [8, 10], [0, 1], [90, 90], "Reto abdominal", "core", "Use carga alta com flexão completa."),
  ],
  [
    e("supino-inclinado-halteres", "Supino Inclinado com Halteres", 3, [6, 8], [1, 2], [180, 180], "Peitoral clavicular", "chest", "Carga alta com amplitude total."),
    e("dips-com-carga", "Dips com Carga Adicional", 3, [8, 10], [1, 2], [150, 150], "Peitoral", "chest", "Incline o tronco aproximadamente 30°."),
    e("elevacao-lateral-cabo", "Elevação Lateral Unilateral no Cabo", 4, [8, 10], [0, 1], [90, 90], "Deltoide lateral", "shoulders", "Mantenha tensão constante."),
    e("supino-fechado", "Supino Inclinado Fechado", 3, [6, 8], [1, 2], [150, 150], "Tríceps", "triceps", "Pegada na largura dos ombros."),
    e("triceps-polia-barra", "Tríceps Pulley com Barra Reta", 3, [8, 10], [0, 1], [90, 90], "Tríceps", "triceps", "Complete a extensão dos cotovelos."),
    e("panturrilha-leg-press", "Panturrilha no Leg Press", 4, [8, 10], [0, 0], [90, 90], "Panturrilhas", "calves", "Pausa obrigatória no alongamento."),
  ],
  [
    e("remada-curvada-supinada", "Remada Curvada Supinada", 3, [6, 8], [1, 2], [180, 180], "Dorsais", "back", "Puxe a barra até o umbigo."),
    e("puxada-aberta", "Puxada Aberta no Cabo", 3, [8, 10], [1, 1], [120, 120], "Costas superiores", "back", "Finalize aproximando as escápulas."),
    e("crucifixo-inverso", "Crucifixo Invertido no Banco Inclinado", 3, [10, 12], [0, 1], [90, 90], "Deltoide posterior", "shoulders", "Mantenha o tronco apoiado."),
    e("rosca-barra", "Rosca Direta com Barra", 3, [6, 8], [1, 1], [120, 120], "Bíceps", "biceps", "Carga alta com movimento controlado."),
    e("rosca-inclinada-halteres", "Rosca no Banco Inclinado", 3, [8, 10], [0, 1], [90, 90], "Bíceps", "biceps", "Use amplitude completa em alongamento."),
    e("elevacao-joelhos", "Hanging Knee Raise com Carga", 4, [10, 12], [0, 1], [90, 90], "Reto abdominal", "core", "Adicione carga apenas mantendo a retroversão pélvica."),
  ],
  [
    e("flexora-deitada", "Mesa Flexora", 3, [6, 8], [1, 1], [150, 150], "Posteriores", "hamstrings", "Carga alta com controle excêntrico."),
    e("hack-squat", "Agachamento Hack", 3, [6, 8], [1, 2], [180, 180], "Quadríceps", "quads", "Use amplitude total de joelhos."),
    e("stiff-halteres", "Stiff com Halteres", 3, [8, 10], [1, 1], [120, 120], "Posteriores", "hamstrings", "Pause um segundo na posição alongada."),
    e("cadeira-extensora", "Cadeira Extensora", 2, [10, 12], [0, 0], [90, 90], "Quadríceps", "quads", "Última série próxima da falha com controle."),
    e("panturrilha-sentada", "Panturrilha Sentada", 4, [8, 10], [0, 0], [90, 90], "Panturrilhas", "calves", "Use cargas altas com amplitude completa."),
  ],
  [
    e("cable-crunch", "Cable Crunch Pesado", 4, [8, 10], [0, 1], [90, 90], "Reto abdominal", "core", "Enfatize a flexão da coluna."),
    e("panturrilha-unilateral-peso-corporal", "Panturrilha em Pé Unilateral", 4, [12, 15], [0, 0], [60, 60], "Panturrilhas", "calves", "Pause três segundos no alongamento."),
  ],
);

const block4Days = maleDays(
  [
    e("supino-inclinado-halteres", "Supino Inclinado com Halteres", 3, [8, 10], [1, 1], [150, 150], "Peitoral clavicular", "chest", "Execução controlada."),
    e("puxada-articulada-unilateral", "Puxada Articulada Unilateral", 3, [8, 10], [1, 1], [120, 120], "Dorsais", "back", "Use vetor de puxada limpo."),
    e("supino-maquina", "Supino Reto em Máquina Convergente", 3, [8, 10], [0, 1], [120, 120], "Peitoral", "chest", "A máquina permite aproximação segura da falha."),
    e("remada-apoiada-cabo", "Remada Neutra Apoiada no Cabo", 3, [8, 10], [1, 1], [120, 120], "Costas superiores", "back", "Puxe até o abdômen superior."),
    e("elevacao-lateral-cabo", "Elevação Lateral no Cabo", 4, [10, 12], [0, 0], [90, 90], "Deltoide lateral", "shoulders", "Myo-reps apenas na última série quando recuperado."),
    e("panturrilha-smith", "Panturrilha em Pé no Smith", 4, [10, 12], [0, 0], [90, 90], "Panturrilhas", "calves", "Pausa rigorosa de dois segundos embaixo."),
  ],
  [
    e("leg-press", "Leg Press 45°", 3, [8, 10], [1, 1], [180, 180], "Quadríceps", "quads", "Carga alta com técnica preservada."),
    e("cadeira-extensora", "Cadeira Extensora", 3, [10, 12], [0, 0], [120, 120], "Quadríceps", "quads", "Drop-set somente após a última série prevista."),
    e("romanian-deadlift", "RDL com Barra", 3, [8, 10], [1, 2], [150, 150], "Posteriores", "hamstrings", "Mantenha alinhamento da coluna e quadril."),
    e("flexora-deitada", "Mesa Flexora", 3, [10, 12], [0, 0], [90, 90], "Posteriores", "hamstrings", "Controle total da excêntrica."),
    e("decline-crunch", "Decline Crunch com Carga", 4, [10, 12], [0, 1], [90, 90], "Reto abdominal", "core", "Use amplitude vertebral completa."),
  ],
  [
    e("desenvolvimento-smith", "Desenvolvimento Sentado no Smith", 3, [8, 10], [1, 1], [150, 150], "Deltoide anterior", "shoulders", "Desça a barra até a linha do queixo."),
    e("crossover-polia-media", "Crossover na Polia Média", 3, [10, 12], [0, 1], [90, 90], "Peitoral", "chest", "Segure o pico de contração por um segundo."),
    e("elevacao-lateral", "Elevação Lateral com Halteres", 4, [10, 12], [0, 1], [90, 90], "Deltoide lateral", "shoulders", "Mantenha tensão focada no deltoide lateral."),
    e("triceps-testa-cabo", "Tríceps Testa no Cabo", 3, [10, 12], [0, 1], [90, 90], "Tríceps", "triceps", "Posicione-se longe da polia para alongar."),
    e("triceps-coice-cabo", "Tríceps Coice Unilateral no Cabo", 3, [10, 12], [0, 0], [60, 60], "Tríceps", "triceps", "Mantenha o úmero paralelo ao solo."),
    e("panturrilha-leg-press", "Panturrilha no Leg Press", 4, [10, 12], [0, 0], [90, 90], "Panturrilhas", "calves", "Pause dois segundos no alongamento."),
  ],
  [
    e("puxada-aberta", "Puxada Alta com Barra Larga", 3, [8, 10], [1, 1], [120, 120], "Dorsais", "back", "Puxe à frente com técnica limpa."),
    e("remada-serrote", "Remada Unilateral com Halter", 3, [8, 10], [1, 1], [120, 120], "Costas", "back", "Mantenha o tronco paralelo ao banco."),
    e("crucifixo-inverso", "Crucifixo Invertido no Peck Deck", 3, [10, 12], [0, 1], [90, 90], "Deltoide posterior", "shoulders", "Foque no deltoide posterior."),
    e("rosca-scott", "Rosca Scott na Máquina ou Barra W", 3, [8, 10], [0, 1], [90, 90], "Bíceps", "biceps", "Controle o ponto de maior flexão."),
    e("rosca-martelo-corda", "Rosca Martelo no Cabo com Corda", 3, [10, 12], [0, 0], [90, 90], "Bíceps e braquial", "biceps", "Mantenha tensão constante."),
    e("cable-crunch", "Cable Crunch Ajoelhado", 4, [10, 12], [0, 0], [90, 90], "Reto abdominal", "core", "Contração forte no final."),
  ],
  [
    e("flexora-sentada", "Cadeira Flexora", 3, [8, 10], [0, 1], [120, 120], "Posteriores", "hamstrings", "Controle excêntrico rigoroso."),
    e("bulgarian-split-squat", "Agachamento Búlgaro com Halteres", 3, [8, 10], [1, 1], [150, 150], "Quadríceps e glúteos", "quads", "Use o unilateral para equilíbrio muscular.", { repsLabel: "8–10 por perna" }),
    e("stiff-barra", "Stiff Leg Deadlift com Barra", 3, [8, 10], [1, 1], [150, 150], "Posteriores", "hamstrings", "Mantenha a posição alongada profunda."),
    e("cadeira-extensora", "Cadeira Extensora", 2, [10, 12], [0, 0], [90, 90], "Quadríceps", "quads", "Aproxime-se da falha sem alterar a execução."),
    e("panturrilha-sentada", "Panturrilha Sentada", 4, [10, 12], [0, 0], [90, 90], "Panturrilhas", "calves", "Pause dois segundos na dorsiflexão."),
  ],
  [
    e("hanging-leg-raise", "Hanging Leg Raise", 4, [10, 12], [0, 0], [90, 90], "Reto abdominal", "core", "Finalize com elevação pélvica."),
    e("panturrilha-unilateral-peso-corporal", "Panturrilha em Pé Unilateral", 4, [10, 12], [0, 0], [90, 90], "Panturrilhas", "calves", "Use alongamento completo."),
  ],
);

export const maleProgramV2: ProgramSeed = {
  key: "male-2026",
  name: "Programa Anual de Hipertrofia e Recomposição — versão PDF 2026",
  description: "Programa masculino anual extraído de new_correct_train, com cinco sessões principais, descanso de musculação na quinta e especialização curta no domingo.",
  sourceResearch: "new_correct_train/Programa Anual de Hipertrofia e Recomposição.pdf",
  version: "2026.2",
  profile: { sex: "male", heightCm: 190, currentWeightGrams: 96000, themeKey: "midnight", accentColor: "#79F2B0" },
  readaptation: "A versão do novo PDF começa pelo Bloco 1 de recomposição e força base. A ficha não reduz séries automaticamente nas duas primeiras semanas.",
  progressionPolicy,
  recoveryPolicy,
  blocks: [
    { number: 1, name: "Recomposição e força base", weeks: [1, 13], objective: "Estabelecer força base e aderência durante a recomposição.", description: "Cinco sessões principais, quinta sem musculação e especialização curta no domingo.", differences: "Base das fichas do novo PDF.", volumeSummary: "Peitoral e dorsais em dois estímulos; panturrilha em quatro exposições; abdômen em três.", days: block1Days, cardio: cardioDays(40, 35, "9.000") },
    { number: 2, name: "Consolidação da hipertrofia", weeks: [14, 26], objective: "Consolidar hipertrofia mantendo o déficit e a qualidade das séries.", description: "Variações de exercícios e intensificação seletiva em isoladores.", differences: "Faixas e exercícios seguem as tabelas detalhadas do Bloco 2.", volumeSummary: "Distribuição semanal mantida com quatro exposições de panturrilha e três de abdômen.", days: block2Days, cardio: cardioDays(45, 40, "10.000") },
    { number: 3, name: "Manutenção e ressensibilização", weeks: [27, 39], objective: "Priorizar tensão mecânica e performance em faixas mais baixas.", description: "Compostos recebem mais descanso e permanecem afastados da falha técnica.", differences: "Faixas principais caem para 5–10 repetições conforme o exercício.", volumeSummary: "Volume distribuído em seis exposições de musculação, incluindo a sessão curta de domingo.", days: block3Days, cardio: cardioDays(35, 30, "8.500") },
    { number: 4, name: "Polimento estético e performance", weeks: [40, 52], objective: "Consolidar a performance e finalizar o ciclo anual.", description: "Métodos de intensificação permanecem opcionais e restritos aos isoladores indicados.", differences: "Fichas finais do documento, sem troca automática de carga ou exercício.", volumeSummary: "Panturrilha e abdômen permanecem distribuídos; quinta continua sem musculação.", days: block4Days, cardio: cardioDays(45, 45, "10.500") },
  ],
  scienceTopics: [
    ...commonScienceTopics,
    { category: "source", title: "Fonte desta versão", summary: "As fichas, séries, repetições, RIR e descansos foram transcritos do PDF Programa Anual de Hipertrofia e Recomposição em new_correct_train." },
    { category: "calves", title: "Panturrilhas", summary: "O programa usa quatro exposições semanais e combina trabalho com joelhos estendidos e flexionados, sempre preservando amplitude e pausa no alongamento." },
    { category: "core", title: "Abdômen com sobrecarga", summary: "Cable crunch, machine crunch e elevações de pernas recebem progressão mensurável em vez de séries altas sem carga definida." },
  ],
  references: commonReferences,
};
