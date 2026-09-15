import AsyncStorage from '@react-native-async-storage/async-storage';

import { CALC_CACHE_KEY, useCalcStore } from '../useCalcStore';

const initial = useCalcStore.getState();

beforeEach(async () => {
  await AsyncStorage.clear();
  useCalcStore.setState(initial, true);
});

describe('defaults', () => {
  it('starts metric, on the letter scale, with nothing recorded', () => {
    const s = useCalcStore.getState();
    expect([s.units, s.scale]).toEqual(['metric', 'letter']);
    expect(s.history).toEqual([]);
    expect(s.courses).toEqual([]);
  });
});

describe('BMI history', () => {
  it('records an entry with the computed value', () => {
    const entry = useCalcStore.getState().addEntry(175, 70);
    expect(entry?.value).toBeCloseTo(22.857142857, 6);
    expect(useCalcStore.getState().history).toHaveLength(1);
  });

  it('puts the newest entry first', () => {
    useCalcStore.getState().addEntry(175, 70, 1000);
    useCalcStore.getState().addEntry(175, 72, 2000);
    expect(useCalcStore.getState().history.map((e) => e.weightKg)).toEqual([72, 70]);
  });

  it('refuses an impossible measurement rather than storing a blank row', () => {
    expect(useCalcStore.getState().addEntry(0, 70)).toBeNull();
    expect(useCalcStore.getState().addEntry(175, 0)).toBeNull();
    expect(useCalcStore.getState().history).toHaveLength(0);
  });

  it('gives entries distinct ids even within the same millisecond', () => {
    const a = useCalcStore.getState().addEntry(175, 70, 1000);
    const b = useCalcStore.getState().addEntry(175, 71, 1000);
    expect(a?.id).not.toBe(b?.id);
  });

  it('removes one entry and leaves the rest', () => {
    const a = useCalcStore.getState().addEntry(175, 70)!;
    useCalcStore.getState().addEntry(175, 72);
    useCalcStore.getState().removeEntry(a.id);
    const { history } = useCalcStore.getState();
    expect(history).toHaveLength(1);
    expect(history[0]!.weightKg).toBe(72);
  });

  it('ignores a removal for an id that is not there', () => {
    useCalcStore.getState().addEntry(175, 70);
    useCalcStore.getState().removeEntry('nope');
    expect(useCalcStore.getState().history).toHaveLength(1);
  });

  it('keeps the value it computed, so changing the formula cannot rewrite history', () => {
    const entry = useCalcStore.getState().addEntry(175, 70)!;
    expect(useCalcStore.getState().history[0]!.value).toBe(entry.value);
  });
});

describe('courses', () => {
  const course = { name: 'Algebra', credits: 3, grade: 'A', semester: 'Autumn' };

  it('adds a course and gives it an id', () => {
    const created = useCalcStore.getState().addCourse(course);
    expect(created.id).toBeTruthy();
    expect(useCalcStore.getState().courses).toHaveLength(1);
  });

  it('keeps courses in the order they were added', () => {
    useCalcStore.getState().addCourse({ ...course, name: 'First' });
    useCalcStore.getState().addCourse({ ...course, name: 'Second' });
    expect(useCalcStore.getState().courses.map((c) => c.name)).toEqual(['First', 'Second']);
  });

  it('updates just the fields given', () => {
    const created = useCalcStore.getState().addCourse(course);
    useCalcStore.getState().updateCourse(created.id, { grade: 'B' });
    const updated = useCalcStore.getState().courses[0]!;
    expect(updated.grade).toBe('B');
    expect(updated.name).toBe('Algebra');
  });

  it('ignores an update for an id that is not there', () => {
    useCalcStore.getState().addCourse(course);
    useCalcStore.getState().updateCourse('nope', { grade: 'F' });
    expect(useCalcStore.getState().courses[0]!.grade).toBe('A');
  });

  it('removes a course', () => {
    const created = useCalcStore.getState().addCourse(course);
    useCalcStore.getState().removeCourse(created.id);
    expect(useCalcStore.getState().courses).toEqual([]);
  });

  it('lists distinct semesters in creation order', () => {
    useCalcStore.getState().addCourse({ ...course, semester: 'Autumn' });
    useCalcStore.getState().addCourse({ ...course, semester: 'Spring' });
    useCalcStore.getState().addCourse({ ...course, semester: 'Autumn' });
    expect(useCalcStore.getState().semesters()).toEqual(['Autumn', 'Spring']);
  });
});

describe('preferences', () => {
  it('switches units and scale', () => {
    useCalcStore.getState().setUnits('imperial');
    useCalcStore.getState().setScale('percent');
    const s = useCalcStore.getState();
    expect([s.units, s.scale]).toEqual(['imperial', 'percent']);
  });
});

describe('persistence', () => {
  it('round-trips everything', async () => {
    useCalcStore.getState().setUnits('imperial');
    useCalcStore.getState().addEntry(175, 70, 1000);
    useCalcStore.getState().addCourse({ name: 'Algebra', credits: 3, grade: 'A', semester: 'Autumn' });
    useCalcStore.getState().setActiveSemester('Autumn');
    await useCalcStore.getState().persist();

    useCalcStore.setState(initial, true);
    await useCalcStore.getState().hydrate();

    const s = useCalcStore.getState();
    expect(s.units).toBe('imperial');
    expect(s.history).toHaveLength(1);
    expect(s.courses).toHaveLength(1);
    expect(s.activeSemester).toBe('Autumn');
  });

  it('starts clean when nothing is stored', async () => {
    await useCalcStore.getState().hydrate();
    expect(useCalcStore.getState().history).toEqual([]);
  });

  it('starts clean rather than throwing on corrupt JSON', async () => {
    await AsyncStorage.setItem(CALC_CACHE_KEY, '{{{');
    await useCalcStore.getState().hydrate();
    expect(useCalcStore.getState().courses).toEqual([]);
  });

  it('drops a stored entry of the wrong shape instead of rendering a blank row', async () => {
    await AsyncStorage.setItem(
      CALC_CACHE_KEY,
      JSON.stringify({ history: [{ id: 'x' }, { id: 'y', recordedAt: 1, heightCm: 175, weightKg: 70, value: 22.9 }] }),
    );
    await useCalcStore.getState().hydrate();
    expect(useCalcStore.getState().history).toHaveLength(1);
  });

  it('drops an entry whose value is not a real number', async () => {
    await AsyncStorage.setItem(
      CALC_CACHE_KEY,
      JSON.stringify({ history: [{ id: 'x', recordedAt: 1, heightCm: 0, weightKg: 70, value: null }] }),
    );
    await useCalcStore.getState().hydrate();
    expect(useCalcStore.getState().history).toEqual([]);
  });

  it('forgets an active semester that no longer has any courses', async () => {
    await AsyncStorage.setItem(
      CALC_CACHE_KEY,
      JSON.stringify({ courses: [], activeSemester: 'Autumn' }),
    );
    await useCalcStore.getState().hydrate();
    expect(useCalcStore.getState().activeSemester).toBeNull();
  });

  it('falls back to metric and letters for stored values it does not recognise', async () => {
    await AsyncStorage.setItem(CALC_CACHE_KEY, JSON.stringify({ units: 'furlongs', scale: 'runes' }));
    await useCalcStore.getState().hydrate();
    const s = useCalcStore.getState();
    expect([s.units, s.scale]).toEqual(['metric', 'letter']);
  });
});
