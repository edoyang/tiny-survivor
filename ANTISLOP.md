# ANTISLOP.md

These rules override everything else in this repo. If a rule here conflicts with what
you were about to write, this wins.

**The test:** would a developer who hates rework and has to maintain this alone for a
year write it this way? If your justification starts with "it's more flexible" or "for
future extensibility" — delete it.

---

## Banned outright

**Comments.** Zero. Name things so they are not needed. If you feel a comment is
required, the code is wrong — rename or extract until it explains itself. The only
exception is a URL to a spec or issue when implementing a genuine workaround.

**Abstraction before three real uses.** No `BaseEntity`, `EntityManager`,
`AbstractWeapon`, `IProjectileStrategy`, `WeaponFactory`. No interface with one
implementation. No generic where a concrete type works.

**Class hierarchies for game objects.** There is no
`Entity → Character → Enemy → Slime`. A slime is a row in `monsters.json` and a numeric
type tag. Behaviour lives in systems, not methods.

**Wrapper functions.** If a function only calls another function, delete it.

**Barrel files.** No `index.ts` that re-exports a folder. Import from the real path.

**`any`, `as unknown as`, `@ts-ignore`, `@ts-expect-error`.** Strict mode is on. Fix
the type. If a library's types are genuinely wrong, write one narrow declaration and say
so in the commit.

**Swallowed errors.** No `try { ... } catch { log; continue }`. In `src/game/` let it
throw — a silently wrong simulation step is far worse than a crash you can see.

**New dependencies.** Nothing installed without stating in the commit why Skia,
Reanimated, or plain TypeScript cannot do it. Specifically banned: an ECS library, a
state manager for game state, a physics engine, a tweening library, lodash.

**`console.log`.** Never in `src/game/`. Never committed anywhere.

**Emoji.** Not in code, logs, commit messages, file names, or documentation.

---

## Game-loop slop

This runs 200+ enemies and hundreds of projectiles, 60 times a second.

**No allocation in the hot loop.** Inside `advance()` or anything it calls: no `{}`, no
`[]`, no `.map`, `.filter`, `.slice`, no spread, no closures, no template strings.
Preallocate, pool, and write into existing objects. Garbage collection shows up as
visible stutter.

**No `Math.random()` anywhere in `src/game/`.** Seeded PRNG only. Determinism is the
entire reason the tests mean anything.

**No O(n²).** Never loop enemies × enemies or projectiles × enemies directly. Query the
spatial hash.

**No variable delta time in logic.** Fixed step, always. Interpolate in the renderer if
motion looks choppy — never by feeding a real frame delta into the simulation.

**No React state per frame.** The game loop never calls `setState`. The HUD updates when
a value meaningfully changes, not 60 times a second.

**But no premature optimization either.** Do not bit-pack entity IDs, hand-roll typed
array struct-of-arrays layouts, or micro-tune before Phase 8. Write the obvious pooled
loop, profile on a real device, then fix what is actually slow.

---

## React and Expo slop

**`reactCompiler` is enabled** in `app.json`. Do not write `useMemo`, `useCallback`, or
`React.memo`. The compiler handles memoization; adding it by hand is noise and can work
against it.

**Do not invent Expo APIs.** SDK 57 changed a lot. If you have not read that module's
page at https://docs.expo.dev/versions/v57.0.0/ in this session, you do not know its
current signature. Pattern-matching from older Expo is how this project breaks.

**No `<View>` per entity.** Skia Atlas. This is repeated from PROMPT.md because it is
the easiest mistake to make and the most expensive to undo.

---

## Test slop

A fake test is worse than no test, because it makes an unfinished phase look verified.

Banned:
- `expect(true).toBe(true)`
- asserting a constant equals itself
- testing that a getter returns what the setter just set
- mocking the thing under test
- snapshot tests of world state
- any test that would still pass if you deleted the function body

**If you cannot name the bug a test would catch, delete the test.**

Never delete, skip, or `.only` around a failing test to get a green suite. Never edit an
assertion to match wrong output. Fix the code, or report that it is broken.

---

## Honesty

- A phase is not done until `npx tsc --noEmit`, `npm test`, and
  `npx expo export --platform android` have all actually been run and passed. Run them.
  Do not assume.
- Do not write "should work", "this should now", or "I've implemented X" as a substitute
  for verification. Either you checked, or you state plainly what you could not check.
- **Never claim you tested how the game feels.** You cannot launch it. Frame timing,
  swing amplitude, spawn pressure and class balance are the owner's call, not yours.
- If you guessed a sprite frame index or grid layout, say that you guessed.
- Banned in every report: robust, comprehensive, production-ready, seamless, powerful,
  elegant, blazing, delightful, enterprise-grade.
- If something is broken, unfinished, or skipped, that goes in the **first sentence** of
  the phase report — not buried at the end.

---

## Communication

- No summary after each file edit. One short report per phase.
- No restating the plan before doing it. Do it.
- No "You're absolutely right", no "Great question", no preamble.
- No asking permission to continue between phases. Continue.
- Disagree once, in two sentences, then build what was asked.

---

## Scope

Build the phase you are on. Nothing else.

Not without being asked: settings screens, sound, music, localization, analytics,
achievements, cloud save, ads, a shop, extra classes, extra enemies, CI pipelines,
Dockerfiles, GitHub Actions, app.json branding changes, or refactors of files the
current phase does not touch.

Noticed something worth doing later? One line in `docs/BACKLOG.md`, then move on.

---

## Before every commit

- [ ] `npx tsc --noEmit` passes
- [ ] `npm test` passes
- [ ] `npx expo export --platform android` passes
- [ ] No comments added
- [ ] No `console.log`
- [ ] No `any` or `@ts-ignore`
- [ ] No allocation added inside `advance()`
- [ ] No new dependency, or the commit says why it was unavoidable
- [ ] `docs/ASSETS.md` updated if any asset fact was verified
- [ ] Commit message says what changed, not "improvements" or "updates"
