export interface WeightMeasurement {
  measuredAt: string;
  weightKg: number;
}

export function calculateWeeklyWeightAverage(measurements: WeightMeasurement[]): number | null {
  const valid = measurements.filter((item) => Number.isFinite(item.weightKg) && item.weightKg > 0);
  if (valid.length === 0) return null;
  const value = valid.reduce((sum, item) => sum + item.weightKg, 0) / valid.length;
  return Math.round(value * 100) / 100;
}

export function groupWeightByIsoWeek(measurements: WeightMeasurement[]): Array<{ weekStart: string; averageKg: number; samples: number }> {
  const groups = new Map<string, WeightMeasurement[]>();
  for (const measurement of measurements) {
    const date = new Date(`${measurement.measuredAt.slice(0, 10)}T00:00:00Z`);
    const day = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() - day + 1);
    const key = date.toISOString().slice(0, 10);
    groups.set(key, [...(groups.get(key) ?? []), measurement]);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([weekStart, values]) => ({
    weekStart,
    averageKg: calculateWeeklyWeightAverage(values) ?? 0,
    samples: values.length,
  }));
}
