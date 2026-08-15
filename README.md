# Tiny Survivors

A survivor-like (bullet-heaven) mobile game built with Expo SDK 57 and React Native
Skia. Portrait, one thumb: pick a class, walk with the virtual joystick, attacks fire
automatically.

## Running it

The renderer uses `@shopify/react-native-skia`, which is **not available in Expo Go**.
Use a development build:

```bash
npm install
npx expo run:android
```

## Testing

The simulation under `src/game/` is pure TypeScript with no React or native imports,
and runs in bare Node:

```bash
npm test
npx tsc --noEmit
node --expose-gc scripts/bench-sim.ts
```

The last command benchmarks the simulation at the enemy cap and reports
per-tick cost and heap growth.

Start with `docs/PLAYTEST.md` — the handover section at the top explains what
was verified, what was guessed, and which JSON key tunes each guess.

## Layout

- `src/game/` — the whole simulation: plain data and plain functions, fixed 60 Hz step
- `src/render/` — Skia drawing, reads world state
- `src/app/` — expo-router screens
- `assets/sprites/` — all sprite art
- `docs/` — ASSETS.md (verified asset facts), PLAYTEST.md (tuning punch-list),
  DECISIONS.md, BLOCKERS.md, BACKLOG.md
