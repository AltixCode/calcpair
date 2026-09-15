import {
  GRADE_POINTS,
  LETTER_GRADES,
  SCALE_MAX,
  gpa,
  gradePoints,
  neededAverage,
  percentToPoints,
  totalCredits,
  type Course,
} from '../gpa';

const c = (credits: number, grade: string, semester = 'Autumn'): Course =>
  ({ id: `${credits}-${grade}-${semester}`, name: 'Course', credits, grade, semester });

describe('the letter scale', () => {
  it('runs from A (4.0) down to F (0.0)', () => {
    expect(gradePoints('A')).toBe(4);
    expect(gradePoints('F')).toBe(0);
  });

  it('gives every listed letter a point value', () => {
    for (const letter of LETTER_GRADES) {
      expect(typeof GRADE_POINTS[letter]).toBe('number');
    }
  });

  it('never decreases as the letter improves', () => {
    const points = LETTER_GRADES.map((l) => GRADE_POINTS[l]);
    for (let i = 1; i < points.length; i += 1) {
      expect(points[i - 1] as number).toBeGreaterThanOrEqual(points[i] as number);
    }
  });

  it('is NaN for a letter that is not on the scale, not zero', () => {
    // Zero would silently read as an F and drag the average down.
    expect(Number.isNaN(gradePoints('Z'))).toBe(true);
  });
});

describe('percentToPoints', () => {
  it.each([
    [100, 4],
    [93, 4],
    [90, 3.7],
    [83, 3],
    [73, 2],
    [63, 1],
    [59, 0],
    [0, 0],
  ])('%p%% is %p points', (percent, expected) => {
    expect(percentToPoints(percent)).toBeCloseTo(expected, 6);
  });

  it('clamps above 100 rather than exceeding the scale maximum', () => {
    expect(percentToPoints(120)).toBe(SCALE_MAX);
  });

  it('is NaN below zero rather than negative points', () => {
    expect(Number.isNaN(percentToPoints(-5))).toBe(true);
  });
});

describe('gpa', () => {
  it('weights by credit hours, not by course count', () => {
    // A (4.0) over 4 credits and C (2.0) over 1 credit is 3.6, not 3.0.
    expect(gpa([c(4, 'A'), c(1, 'C')])).toBeCloseTo(3.6, 6);
  });

  it('is the grade itself for a single course', () => {
    expect(gpa([c(3, 'B')])).toBeCloseTo(3, 6);
  });

  it('is null for no courses, rather than 0.0 — which reads as straight Fs', () => {
    expect(gpa([])).toBeNull();
  });

  it('is null when every course carries zero credits, rather than dividing by zero', () => {
    expect(gpa([c(0, 'A'), c(0, 'B')])).toBeNull();
  });

  it('ignores a course with an unknown grade instead of scoring it zero', () => {
    expect(gpa([c(3, 'A'), c(3, 'Z')])).toBeCloseTo(4, 6);
  });

  it('is null when every course has an unknown grade', () => {
    expect(gpa([c(3, 'Z')])).toBeNull();
  });

  it('ignores a negative credit value rather than subtracting from the total', () => {
    expect(gpa([c(3, 'A'), c(-3, 'F')])).toBeCloseTo(4, 6);
  });

  it('filters to one semester when asked', () => {
    const courses = [c(3, 'A', 'Autumn'), c(3, 'F', 'Spring')];
    expect(gpa(courses, 'Autumn')).toBeCloseTo(4, 6);
    expect(gpa(courses, 'Spring')).toBeCloseTo(0, 6);
    expect(gpa(courses)).toBeCloseTo(2, 6);
  });

  it('never exceeds the scale maximum', () => {
    expect(gpa([c(3, 'A'), c(3, 'A')])!).toBeLessThanOrEqual(SCALE_MAX);
  });
});

describe('totalCredits', () => {
  it('sums the credits that actually count', () => {
    expect(totalCredits([c(3, 'A'), c(4, 'B')])).toBe(7);
  });

  it('excludes a course whose grade is not on the scale', () => {
    expect(totalCredits([c(3, 'A'), c(4, 'Z')])).toBe(3);
  });
});

describe('neededAverage — the projector', () => {
  it('says what the remaining credits must average to reach a target', () => {
    // 3.0 over 30 credits, 30 more to come, target 3.5 -> the rest must average 4.0.
    expect(neededAverage({ currentGpa: 3, completedCredits: 30, remainingCredits: 30, target: 3.5 }))
      .toEqual({ kind: 'reachable', average: 4 });
  });

  it('reports a target already reached without any more work', () => {
    expect(neededAverage({ currentGpa: 3.8, completedCredits: 30, remainingCredits: 15, target: 3.5 }))
      .toEqual({ kind: 'already-reached' });
  });

  it('says plainly when a target cannot be reached, rather than returning a number above the scale', () => {
    // Needing better than a 4.0 average is not a grade anyone can get.
    const result = neededAverage({ currentGpa: 2, completedCredits: 60, remainingCredits: 6, target: 3.5 });
    expect(result.kind).toBe('unreachable');
    expect(result).not.toHaveProperty('average');
  });

  it('is exactly reachable at the boundary, not unreachable', () => {
    // Needing precisely 4.0 is possible.
    expect(neededAverage({ currentGpa: 3, completedCredits: 30, remainingCredits: 30, target: 3.5 }).kind)
      .toBe('reachable');
  });

  it('cannot change anything when no credits remain', () => {
    expect(neededAverage({ currentGpa: 2, completedCredits: 30, remainingCredits: 0, target: 3.5 }).kind)
      .toBe('unreachable');
  });

  it('treats a target already met with no credits remaining as reached', () => {
    expect(neededAverage({ currentGpa: 3.6, completedCredits: 30, remainingCredits: 0, target: 3.5 }).kind)
      .toBe('already-reached');
  });

  it('refuses a target above the scale maximum rather than computing toward it', () => {
    expect(neededAverage({ currentGpa: 3, completedCredits: 30, remainingCredits: 30, target: 4.5 }).kind)
      .toBe('invalid');
  });

  it('refuses nonsense input rather than returning a plausible number', () => {
    expect(neededAverage({ currentGpa: 3, completedCredits: -1, remainingCredits: 30, target: 3.5 }).kind)
      .toBe('invalid');
    expect(neededAverage({ currentGpa: Number.NaN, completedCredits: 30, remainingCredits: 30, target: 3.5 }).kind)
      .toBe('invalid');
    expect(neededAverage({ currentGpa: 3, completedCredits: 30, remainingCredits: -5, target: 3.5 }).kind)
      .toBe('invalid');
  });

  it('works from a standing start, with nothing completed', () => {
    expect(neededAverage({ currentGpa: 0, completedCredits: 0, remainingCredits: 30, target: 3.5 }))
      .toEqual({ kind: 'reachable', average: 3.5 });
  });
});
