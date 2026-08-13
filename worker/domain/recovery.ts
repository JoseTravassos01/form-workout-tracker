export interface RecoveryAnswers {
  performanceDropped: boolean;
  poorSleep: boolean;
  persistentSoreness: boolean;
  jointPain: boolean;
  lowMotivation: boolean;
  highFatigue: boolean;
  rirLoss: boolean;
  performanceDropSessions: number;
}

export type RecoveryStatus = "green" | "yellow" | "red" | "pain";

export interface RecoveryEvaluation {
  status: RecoveryStatus;
  recommendation: string;
  signalCount: number;
}

export function evaluateRecoveryStatus(answers: RecoveryAnswers, profile: "male" | "female"): RecoveryEvaluation {
  if (answers.jointPain) {
    return { status: "pain", signalCount: 1, recommendation: "Interrompa o exercício que provoca dor aguda ou localizada. Se persistir, procure avaliação profissional. A aplicação não faz diagnóstico." };
  }
  const signalCount = [answers.poorSleep, answers.persistentSoreness, answers.lowMotivation, answers.highFatigue, answers.rirLoss].filter(Boolean).length;
  const repeatedDrop = answers.performanceDropped && answers.performanceDropSessions >= 2;
  if (repeatedDrop && signalCount >= 2) {
    const protocol = profile === "male"
      ? "Considere deload de 5–7 dias: 40–60% das séries, carga ~90–95% ou longe da falha, RIR 4–5, sem falha; reduza cardio 20–30% se estiver fatigado."
      : "Considere deload de 5–7 dias: reduzir séries em ~50%, usar ~85–90% da carga ou menos, RIR 4–5, sem falha; manter exercícios e retirar HIIT.";
    return { status: "red", signalCount, recommendation: `Os registros apresentam sinais compatíveis com fadiga acumulada. ${protocol}` };
  }
  if (answers.performanceDropped || signalCount > 0) {
    return {
      status: "yellow",
      signalCount,
      recommendation: profile === "female"
        ? "Mantenha a carga, não adicione séries e considere +1 RIR temporariamente. Uma sessão ruim isolada não é estagnação."
        : "Não mude por uma sessão ruim isolada. Revise sono, alimentação, descanso e cardio; mantenha carga e reduza 1–2 séries locais se ainda não recuperou.",
    };
  }
  return { status: "green", signalCount: 0, recommendation: "Recuperação compatível com progressão normal conforme as regras do programa." };
}
