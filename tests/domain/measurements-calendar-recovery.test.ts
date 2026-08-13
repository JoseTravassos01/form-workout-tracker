import { describe, expect, it } from "vitest";
import { resolveScheduledWorkout } from "../../worker/domain/calendar";
import { calculateWeeklyWeightAverage, groupWeightByIsoWeek } from "../../worker/domain/measurements";
import { evaluateRecoveryStatus } from "../../worker/domain/recovery";

describe("medidas, calendário e autorregulação", () => {
  it("calcula médias e agrupa o peso por semana ISO", () => {
    const measurements = [
      { measuredAt: "2026-08-10", weightKg: 80 },
      { measuredAt: "2026-08-12", weightKg: 81 },
      { measuredAt: "2026-08-17", weightKg: 80.5 },
    ];
    expect(calculateWeeklyWeightAverage(measurements.slice(0, 2))).toBe(80.5);
    expect(groupWeightByIsoWeek(measurements)).toEqual([
      { weekStart: "2026-08-10", averageKg: 80.5, samples: 2 },
      { weekStart: "2026-08-17", averageKg: 80.5, samples: 1 },
    ]);
  });

  it("reagenda sem destruir a data original", () => {
    const result = resolveScheduledWorkout(
      { trainingDayId: "day-a", originalDate: "2026-08-12", scheduledDate: "2026-08-12", status: "scheduled" },
      [{ trainingDayId: "day-a", originalDate: "2026-08-12", newDate: "2026-08-13", action: "rescheduled" }],
    );
    expect(result).toEqual({ trainingDayId: "day-a", originalDate: "2026-08-12", scheduledDate: "2026-08-13", status: "rescheduled" });
  });

  it("classifica sinal isolado como amarelo e fadiga sustentada como vermelho", () => {
    const healthy = { performanceDropped: false, poorSleep: false, persistentSoreness: false, jointPain: false, lowMotivation: false, highFatigue: false, rirLoss: false, performanceDropSessions: 0 };
    expect(evaluateRecoveryStatus(healthy, "male").status).toBe("green");
    expect(evaluateRecoveryStatus({ ...healthy, poorSleep: true }, "female").status).toBe("yellow");
    const red = evaluateRecoveryStatus({ ...healthy, performanceDropped: true, performanceDropSessions: 2, poorSleep: true, highFatigue: true }, "female");
    expect(red.status).toBe("red");
    expect(red.recommendation).toContain("retirar HIIT");
    expect(evaluateRecoveryStatus({ ...healthy, jointPain: true }, "male").status).toBe("pain");
  });
});
