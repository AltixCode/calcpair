import {
  FREE_HISTORY_ENTRIES,
  FREE_SEMESTERS,
  hiddenCount,
  isUnlocked,
  visibleHistory,
} from '../limits';

const entries = (n: number) => Array.from({ length: n }, (_, i) => i);

describe('isUnlocked', () => {
  it('gives a premium user everything', () => {
    expect(isUnlocked('history', true, 999)).toBe(true);
    expect(isUnlocked('semesters', true, 999)).toBe(true);
    expect(isUnlocked('projector', true)).toBe(true);
  });

  it('lets a free user up to the history limit and no further', () => {
    expect(isUnlocked('history', false, FREE_HISTORY_ENTRIES - 1)).toBe(true);
    expect(isUnlocked('history', false, FREE_HISTORY_ENTRIES)).toBe(false);
  });

  it('lets a free user keep one semester', () => {
    expect(isUnlocked('semesters', false, 0)).toBe(true);
    expect(isUnlocked('semesters', false, FREE_SEMESTERS)).toBe(false);
  });

  it('never gives the projector away free — it is the paid feature, not a capped one', () => {
    expect(isUnlocked('projector', false)).toBe(false);
    expect(isUnlocked('projector', false, 0)).toBe(false);
  });
});

describe('visibleHistory', () => {
  it('shows a premium user everything, in order', () => {
    expect(visibleHistory(entries(10), true)).toEqual(entries(10));
  });

  it('caps a free user at the limit', () => {
    expect(visibleHistory(entries(10), false)).toHaveLength(FREE_HISTORY_ENTRIES);
  });

  it('shows the most recent entries, which are the ones at the front', () => {
    expect(visibleHistory(entries(10), false)).toEqual([0, 1, 2]);
  });

  it('does not pad when there are fewer entries than the limit', () => {
    expect(visibleHistory(entries(2), false)).toEqual([0, 1]);
  });

  it('returns a copy, so a caller cannot mutate the stored list', () => {
    const source = entries(2);
    const copy = visibleHistory(source, true);
    copy.push(99);
    expect(source).toHaveLength(2);
  });
});

describe('hiddenCount', () => {
  it('is zero for a premium user however long the history is', () => {
    expect(hiddenCount(entries(50), true)).toBe(0);
  });

  it('is zero when nothing is being withheld', () => {
    expect(hiddenCount(entries(FREE_HISTORY_ENTRIES), false)).toBe(0);
  });

  it('counts what is withheld', () => {
    expect(hiddenCount(entries(FREE_HISTORY_ENTRIES + 4), false)).toBe(4);
  });

  it('is never negative', () => {
    expect(hiddenCount(entries(0), false)).toBe(0);
  });
});
