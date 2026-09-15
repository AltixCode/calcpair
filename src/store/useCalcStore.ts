/**
 * Everything both calculators hold: the BMI entries recorded over time, the GPA courses, and
 * the unit and scale preferences.
 *
 * All arithmetic and every free-tier rule lives in `src/logic/`; this store holds state and
 * persists it. Entries are never deleted to enforce a limit — the free tier limits what is
 * *shown*, and unlocking reveals what was there all along.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { bmi } from '@/logic/bmi';
import type { Course } from '@/logic/gpa';

export const CALC_CACHE_KEY = 'calcpair.state.v1';

export type UnitSystem = 'metric' | 'imperial';
export type GradeScale = 'letter' | 'percent';

export interface BmiEntry {
  id: string;
  /** Epoch millis. */
  recordedAt: number;
  heightCm: number;
  weightKg: number;
  /** Stored rather than recomputed, so a change to the formula cannot rewrite history. */
  value: number;
}

interface CalcState {
  units: UnitSystem;
  scale: GradeScale;
  /** Newest first. */
  history: BmiEntry[];
  courses: Course[];
  /** Semester the GPA screen is filtered to, or null for all of them. */
  activeSemester: string | null;

  setUnits: (units: UnitSystem) => void;
  setScale: (scale: GradeScale) => void;

  /** Records a measurement. Returns null when the inputs cannot produce a real BMI. */
  addEntry: (heightCm: number, weightKg: number, now?: number) => BmiEntry | null;
  removeEntry: (id: string) => void;

  addCourse: (course: Omit<Course, 'id'>) => Course;
  updateCourse: (id: string, patch: Partial<Omit<Course, 'id'>>) => void;
  removeCourse: (id: string) => void;
  setActiveSemester: (semester: string | null) => void;
  /** Distinct semesters in entry order, which is the order the user created them. */
  semesters: () => string[];

  hydrate: () => Promise<void>;
  persist: () => Promise<void>;
}

/**
 * Ids only need to be unique within one device's storage. `crypto.randomUUID` is not reliably
 * present on Hermes, so this is a timestamp plus a counter — monotonic, and stable across the
 * same millisecond, which a bare `Date.now()` is not.
 */
let sequence = 0;
const nextId = (prefix: string): string => `${prefix}-${Date.now().toString(36)}-${(sequence += 1)}`;

interface PersistedShape {
  units?: unknown;
  scale?: unknown;
  history?: unknown;
  courses?: unknown;
  activeSemester?: unknown;
}

const isEntry = (v: unknown): v is BmiEntry => {
  if (typeof v !== 'object' || v === null) return false;
  const e = v as Partial<BmiEntry>;
  return (
    typeof e.id === 'string' &&
    typeof e.recordedAt === 'number' &&
    typeof e.heightCm === 'number' &&
    typeof e.weightKg === 'number' &&
    typeof e.value === 'number' &&
    Number.isFinite(e.value)
  );
};

const isCourse = (v: unknown): v is Course => {
  if (typeof v !== 'object' || v === null) return false;
  const c = v as Partial<Course>;
  return (
    typeof c.id === 'string' &&
    typeof c.name === 'string' &&
    typeof c.credits === 'number' &&
    typeof c.grade === 'string' &&
    typeof c.semester === 'string'
  );
};

export const useCalcStore = create<CalcState>((set, get) => ({
  units: 'metric',
  scale: 'letter',
  history: [],
  courses: [],
  activeSemester: null,

  setUnits: (units) => {
    set({ units });
    void get().persist();
  },

  setScale: (scale) => {
    set({ scale });
    void get().persist();
  },

  addEntry: (heightCm, weightKg, now = Date.now()) => {
    const value = bmi(weightKg, heightCm);
    // Refuse rather than store a NaN entry: a history row with no number in it would render as
    // a blank forever and could never be explained to the user.
    if (!Number.isFinite(value)) return null;
    const entry: BmiEntry = { id: nextId('bmi'), recordedAt: now, heightCm, weightKg, value };
    set((s) => ({ history: [entry, ...s.history] }));
    void get().persist();
    return entry;
  },

  removeEntry: (id) => {
    set((s) => ({ history: s.history.filter((e) => e.id !== id) }));
    void get().persist();
  },

  addCourse: (course) => {
    const created: Course = { ...course, id: nextId('course') };
    set((s) => ({ courses: [...s.courses, created] }));
    void get().persist();
    return created;
  },

  updateCourse: (id, patch) => {
    set((s) => ({ courses: s.courses.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
    void get().persist();
  },

  removeCourse: (id) => {
    set((s) => ({ courses: s.courses.filter((c) => c.id !== id) }));
    void get().persist();
  },

  setActiveSemester: (semester) => {
    set({ activeSemester: semester });
    void get().persist();
  },

  semesters: () => [...new Set(get().courses.map((c) => c.semester))],

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(CALC_CACHE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as PersistedShape;
      const history = Array.isArray(parsed.history) ? parsed.history.filter(isEntry) : [];
      const courses = Array.isArray(parsed.courses) ? parsed.courses.filter(isCourse) : [];
      set({
        units: parsed.units === 'imperial' ? 'imperial' : 'metric',
        scale: parsed.scale === 'percent' ? 'percent' : 'letter',
        history,
        courses,
        activeSemester:
          typeof parsed.activeSemester === 'string' &&
          courses.some((c) => c.semester === parsed.activeSemester)
            ? parsed.activeSemester
            : null,
      });
    } catch {
      // Corrupt stored state starts clean rather than crashing on launch.
    }
  },

  persist: async () => {
    const { units, scale, history, courses, activeSemester } = get();
    try {
      await AsyncStorage.setItem(
        CALC_CACHE_KEY,
        JSON.stringify({ units, scale, history, courses, activeSemester }),
      );
    } catch {
      // A failed write loses the last measurement, not the app.
    }
  },
}));
