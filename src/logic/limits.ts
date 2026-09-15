/**
 * The free-tier limits, in one place and free of any store or React import so the rules that
 * decide when a paywall appears are exhaustively testable.
 *
 * One purchase lifts all of them at once — `remove_ads` removes the ads *and* the limits.
 * There is no second tier and no subscription.
 */

/** BMI entries a free user can look back through. Older ones are kept, not deleted. */
export const FREE_HISTORY_ENTRIES = 3;

/** Semesters a free user can track. */
export const FREE_SEMESTERS = 1;

export type LockedFeature = 'history' | 'semesters' | 'projector';

/**
 * Whether a feature is available. Premium passes everything; the free tier gets the whole
 * calculator and is limited only in how much it can *keep*.
 */
export function isUnlocked(feature: LockedFeature, isPremium: boolean, count = 0): boolean {
  if (isPremium) return true;
  switch (feature) {
    case 'history':
      return count < FREE_HISTORY_ENTRIES;
    case 'semesters':
      return count < FREE_SEMESTERS;
    case 'projector':
      // Not a limit that can be counted — it is simply a paid feature.
      return false;
  }
}

/**
 * The slice of history a free user sees. Entries beyond the limit are retained on device and
 * reappear the moment the app is unlocked; nothing the user recorded is ever thrown away.
 */
export function visibleHistory<T>(entries: readonly T[], isPremium: boolean): T[] {
  return isPremium ? [...entries] : entries.slice(0, FREE_HISTORY_ENTRIES);
}

/** How many entries are being withheld, for the "N more in the full history" line. */
export function hiddenCount(entries: { readonly length: number }, isPremium: boolean): number {
  return isPremium ? 0 : Math.max(0, entries.length - FREE_HISTORY_ENTRIES);
}
