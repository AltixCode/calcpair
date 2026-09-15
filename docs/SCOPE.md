# Calcpair — what is being built

Guide item 10 of `ad-revenue-apps-implementation-guide.md`. Two of the
highest-search-volume calculators in one app, sharing one shell so the second
costs almost nothing to add.

## Why these two together

They are not related by subject; they are related by *shape*. Both are
"fill in a short form, get a number back, and understand what the number means".
That template gets written once and used twice, which is the entire reason the
bundle is worth more than either calculator alone.

## BMI

- Height and weight, metric **or** imperial, with the unit choice remembered.
  Imperial height is feet **and** inches, not decimal feet — nobody is 5.75 ft.
- BMI, plus the WHO category and where the value sits on the scale.
- A dated history, so the number becomes a trend rather than a verdict.

### What it must not claim

BMI is a population statistic, not a diagnosis, and it is wrong about muscular
and older bodies in opposite directions. The result screen says so, in every
locale, next to the number — not buried in a settings page. An app that presents
BMI as a health verdict is making a claim the code cannot support.

## GPA

- Courses with credit hours and a grade, on either a 4.0 letter scale or a
  percentage scale.
- Weighted GPA across courses, and across semesters.
- The projector: given a target GPA, what is needed from the remaining credits —
  and an honest "not reachable" when it is not reachable, rather than a number
  above the scale maximum.

## Free and paid

One purchase, `remove_ads`, as everywhere in this portfolio. It removes the ads
and lifts the free limits:

| | Free | Unlocked |
|---|---|---|
| BMI result | ✅ | ✅ |
| BMI history | last 3 entries | full history and the trend chart |
| GPA, one semester | ✅ | ✅ |
| Semesters | 1 | unlimited |
| Target-GPA projector | ⬜ | ✅ |

## Ads

Banner on both result screens. The interstitial goes **after** a completed
calculation — the result is already on screen and the user has seen it — and
never before one, never between a form and its answer. Shared pacing rules
apply: at most one per 90 seconds, and never for a user who has paid.

## Not in scope

No body-fat estimate, no calorie target, no "ideal weight". Each would be a
health claim the app cannot stand behind, and the guide does not ask for them.
