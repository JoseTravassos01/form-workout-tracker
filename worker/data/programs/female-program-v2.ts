import { commonScienceTopics } from "./common";
import { cardio, day, exercise as x, recoveryDay, type ProgramSeed } from "./types";

const progressionPolicy = {
  kind: "double_progression_autoregulated",
  loadIncreasePercentCompoundLegs: [2.5, 5],
  isolatorIncrease: "smallest_available_increment",
  increaseWhen: "all_sets_at_rep_ceiling_with_prescribed_rir_full_rom_and_consistent_technique",
  partialCeilingAction: "hold_load_and_add_repetitions",
  automaticLoadIncrease: false,
  directGluteMediusVolumeTargets: { block1: 8, block2: 10, block3: 11, block4: 9 },
  addDirectSetOnlyWhen: ["good_recovery", "no_joint_pain", "stable_or_rising_performance", "consistent_technique", "no_relevant_residual_fatigue"],
  holdVolumeWhenProgressing: true,
  reduceAfterConsecutivePoorExposures: 2,
} as const;

const recoveryPolicy = {
  deloadDays: [5, 7],
  trigger: { performanceDropSessions: 2, additionalSignals: 2 },
  deload: { volumeReductionPercent: 50, loadPercent: [85, 90], rir: [4, 5], failure: false, keepExercises: true },
  yellow: { holdLoad: true, doNotAddSets: true, temporaryRirIncrease: 1, mayReduceWeeklySets: [1, 2] },
} as const;

const upper = () => [
  x("puxada-neutra", "Puxada alta pegada neutra", 2, [8, 12], [1, 2], [120, 120], "Costas", "back", "Amplitude completa e tronco estável."),
  x("remada-apoiada-peito", "Remada apoiada no peito", 2, [8, 12], [1, 2], [120, 120], "Costas", "back", "Mantenha o peito apoiado e evite impulso."),
  x("desenvolvimento-maquina", "Desenvolvimento em máquina", 2, [8, 12], [1, 2], [120, 120], "Ombros", "shoulders", "Use amplitude confortável e controle a descida."),
  x("elevacao-lateral-cabo", "Elevação lateral no cabo", 2, [12, 20], [1, 2], [60, 90], "Deltoide lateral", "shoulders", "Eleve sem balanço; a última série pode chegar a 0–1 RIR apenas quando técnica e recuperação estiverem boas."),
  x("triceps-overhead", "Extensão de tríceps no cabo acima da cabeça", 2, [10, 15], [1, 2], [60, 90], "Tríceps", "triceps", "Mantenha os braços estáveis e use alongamento confortável."),
  x("rosca-scott", "Rosca Scott máquina/cabo", 2, [10, 15], [1, 2], [60, 90], "Bíceps", "biceps", "Mantenha o braço apoiado e evite retirar tensão com impulso."),
];

const directNotes = "Use dupla progressão. Mantenha a carga enquanto ganha repetições. Só considere o menor incremento quando todas as séries chegarem ao topo com RIR prescrito, ROM completo e execução igual à anterior.";

function lowerA(directSets: number, directRir: readonly [number, number], optionalFinalNearFailure: boolean) {
  return [
    x("agachamento-smith", "Agachamento Smith", 3, [6, 10], [2, 2], [180, 180], "Quadríceps", "quads", "Não buscar falha; preserve amplitude e posição estáveis.", { secondaryMuscles: "Glúteo máximo; glúteo médio como estímulo indireto" }),
    x("leg-press", "Leg Press", 3, [10, 15], [1, 2], [150, 180], "Quadríceps", "quads", "Mantenha a pelve apoiada e não reduza amplitude para mover mais carga.", { secondaryMuscles: "Glúteo máximo" }),
    x("bulgarian-split-squat", "Afundo Búlgaro", 2, [8, 12], [2, 2], [120, 150], "Quadríceps/glúteos", "glutes", "Controle a pelve e use a mesma amplitude entre semanas; não conta como série direta de abdução.", { repsLabel: "8–12 por perna", secondaryMuscles: "Glúteo médio como estímulo indireto" }),
    x("cadeira-extensora", "Cadeira Extensora", 2, [10, 15], [1, 2], [90, 120], "Quadríceps", "quads", "Controle a descida; a última série pode chegar seletivamente a 0–1 RIR."),
    x("abducao-maquina", "Cadeira Abdutora", directSets, [12, 20], directRir, [60, 90], "Glúteo médio", "glute_medius_direct", "Use ROM completo, pelve estável e sem impulso. Inclinar o tronco apenas para mover mais peso não conta como progressão.", { progressionNotes: `${directNotes}${optionalFinalNearFailure ? " A última série pode ocasionalmente chegar a 0–1 RIR se não houver dor e a execução permanecer estável." : ""}`, countsAsDirectGluteMedius: true, rirDirection: directRir[1] === 3 ? "down" : undefined }),
    x("panturrilha-em-pe", "Panturrilha em pé", 3, [8, 12], [1, 2], [90, 120], "Panturrilhas", "calves", "Use dorsiflexão controlada e não quique."),
  ];
}

function lowerB(directSets: number, directRir: readonly [number, number]) {
  return [
    x("romanian-deadlift", "Romanian Deadlift / RDL", 3, [6, 10], [2, 2], [180, 180], "Posteriores", "hamstrings", "Leve o quadril para trás e encerre antes de perder a posição; não buscar falha.", { secondaryMuscles: "Glúteo máximo" }),
    x("flexora-sentada", "Flexora Sentada", 3, [8, 12], [1, 2], [120, 120], "Posteriores", "hamstrings", "Priorize a versão sentada quando disponível e controle a posição alongada."),
    x("hip-thrust", "Hip Thrust", 3, [8, 12], [1, 2], [150, 180], "Glúteo máximo", "glutes", "Pelve controlada e sem hiperextensão lombar; não buscar falha rotineiramente."),
    x("extensao-quadril-45-gluteo", "Extensão de quadril 45° com viés para glúteos", 2, [10, 15], [1, 2], [90, 120], "Glúteo máximo", "glutes", "Movimento parte do quadril; não transforme em hiperextensão lombar."),
    x("abducao-unilateral-polia", "Abdução unilateral na polia", directSets, [12, 20], directRir, [60, 90], "Glúteo médio", "glute_medius_direct", "Faça cada lado com pelve estável, sem rotação ou impulso. Padronize posição e amplitude.", { repsLabel: "12–20 por lado", progressionNotes: directNotes, countsAsDirectGluteMedius: true, rirDirection: directRir[1] === 3 ? "down" : undefined }),
    x("panturrilha-sentada", "Panturrilha sentada", 3, [12, 20], [1, 2], [90, 90], "Panturrilhas", "calves", "Controle o alongamento e complete a subida."),
  ];
}

const recoveryAccessories = () => [
  x("cable-crunch", "Cable Crunch", 3, [10, 15], [1, 2], [60, 90], "Reto abdominal", "core", "Progrida carga mantendo a flexão controlada."),
  x("ab-wheel", "Ab Wheel", 3, [6, 12], [2, 2], [90, 90], "Core", "core", "Aumente amplitude apenas sem perder o controle da pelve."),
  x("panturrilha-em-pe", "Panturrilha em pé", 3, [10, 15], [1, 2], [90, 120], "Panturrilhas", "calves", "Sessão acessória: não transformar em trabalho pesado de pernas."),
];

function lowerC(directSets: number, optionalFinalNearFailure: boolean) {
  return [
    x("hack-squat", "Hack Squat ou Agachamento Smith", 3, [8, 12], [1, 2], [150, 180], "Quadríceps", "quads", "Escolha a variante estável disponível e mantenha-a enquanto houver progresso; não buscar falha.", { requiresSelection: true, secondaryMuscles: "Glúteo máximo; glúteo médio como estímulo indireto" }),
    x("hip-thrust", "Hip Thrust / Glute Drive", 3, [6, 10], [1, 2], [150, 180], "Glúteo máximo", "glutes", "Use a variante que permita progressão consistente e mantenha a técnica."),
    x("flexora-deitada", "Flexora Deitada", 2, [10, 15], [1, 2], [90, 120], "Posteriores", "hamstrings", "Controle a descida; 0–1 RIR apenas seletivamente na última série."),
    x("step-up", "Step-up", 2, [10, 12], [2, 2], [120, 120], "Glúteos/quadríceps", "glutes", "Use altura que preserve controle pélvico; não conta como série direta de abdução.", { repsLabel: "10–12 por perna", secondaryMuscles: "Glúteo médio como estímulo indireto" }),
    x("abducao-maquina", "Cadeira Abdutora", directSets, [15, 25], [1, 2], [60, 90], "Glúteo médio", "glute_medius_direct", "Use ROM completo, pelve estável e sem impulso; compare a mesma execução entre semanas.", { progressionNotes: `${directNotes}${optionalFinalNearFailure ? " A última série pode ocasionalmente chegar a 0–1 RIR quando técnica, recuperação e articulações estiverem bem." : ""}`, countsAsDirectGluteMedius: true }),
  ];
}

function weeklyDays(directSets: readonly [number, number, number], blockOne = false, optionalFinalNearFailure = false) {
  const directRir = blockOne ? [2, 3] as const : [1, 2] as const;
  return [
    day(1, "Lower A — Quadríceps + Glúteo Médio", lowerA(directSets[0], directRir, optionalFinalNearFailure), "Quadríceps com trabalho direto de glúteo médio na cadeira abdutora."),
    day(2, "Upper — Superiores mínimo", upper(), "Exatamente 2 exercícios de costas, 2 de ombros, 1 de tríceps e 1 de bíceps; sem peitoral e sem volume extra."),
    day(3, "Lower B — Posteriores + Glúteos + Glúteo Médio", lowerB(directSets[1], directRir), "Posteriores e glúteos com abdução unilateral direta; flexora sentada priorizada quando disponível."),
    day(4, "Core + Panturrilhas + Zone 2", recoveryAccessories(), "Sessão acessória sem fadiga relevante para sexta: depois, 20–30 minutos de Zone 2, RPE 3–4/10, com conversa normal e sem HIIT."),
    day(5, "Lower C — Glúteos + Pernas + Glúteo Médio", lowerC(directSets[2], optionalFinalNearFailure), "Terceira sessão de inferiores de alta qualidade, encerrada com trabalho direto de glúteo médio."),
    recoveryDay(6, "Descanso / caminhada opcional", "Recuperação; caminhada leve é opcional."),
    recoveryDay(7, "Descanso / caminhada opcional", "Recuperação; caminhada leve é opcional."),
  ];
}

const zone2 = () => [cardio(4, "Zone 2 — bicicleta, elíptico ou caminhada inclinada", [20, 30], [3, 4], "Leve–moderada", "Deve ser possível conversar normalmente. Não fazer HIIT.", "Preservar a qualidade do Lower C de sexta-feira.")];

export const femaleProgramV2: ProgramSeed = {
  key: "female-2026",
  name: "Female Program V2 — foco em Glúteo Médio",
  description: "Programa anual de hipertrofia com três sessões de inferiores de alta qualidade, uma sessão superior mínima e um dia acessório de recuperação.",
  sourceResearch: "docs/research/FEMALE_PROGRAM_V2.md",
  version: "2026.2",
  profile: { sex: "female", themeKey: "midnight", accentColor: "#C7A7FF" },
  readaptation: "No início, priorize técnica e 2–3 RIR. Não aumente volume por calendário; mantenha enquanto houver progresso e boa recuperação.",
  progressionPolicy,
  recoveryPolicy,
  blocks: [
    { number: 1, name: "Base técnica e tolerância", weeks: [1, 13], objective: "Estabelecer execução reproduzível e progressão com fadiga controlada.", description: "RIR inicialmente mais conservador, exercícios familiares e oito séries diretas semanais para glúteo médio.", differences: "Base de comparação da V2; o volume sobe somente se resposta e recuperação permitirem.", volumeSummary: "Glúteo médio: 8 séries diretas/semana (3 segunda + 2 quarta + 3 sexta).", days: weeklyDays([3, 2, 3], true), cardio: zone2() },
    { number: 2, name: "Hipertrofia progressiva", weeks: [14, 26], objective: "Progredir carga e repetições mantendo recuperação e qualidade.", description: "Dez séries diretas semanais para glúteo médio; compostos permanecem longe da falha rotineira.", differences: "A abdução direta cresce de 8 para 10 séries; superiores permanecem exatamente iguais.", volumeSummary: "Glúteo médio: 10 séries diretas/semana (3 segunda + 3 quarta + 4 sexta).", days: weeklyDays([3, 3, 4], false, true), cardio: zone2() },
    { number: 3, name: "Especialização em Glúteo Médio", weeks: [27, 39], objective: "Usar até onze séries diretas de alta qualidade sem aumento automático.", description: "Pico planejado de especialização; se 9–10 séries ainda gerarem progresso, não há obrigação de subir.", differences: "Quarta recebe quatro séries diretas; falha continua opcional e seletiva em isoladores.", volumeSummary: "Glúteo médio: até 11 séries diretas/semana (3 segunda + 4 quarta + 4 sexta).", days: weeklyDays([3, 4, 4], false, true), cardio: zone2() },
    { number: 4, name: "Consolidação e alta qualidade", weeks: [40, 52], objective: "Consolidar carga e repetições sem elevar volume indefinidamente.", description: "Nove séries diretas semanais como referência, com redução em relação ao pico quando apropriado.", differences: "Volume direto recua; exercícios produtivos permanecem para preservar habilidade e comparação histórica.", volumeSummary: "Glúteo médio: 9 séries diretas/semana (3 segunda + 3 quarta + 3 sexta).", days: weeklyDays([3, 3, 3], false, true), cardio: zone2() },
  ],
  scienceTopics: [
    ...commonScienceTopics,
    { category: "glute-medius", title: "Por que agora treinamos glúteo médio dessa forma?", summary: "Volume contribui para hipertrofia com retornos decrescentes, e a frequência distribui esse volume para preservar qualidade. Agachamentos e hip thrust são úteis sobretudo para glúteos e glúteo máximo, mas a especialização do glúteo médio inclui abduções progressivas. Essa escolha é uma inferência prática baseada em função muscular, estabilidade, possibilidade de sobrecarga e estudos de ativação; a evidência longitudinal específica de hipertrofia do glúteo médio ainda é limitada, e EMG não demonstra hipertrofia diretamente." },
    { category: "glutes", title: "Glúteos e exercícios familiares", summary: "Smith, leg press, búlgaro, step-up e hip thrust permanecem quando produtivos. Eles fornecem estímulo amplo, mas não são contados automaticamente como séries diretas de glúteo médio." },
    { category: "hamstrings", title: "Posteriores", summary: "RDL e flexões de joelho cobrem funções diferentes. A flexora sentada é priorizada quando disponível por treinar os isquiotibiais em maior comprimento muscular." },
  ],
  references: [
    { topicCategory: "volume", title: "American College of Sports Medicine Position Stand", doi: "10.1249/MSS.0000000000003897", pmid: "41843416", url: "https://pubmed.ncbi.nlm.nih.gov/41843416/" },
    { topicCategory: "volume", title: "The Resistance Training Dose Response", doi: "10.1007/s40279-025-02344-w", pmid: "41343037", url: "https://pubmed.ncbi.nlm.nih.gov/41343037/" },
    { topicCategory: "glutes", title: "Hip thrust and back squat training elicit similar gluteus muscle hypertrophy", pmid: "37877099", url: "https://pubmed.ncbi.nlm.nih.gov/37877099/" },
    { topicCategory: "glute-medius", title: "Hip abduction machine and gluteus medius activation", doi: "10.1016/j.jbmt.2022.01.001", pmid: "35500965", url: "https://pubmed.ncbi.nlm.nih.gov/35500965/" },
    { topicCategory: "hamstrings", title: "Greater Hamstrings Muscle Hypertrophy at Long versus Short Muscle Lengths", pmid: "33009197", url: "https://pubmed.ncbi.nlm.nih.gov/33009197/" },
    { topicCategory: "rir", title: "Proximity to Failure, Strength Gain, and Muscle Hypertrophy", doi: "10.1007/s40279-024-02069-2", pmid: "38970765", url: "https://pubmed.ncbi.nlm.nih.gov/38970765/" },
  ],
};
