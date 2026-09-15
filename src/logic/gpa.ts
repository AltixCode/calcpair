/**
 * Weighted GPA on the 4.0 scale, and the projector that answers "what do I need from here".
 * Pure and dependency-free.
 *
 * The rule that shapes most of this file: a course that cannot be scored is **excluded**, never
 * scored zero. Treating an unrecognised grade as 0.0 turns a typo into an F and quietly ruins
 * the number the user came for, which is the single most damaging thing a GPA calculator can do.
 */

export const SCALE_MAX = 4;

/** Best to worst. The order is asserted by a test, because the UI renders the picker from it. */
export const LETTER_GRADES = [
  'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F',
] as const;

export type Letter = (typeof LETTER_GRADES)[number];

export const GRADE_POINTS: Record<Letter, number> = {
  A: 4.0, 'A-': 3.7,
  'B+': 3.3, B: 3.0, 'B-': 2.7,
  'C+': 2.3, C: 2.0, 'C-': 1.7,
  'D+': 1.3, D: 1.0, 'D-': 0.7,
  F: 0.0,
};

export interface Course {
  id: string;
  name: string;
  credits: number;
  /** A letter from the scale, or a percentage written as a number-like string. */
  grade: string;
  semester: string;
}

/** Points for a letter, or NaN for anything not on the scale. Never zero as a fallback. */
export function gradePoints(letter: string): number {
  const points = GRADE_POINTS[letter as Letter];
  return points === undefined ? Number.NaN : points;
}

/**
 * The percentage scale, mapped onto the same 4.0 points as the letters so the two can be mixed
 * in one average. The cut-offs are the common US mapping the letters already use.
 */
const PERCENT_CUTOFFS: [min: number, points: number][] = [
  [93, 4.0], [90, 3.7],
  [87, 3.3], [83, 3.0], [80, 2.7],
  [77, 2.3], [73, 2.0], [70, 1.7],
  [67, 1.3], [63, 1.0], [60, 0.7],
  [0, 0.0],
];

export function percentToPoints(percent: number): number {
  if (!Number.isFinite(percent) || percent < 0) return Number.NaN;
  if (percent >= 100) return SCALE_MAX;
  return PERCENT_CUTOFFS.find(([min]) => percent >= min)?.[1] ?? Number.NaN;
}

/** Points for whatever the course carries — a letter or a percentage. */
function pointsFor(grade: string): number {
  const letter = gradePoints(grade);
  if (!Number.isNaN(letter)) return letter;
  const asNumber = Number(grade);
  return Number.isFinite(asNumber) && grade.trim() !== '' ? percentToPoints(asNumber) : Number.NaN;
}

/** Courses that can actually be scored: a usable grade and a positive credit value. */
function scorable(courses: readonly Course[], semester?: string): Course[] {
  return courses.filter(
    (course) =>
      (semester === undefined || course.semester === semester) &&
      Number.isFinite(course.credits) &&
      course.credits > 0 &&
      !Number.isNaN(pointsFor(course.grade)),
  );
}

export function totalCredits(courses: readonly Course[], semester?: string): number {
  return scorable(courses, semester).reduce((sum, course) => sum + course.credits, 0);
}

/**
 * Credit-weighted GPA, or null when there is nothing to average.
 *
 * Null rather than 0.0: an empty list is "no answer yet", and rendering 0.00 for it tells a
 * student with no courses entered that they are failing everything.
 */
export function gpa(courses: readonly Course[], semester?: string): number | null {
  const counted = scorable(courses, semester);
  const credits = counted.reduce((sum, course) => sum + course.credits, 0);
  if (credits <= 0) return null;
  const points = counted.reduce((sum, course) => sum + pointsFor(course.grade) * course.credits, 0);
  return points / credits;
}

export interface Projection {
  currentGpa: number;
  completedCredits: number;
  remainingCredits: number;
  target: number;
}

export type ProjectionResult =
  | { kind: 'reachable'; average: number }
  | { kind: 'already-reached' }
  | { kind: 'unreachable' }
  | { kind: 'invalid' };

/**
 * What the remaining credits must average for the overall GPA to reach `target`.
 *
 * Returns a *kind*, not a number, because three of the four answers are not numbers. Returning
 * "you need a 4.6 average" would be arithmetically correct and practically a lie — there is no
 * such grade — so an unreachable target says so instead.
 */
export function neededAverage({
  currentGpa,
  completedCredits,
  remainingCredits,
  target,
}: Projection): ProjectionResult {
  const finite = [currentGpa, completedCredits, remainingCredits, target].every(Number.isFinite);
  if (!finite) return { kind: 'invalid' };
  if (completedCredits < 0 || remainingCredits < 0) return { kind: 'invalid' };
  if (currentGpa < 0 || currentGpa > SCALE_MAX) return { kind: 'invalid' };
  if (target < 0 || target > SCALE_MAX) return { kind: 'invalid' };

  if (currentGpa >= target && completedCredits > 0) return { kind: 'already-reached' };
  if (remainingCredits === 0) {
    return currentGpa >= target ? { kind: 'already-reached' } : { kind: 'unreachable' };
  }

  const totalPointsNeeded = target * (completedCredits + remainingCredits);
  const pointsSoFar = currentGpa * completedCredits;
  const average = (totalPointsNeeded - pointsSoFar) / remainingCredits;

  if (average > SCALE_MAX) return { kind: 'unreachable' };
  // A negative requirement means the target is already guaranteed whatever happens next.
  if (average <= 0) return { kind: 'already-reached' };
  return { kind: 'reachable', average };
}
