# Calcpair — handoff

What was actually run, and what is still unknown. **Unverified is `UNKNOWN`,
never a pass** — a green build is not a verification.

Last updated: 2026-09-15 (device pass complete, both platforms driven)

## Verification state

| Gate | State | Evidence |
|---|---|---|
| Lint | ✅ | `npm run lint` clean |
| Typecheck | ✅ | `npx tsc --noEmit` clean |
| Unit tests | ✅ | 317 passing, coverage thresholds met |
| i18n completeness (14 locales) | ✅ | `14 locales × 98 keys — complete` |
| UI rules (colour tokens, `t()`) | ✅ | `check-ui-rules: 17 files clean` |
| iOS + Android bundle export | ✅ | `npx expo export` both platforms |
| CI green on a self-hosted runner | ⬜ | |
| `check:release` with real identifiers | ✅ | AdMob + RevenueCat ids present |
| Builds, installs, launches on the iOS simulator | ✅ | iPhone 17 / iOS 27; alive after launch, no UIScene death in the device log |
| Renders in light **and** dark on device | ✅ | both appearances captured on both platforms |
| Every feature driven on the Android emulator | ✅ | BMI, save, GPA, course form, paywall gate, persistence |
| Purchase flow exercised against a real offering | ⬜ | |
| Ads served under real consent | ✅ | test banner rendered on Android; ATT **and** the UMP consent form both driven on iOS |

## Store and service state

| | State | Id |
|---|---|---|
| Bundle id registered | ✅ | `com.altixcode.calcpair` (ASC `Y2A8C5J783`) |
| App Store Connect record | ⬜ | |
| iOS IAP created and priced | ⬜ | |
| Play Console app | ⬜ | |
| Play AAB uploaded (internal) | ⬜ | |
| Play in-app product | ⬜ | |
| AdMob apps (iOS + Android) | ✅ | `ca-app-pub-2504845459806550~2549468418` / `~2549199529` |
| AdMob ad units (6) | ✅ | banner, interstitial, rewarded per platform, read back from AdMob |
| AdMob GDPR + US-states messages published | ⬜ | |
| RevenueCat project, apps, entitlement, offering | ✅ | `proj8b1245ba`; `remove_ads`; `default`/`$rc_lifetime` |

## Decisions the owner owns

- Publish on altixcode.com and itsata.com? **Not yet asked.**

## What was proved on device, and how

Each claim was checked by reading something back from **outside** the app:

| Claim | The artifact |
|---|---|
| BMI is right | 175 cm + 70 kg reads `22.9` / `Normal range` in the live view hierarchy on Android *and* in the iOS accessibility tree |
| The healthy range is right | iOS reports `56.7 kg–76.3 kg` at 175 cm; 18.5 and 24.9 × 1.75² are 56.66 and 76.26 |
| GPA is credit-weighted, not averaged | A over 4 credits plus C over 1 credit reads **3.60** on device. The unweighted answer would be 3.00 |
| The free tier gates the projector | tapping it as a free user reaches "Calcpair Lifetime", not the tool |
| Everything persists | app force-stopped, then its own SQLite read with `run-as`: `{"units":"metric","scale":"letter","history":[{…"value":22.857142857142858}],"courses":[{"name":"Algebra","credits":4,"grade":"A"…` |
| Ads serve | a Google test banner rendered on Android |
| The consent chain works | on iOS, the ATT prompt was **tapped** ("Ask App Not to Track"), and the UMP consent form then appeared and was completed — the first time either has been exercised in this portfolio |

### Driving iOS

`Simulator.app` is missing from this Xcode install, so iOS has previously been
build/launch/render only and the ATT prompt had never been dismissed. idb fixes
that — `scripts/idb-ui.py` taps by accessibility label. Note the companion
binds one port per simulator; a second session running its own needs
`--grpc-port` or it fails with a bare `NIOCore.IOError error 1`.

## Known UNKNOWNs

- **The purchase flow has never been exercised.** No App Store Connect record
  exists, so no store product exists, so RevenueCat's offering carries no
  package. The paywall correctly shows its "store unavailable" state instead.
- **The GDPR consent message is not published in AdMob.** What appeared on the
  simulator was Google's *test* form — which proves the integration is correct
  and proves nothing about production. Until a real message is published, an
  EEA user sees no ads at all.
- **No App Store Connect or Play Console record.** ASC needs a human to sign in
  again.
