import type { ScienceReferenceSeed, ScienceTopicSeed } from "./types";

export const commonScienceTopics: ScienceTopicSeed[] = [
  { category: "volume", title: "Volume", summary: "O volume semanal é uma variável importante, mas apresenta retornos decrescentes. O programa começa moderado e só cresce quando performance e recuperação sustentam a mudança." },
  { category: "frequency", title: "Frequência", summary: "A frequência distribui séries e preserva qualidade. Quando o volume é igualado, aumentar frequência isoladamente parece ter efeito menor sobre hipertrofia." },
  { category: "rir", title: "RIR e falha", summary: "A maior parte das séries termina com 1–3 repetições em reserva. Falha não é obrigatória e fica restrita, quando usada, a isoladores seguros e de forma seletiva." },
  { category: "rest", title: "Descanso", summary: "Descansos suficientes preservam carga e repetições. Compostos recebem intervalos maiores que isoladores." },
  { category: "range", title: "Amplitude", summary: "A regra-base é amplitude ampla, confortável e controlável, sem sacrificar posição para aumentar carga." },
  { category: "progression", title: "Progressão", summary: "A dupla progressão aumenta repetições dentro da faixa antes da carga. O aumento só é sugerido com técnica e RIR compatíveis." },
  { category: "cardio", title: "Cardio", summary: "Cardio leve ou moderado é compatível com hipertrofia quando modalidade, dose e recuperação preservam os treinos prioritários." },
  { category: "deload", title: "Deload", summary: "Deload não é obrigatório por calendário. Ele é considerado diante de queda repetida de performance acompanhada de sinais de fadiga." },
];

export const commonReferences: ScienceReferenceSeed[] = [
  { topicCategory: "volume", title: "Resistance Training Dose Response", doi: "10.1007/s40279-025-02344-w", pmid: "41343037", url: "https://pubmed.ncbi.nlm.nih.gov/41343037/" },
  { topicCategory: "rir", title: "Proximity-to-Failure and Hypertrophy", pmid: "36334240", url: "https://pubmed.ncbi.nlm.nih.gov/36334240/" },
  { topicCategory: "rir", title: "Failure vs Non-failure", pmid: "33497853", url: "https://pubmed.ncbi.nlm.nih.gov/33497853/" },
  { topicCategory: "rest", title: "Short vs Long Inter-set Rest", doi: "10.1080/17461391.2017.1340524", pmid: "28641044", url: "https://pubmed.ncbi.nlm.nih.gov/28641044/" },
  { topicCategory: "deload", title: "Effects of Deload Periods", doi: "10.1038/s41598-026-40612-5", pmid: "41730991", url: "https://pubmed.ncbi.nlm.nih.gov/41730991/" },
  { topicCategory: "calves", title: "Standing vs Seated Calf Raise", doi: "10.3389/fphys.2023.1272106", pmid: "38156065", url: "https://pubmed.ncbi.nlm.nih.gov/38156065/" },
];
