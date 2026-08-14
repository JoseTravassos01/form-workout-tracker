import { commonScienceTopics } from "./common";
import { femaleProgramV2 } from "./female-program-v2";
import { cardio, day, exercise as x, recoveryDay, type ExerciseSeed, type ProgramSeed } from "./types";

const progressionPolicy = {
  kind: "double_progression",
  increaseWhen: "all_sets_at_rep_ceiling_with_prescribed_rir_and_stable_technique",
  holdWhen: "not_all_sets_at_ceiling",
  isolatorIncrease: "smallest_available_increment",
  neverAutomatic: true,
} as const;

const recoveryPolicy = {
  deloadDays: [7, 7],
  trigger: { minimumPersistentSignals: 2, comparableExposureRepLoss: 2 },
  deload: { volumePercent: [50, 50], loadPercent: [85, 90], rir: [3, 4], failure: false, zoneOneOnly: true },
} as const;

const upper = (): ExerciseSeed[] => [
  x("puxada-neutra", "Puxada Alta Neutra", 3, [10, 12], [2, 2], [90, 90], "Costas", "back", "Puxe até o peito superior e inicie deprimindo as escápulas."),
  x("remada-apoiada-peito", "Remada com Apoio no Peito", 3, [10, 12], [2, 2], [90, 90], "Costas", "back", "Mantenha o peito apoiado e os cotovelos próximos do tronco."),
  x("elevacao-lateral", "Elevação Lateral com Halteres ou Cabo", 3, [12, 15], [1, 2], [75, 75], "Deltoide lateral", "shoulders", "Eleve no plano da escápula sem usar impulso."),
  x("crucifixo-inverso", "Crucifixo Invertido", 3, [12, 15], [1, 2], [75, 75], "Deltoide posterior", "shoulders", "Use banco inclinado ou peck deck invertido e não encolha os ombros."),
  x("triceps-corda", "Tríceps Corda na Polia", 3, [10, 12], [1, 2], [75, 75], "Tríceps", "triceps", "Mantenha os cotovelos fixos ao lado do tronco."),
  x("rosca-alternada-halteres", "Rosca Alternada com Halteres", 2, [10, 12], [2, 2], [75, 75], "Bíceps", "biceps", "Faça a supinação sem deslocar o ombro."),
];

function lowerA(directSets: number, adductorSets: number, rir: readonly [number, number]): ExerciseSeed[] {
  return [
    x("abducao-maquina", "Cadeira Abdutora", directSets, [8, 12], rir, [90, 90], "Glúteo médio", "glute_medius_direct", "Tronco levemente inclinado, pelve estável e excêntrica controlada por dois segundos.", { countsAsDirectGluteMedius: true }),
    x("hip-thrust", "Hip Thrust com Barra", 4, [8, 10], [1, 2], [150, 150], "Glúteo máximo", "glutes", "Finalize com retroversão pélvica e uma pausa no topo."),
    x("bulgarian-split-squat", "Agachamento Búlgaro", 3, [10, 12], [2, 2], [120, 120], "Glúteo máximo", "glutes", "Incline levemente o tronco e preserve o controle da pelve.", { repsLabel: "10–12 por perna", secondaryMuscles: "Quadríceps; glúteo médio como estabilizador" }),
    x("flexora-sentada", "Cadeira Flexora", 3, [10, 12], [1, 1], [90, 90], "Posteriores", "hamstrings", "Mantenha o quadril firme e complete a flexão do joelho."),
    x("adutora", "Cadeira Adutora", adductorSets, [12, 15], [1, 2], [90, 90], "Adutores", "adductors", "Use amplitude completa e alongamento controlado."),
  ];
}

function lowerB(directSets: number, standingCalfSets: number, rir: readonly [number, number]): ExerciseSeed[] {
  return [
    x("abducao-unilateral-polia", "Abdução Unilateral no Cabo", directSets, [10, 12], rir, [90, 90], "Glúteo médio", "glute_medius_direct", "Cruze a perna por trás no início sem girar a pelve.", { repsLabel: "10–12 por lado", countsAsDirectGluteMedius: true }),
    x("hack-squat", "Agachamento Hack", 4, [8, 10], [2, 2], [150, 150], "Quadríceps", "quads", "Use posição estável e a maior flexão de joelho controlável."),
    x("leg-press", "Leg Press 45°", 3, [10, 12], [2, 2], [120, 120], "Quadríceps", "quads", "Use amplitude total sem perder o apoio da pelve."),
    x("cadeira-extensora", "Cadeira Extensora", 3, [12, 15], [0, 1], [90, 90], "Quadríceps", "quads", "Faça uma pausa de um segundo no pico de contração."),
    x("panturrilha-em-pe", "Panturrilha em Pé na Máquina", standingCalfSets, [10, 12], [1, 1], [90, 90], "Panturrilhas", "calves", "Use amplitude total e pause dois segundos no alongamento."),
  ];
}

function lowerC(seatedCalfSets: number): ExerciseSeed[] {
  return [
    x("romanian-deadlift", "Stiff com Barra / RDL", 4, [8, 10], [2, 2], [120, 120], "Posteriores", "hamstrings", "Mantenha a barra perto da tíbia e pare antes de perder a posição da coluna."),
    x("glute-drive", "Elevação Pélvica na Máquina", 3, [10, 12], [1, 1], [120, 120], "Glúteo máximo", "glutes", "Busque extensão do quadril sem hiperextender a lombar."),
    x("flexora-deitada", "Mesa Flexora", 4, [10, 12], [1, 1], [90, 90], "Posteriores", "hamstrings", "Mantenha o quadril apoiado e faça a excêntrica em três segundos."),
    x("panturrilha-sentada", "Panturrilha Sentada", seatedCalfSets, [12, 15], [1, 1], [75, 75], "Panturrilhas", "calves", "Use ritmo controlado e amplitude completa."),
  ];
}

function specialization(machineSets: number, lyingSets: number, calfSets: number, advanced = false): ExerciseSeed[] {
  const exercises: ExerciseSeed[] = [];
  if (lyingSets > 0) exercises.push(x("abducao-deitada", "Abdução Deitada de Lado", lyingSets, [12, 15], [0, 1], [60, 60], "Glúteo médio", "glute_medius_direct", "Não gire a pelve; use amplitude reproduzível.", { equipment: "Banco e caneleira", countsAsDirectGluteMedius: true }));
  if (machineSets > 0) exercises.push(x("abducao-maquina", "Cadeira Abdutora — Especialização", machineSets, [12, 15], [0, 1], [60, 60], "Glúteo médio", "glute_medius_direct", advanced ? "Última série pode usar rest-pause somente com técnica estável e sem dor." : "Use execução contínua, sem impulso e com pelve estável.", { countsAsDirectGluteMedius: true }));
  exercises.push(
    x("panturrilha-leg-press", "Panturrilha no Leg Press", calfSets, [12, 15], [1, 1], [75, 75], "Panturrilhas", "calves", "Enfatize o alongamento na parte inferior."),
    x("prancha-lateral-abducao", "Prancha Lateral com Abdução", 3, [10, 12], [1, 2], [60, 60], "Core", "core", "Mantenha a pelve alinhada enquanto eleva a perna.", { repsLabel: "10–12 por lado", equipment: "Peso corporal" }),
  );
  return exercises;
}

function weeklyDays(direct: readonly [number, number, number, number], adductorSets: number, calves: readonly [number, number, number], advanced = false) {
  const directRir = advanced ? [0, 1] as const : [1, 1] as const;
  return [
    day(1, "Lower A — Glúteo Médio + Glúteo Máximo", lowerA(direct[0], adductorSets, directRir), "Glúteo médio abre a sessão enquanto a atleta está fresca; hip thrust e búlgaro completam o estímulo de quadril."),
    day(2, "Upper — Manutenção de Superiores", upper(), "Exatamente seis exercícios: duas puxadas/remadas, dois ombros, um tríceps e um bíceps; sem peitoral."),
    day(3, "Lower B — Quadríceps + Glúteo Médio", lowerB(direct[1], calves[0], directRir), "Abdução no cabo prioritária seguida do trabalho de quadríceps."),
    recoveryDay(4, "Descanso total / recuperação ativa", "Sem musculação. Caminhada leve ou Zone 2 somente se não piorar a recuperação."),
    day(5, "Lower C — Posteriores + Glúteo Máximo", lowerC(calves[1]), "Sessão de posteriores e glúteo máximo sem adicionar uma quarta exposição direta de abdução."),
    day(6, "Especialização curta — Glúteo Médio + Panturrilha + Core", specialization(direct[2], direct[3], calves[2], advanced), "Sessão curta de aproximadamente 35–40 minutos, sem agachamentos ou levantamentos pesados."),
    recoveryDay(7, "Descanso total", "Recuperação completa; caminhada leve é opcional."),
  ];
}

function zone2(thursdayMinutes: readonly [number, number]) {
  return [
    cardio(2, "Zone 2 pós-treino", [30, 40], [3, 4], "Leve–moderada", "Bicicleta, elíptico ou caminhada inclinada; deve ser possível conversar.", "Evite corrida e escada antes das sessões prioritárias."),
    cardio(4, "Zone 2 / recuperação ativa", thursdayMinutes, [3, 4], "Leve–moderada", "Sem HIIT; interrompa se houver fadiga residual importante.", "O dia continua sem musculação."),
    cardio(7, "Zone 2 opcional", [30, 40], [3, 4], "Leve–moderada", "Modalidade de baixo impacto e teste da fala.", "Pode ser omitido quando a recuperação pedir descanso total."),
  ];
}

export const femaleProgramV3: ProgramSeed = {
  key: "female-2026",
  name: "Programa de Treino Glúteo Médio — versão PDF 2026",
  description: "Programa anual feminino extraído de new_correct_train, com cinco sessões semanais e especialização direta de glúteo médio distribuída em três exposições.",
  sourceResearch: "new_correct_train/Programa de Treino Glúteo Médio.pdf",
  version: "2026.3",
  profile: { sex: "female", themeKey: "midnight", accentColor: "#C7A7FF" },
  readaptation: "Estabeleça um baseline técnico antes de intensificar. O volume direto segue a síntese anual do PDF e não deve ser aumentado fora da ficha sem resposta e recuperação adequadas.",
  progressionPolicy,
  recoveryPolicy,
  blocks: [
    { number: 1, name: "Baseline e sobrecarga mecânica", weeks: [1, 13], objective: "Padronizar execução e estabelecer cargas de referência.", description: "Cinco sessões, sendo a de sábado curta e sem compostos pesados.", differences: "Base do novo documento de glúteo médio.", volumeSummary: "Glúteo médio: 11 séries diretas/semana em três exposições.", days: weeklyDays([4, 4, 3, 0], 3, [4, 3, 4]), cardio: zone2([30, 40]) },
    { number: 2, name: "Sobrecarga progressiva e expansão", weeks: [14, 26], objective: "Expandir o volume direto mantendo a qualidade.", description: "A sessão curta recebe uma segunda variação de abdução sem adicionar compostos pesados.", differences: "Glúteo médio sobe de 11 para 13 séries diretas.", volumeSummary: "Glúteo médio: 13 séries diretas/semana em três exposições.", days: weeklyDays([4, 4, 2, 3], 4, [4, 3, 4]), cardio: zone2([30, 40]) },
    { number: 3, name: "Especialização máxima em Glúteo Médio", weeks: [27, 39], objective: "Atingir o pico anual de especialização previsto no PDF.", description: "Técnicas avançadas ficam restritas à última série dos isoladores e nunca são automáticas.", differences: "Pico de 15 séries diretas; cancelar intensificação em estado amarelo de recuperação.", volumeSummary: "Glúteo médio: 15 séries diretas/semana em três exposições.", days: weeklyDays([4, 4, 4, 3], 4, [4, 4, 4], true), cardio: zone2([30, 35]) },
    { number: 4, name: "Consolidação e polimento", weeks: [40, 52], objective: "Consolidar carga e reduzir o volume após o pico.", description: "Mantém os exercícios produtivos e retorna a uma dose mais sustentável.", differences: "Glúteo médio recua de 15 para 12 séries diretas.", volumeSummary: "Glúteo médio: 12 séries diretas/semana em três exposições.", days: weeklyDays([4, 4, 4, 0], 3, [3, 3, 4]), cardio: zone2([30, 40]) },
  ],
  scienceTopics: [
    ...commonScienceTopics,
    { category: "glute-medius", title: "Especialização do glúteo médio no novo programa", summary: "A ficha distribui o trabalho direto entre cadeira abdutora, cabo e uma sessão curta. Exercícios unilaterais entram como estímulo secundário e não são somados ao contador direto." },
    { category: "source", title: "Fonte desta versão", summary: "As fichas, séries, repetições, RIR e descansos foram transcritos do PDF Programa de Treino Glúteo Médio em new_correct_train. Inconsistências internas de soma foram resolvidas pela síntese anual de 11, 13, 15 e 12 séries diretas e pela regra de três exposições semanais." },
  ],
  references: femaleProgramV2.references,
};
