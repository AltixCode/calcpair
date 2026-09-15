/**
 * Body mass index, and the unit handling around it. Pure and dependency-free.
 *
 * A word on what this does NOT do. BMI is a population statistic from the 1830s that says
 * nothing about body composition: it reads a muscular person as overweight and an older person
 * who has lost muscle as healthier than they are. This module computes it and names the WHO
 * band, and the UI says plainly next to the number that it is not a diagnosis. Anything beyond
 * that — body fat, "ideal weight", a calorie target — would be a health claim the code cannot
 * support, so it is not here and it is not in the store listing either.
 */

export type BandId = 'underweight' | 'normal' | 'overweight' | 'obese';

export interface Band {
  id: BandId;
  /** Inclusive lower bound. */
  min: number;
  /** Exclusive upper bound. */
  max: number;
}

/**
 * The WHO adult bands, as a contiguous cover of [0, ∞).
 *
 * Contiguous on purpose: writing 18.5–24.9 and 25–29.9 as *closed* intervals leaves 24.95
 * belonging to nothing, and a category that is silently blank for some inputs is worse than a
 * category that is slightly arbitrary at the seam. A test asserts there is no gap.
 */
export const BMI_BANDS: Band[] = [
  { id: 'underweight', min: 0, max: 18.5 },
  { id: 'normal', min: 18.5, max: 25 },
  { id: 'overweight', min: 25, max: 30 },
  { id: 'obese', min: 30, max: Number.POSITIVE_INFINITY },
];

/** The band bounds the healthy-range calculation reports against. */
const NORMAL_MIN = 18.5;
const NORMAL_MAX = 24.9;

const POUNDS_PER_KG = 1 / 0.45359237;
const CM_PER_INCH = 2.54;
const INCHES_PER_FOOT = 12;

export const poundsToKg = (pounds: number): number => pounds * 0.45359237;
export const kgToPounds = (kg: number): number => kg * POUNDS_PER_KG;

/** Imperial height is two numbers, not a decimal: nobody is 5.75 feet tall. */
export const feetInchesToCm = (feet: number, inches: number): number =>
  (feet * INCHES_PER_FOOT + inches) * CM_PER_INCH;

/**
 * Splits centimetres back into feet and inches.
 *
 * Rounds the inches first and then carries: rounding after the split produces `5' 12"`, which
 * is a height nobody writes and which reads as a bug.
 */
export function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalInches = Math.round(cm / CM_PER_INCH);
  return {
    feet: Math.floor(totalInches / INCHES_PER_FOOT),
    inches: totalInches % INCHES_PER_FOOT,
  };
}

/**
 * BMI in kg/m². Returns NaN rather than a number for any input that cannot produce a real
 * one — a zero height would otherwise give Infinity, which lands in the "obese" band.
 */
export function bmi(kg: number, heightCm: number): number {
  if (!Number.isFinite(kg) || !Number.isFinite(heightCm)) return Number.NaN;
  if (kg <= 0 || heightCm <= 0) return Number.NaN;
  const metres = heightCm / 100;
  return kg / (metres * metres);
}

export function bandFor(value: number): Band | null {
  if (!Number.isFinite(value) || value < 0) return null;
  return BMI_BANDS.find((b) => value >= b.min && value < b.max) ?? null;
}

/** The weight span that falls in the normal band at a given height, or null if height is unusable. */
export function healthyWeightRangeKg(heightCm: number): { min: number; max: number } | null {
  if (!Number.isFinite(heightCm) || heightCm <= 0) return null;
  const metres = heightCm / 100;
  const area = metres * metres;
  return { min: NORMAL_MIN * area, max: NORMAL_MAX * area };
}
