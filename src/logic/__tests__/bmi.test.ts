import {
  BMI_BANDS,
  bandFor,
  bmi,
  feetInchesToCm,
  healthyWeightRangeKg,
  cmToFeetInches,
  kgToPounds,
  poundsToKg,
} from '../bmi';

describe('unit conversion at the input boundary', () => {
  it('converts pounds to kilograms by the exact definition', () => {
    expect(poundsToKg(1)).toBeCloseTo(0.45359237, 10);
  });

  it('round-trips a weight', () => {
    expect(kgToPounds(poundsToKg(154))).toBeCloseTo(154, 9);
  });

  it('reads feet and inches as one height, not a decimal', () => {
    // 5'9" is 175.26 cm exactly: nobody is 5.75 feet tall.
    expect(feetInchesToCm(5, 9)).toBeCloseTo(175.26, 9);
  });

  it('treats a missing inches part as zero', () => {
    expect(feetInchesToCm(6, 0)).toBeCloseTo(182.88, 9);
  });

  it('carries inches over into feet when they reach twelve', () => {
    expect(cmToFeetInches(182.88)).toEqual({ feet: 6, inches: 0 });
  });

  it('never reports twelve inches, which is another foot', () => {
    // 5'11.6" must round to 6'0", not 5'12".
    const { feet, inches } = cmToFeetInches(182.5);
    expect(inches).toBeLessThan(12);
    expect(feet * 12 + inches).toBeGreaterThan(71);
  });

  it('round-trips a height through both representations', () => {
    const { feet, inches } = cmToFeetInches(175.26);
    expect(feetInchesToCm(feet, inches)).toBeCloseTo(175.26, 1);
  });
});

describe('bmi', () => {
  it('computes weight over height squared', () => {
    // 70 kg at 1.75 m is 22.857…
    expect(bmi(70, 175)).toBeCloseTo(22.857142857, 6);
  });

  it('agrees with a known imperial case', () => {
    // 154 lb, 5'9" -> 22.7
    expect(bmi(poundsToKg(154), feetInchesToCm(5, 9))).toBeCloseTo(22.74, 2);
  });

  it('returns NaN for a height of zero rather than Infinity', () => {
    expect(Number.isNaN(bmi(70, 0))).toBe(true);
  });

  it('returns NaN for a negative or non-finite input rather than a number', () => {
    expect(Number.isNaN(bmi(-70, 175))).toBe(true);
    expect(Number.isNaN(bmi(70, -175))).toBe(true);
    expect(Number.isNaN(bmi(Number.NaN, 175))).toBe(true);
  });
});

describe('bandFor — the WHO categories', () => {
  it.each([
    [17, 'underweight'],
    [18.4, 'underweight'],
    [18.5, 'normal'],
    [22, 'normal'],
    [24.9, 'normal'],
    [25, 'overweight'],
    [29.9, 'overweight'],
    [30, 'obese'],
    [45, 'obese'],
  ])('%p is %s', (value, expected) => {
    expect(bandFor(value)?.id).toBe(expected);
  });

  it('has no gap and no overlap between the bands', () => {
    // Compared as a pair of lists so the indexing stays inside TypeScript's checked range.
    const mins = BMI_BANDS.slice(1).map((b) => b.min);
    const maxes = BMI_BANDS.slice(0, -1).map((b) => b.max);
    expect(mins).toEqual(maxes);
  });

  it('starts at zero and ends unbounded, so every BMI lands in a band', () => {
    expect(BMI_BANDS.at(0)?.min).toBe(0);
    expect(BMI_BANDS.at(-1)?.max).toBe(Number.POSITIVE_INFINITY);
  });

  it('returns null for a non-finite value rather than guessing a band', () => {
    expect(bandFor(Number.NaN)).toBeNull();
  });
});

describe('healthyWeightRangeKg', () => {
  it('is the weight span that lands in the normal band at that height', () => {
    const range = healthyWeightRangeKg(175);
    expect(range).not.toBeNull();
    expect(bmi(range!.min, 175)).toBeCloseTo(18.5, 6);
    expect(bmi(range!.max, 175)).toBeCloseTo(24.9, 6);
  });

  it('grows with height', () => {
    expect(healthyWeightRangeKg(190)!.min).toBeGreaterThan(healthyWeightRangeKg(160)!.min);
  });

  it('is null for an unusable height rather than a range around zero', () => {
    expect(healthyWeightRangeKg(0)).toBeNull();
  });
});
