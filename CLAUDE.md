# CLAUDE.md — Toh Framework (repo development guide)

Guide for a Claude Code agent developing the framework itself. Repo-only: not in the package.json
`files` whitelist, so it never ships to npm. (claude-code.js generates a separate, unrelated CLAUDE.md inside end-user projects.)

## What this is

Toh Framework ("Type Once, Have it all") is the npm package `toh-framework` (v2.0.0, MIT, ESM,
Node >= 18, no build step) that installs an AI-orchestration development system into 5 IDEs:
Claude Code, Cursor, Gemini CLI, Google Antigravity, and Codex CLI.

North Star: a non-technical person types one sentence, approves once ("Go"), and THE TOH LOOP
builds, tests, and fixes a real, beautiful app until verified DONE. Quality is measured at the
END USER's experience, never at this repo's code. Any change that adds a question or step for
that user is a regression — /toh-vibe asks zero questions, /toh-plan asks exactly one.

## Everyday commands

All npm scripts wrap `node bin/toh-cli.js <cmd>`, which lazy-loads `installer/*.js`:

- `npm run install:local` — interactive installer; `-- --quick` (plus `-t <dir>`) for non-interactive runs
- `npm run list` — print the catalog (hardcoded and stale — see Gotchas)
- `npm run status` — inspect install state (~/.claude, ./.toh, manifest.json)
- `npm run bundle` — web prompt bundles into ./dist/web-bundles
- `npm test` — node:test suite (tests/, in-band runner; currently covers the Codex installer)
- `npm pack --dry-run` — check exactly what ships before any packaging change

## Verification protocol

`npm test` covers the Codex install/uninstall behavior; the rest is verified by running for real
(.github/workflows/ci.yml runs both on Node 18 + 22):

1. Run what you touched — `npm test`, install into a scratch dir, `npm run list`/`status`, `npm pack --dry-run`.
  Inspect the generated output (.toh/, .claude/, .cursor/rules/, AGENTS.md, .agents/skills/, .codex/config.toml, .gemini/, .agent/workflows/) — never assume a transform worked.
2. Coffee-Shop-Owner Test for any user-facing change: Could a coffee-shop owner use this
   without tech vocabulary? Does the system ever ask a question they can't answer? When it
   breaks, do they know what to do next? Does the output look professionally made?

## Single source, transformed per IDE

`src/` is the ONLY source of truth; installed copies (.toh/, .claude/, .cursor/, AGENTS.md,
GEMINI.md, .agent/) are generated output — editing them is always wrong. Edit `src/`, re-run the installer.

`installer/install.js` first copies shared resources into the target's `.toh/` (skills, agents,
commands, templates, 7 memory files, plan.md, progress.md, manifest.json, capabilities.json),
then 4 handlers in `installer/ide-handlers/` (plus shared.js utilities) cover the 5 IDEs:

- claude-code.js → .claude/ + project CLAUDE.md + Stop hook + .claude/loop.md; agent frontmatter
  is filtered to native keys (name/description/tools/model + pass-through autonomy keys;
  skills/triggers dropped; model defaults to sonnet). NEVER inject a default tools list —
  absence means unrestricted; a default would widen restricted agents.
- cursor.js → .cursor/rules/*.mdc + root .cursorrules; only toh-framework.mdc @-references
  .toh/agents/*.md — .cursorrules and toh-agents.mdc are plain prose (agent bodies never copied).
- gemini-cli.js → BOTH Gemini CLI (.gemini/: TOML commands from src/gemini-commands/, skills,
  GEMINI.md) and Antigravity (.agent/workflows/ from src/antigravity-workflows/); selecting
  gemini auto-adds antigravity. There is no antigravity.js.
- codex.js → NATIVE Codex skills: one thin wrapper per supporting skill and command at
  .agents/skills/<name>/SKILL.md (generated from src/skills/ and src/commands/; each wrapper
  points at .toh/commands/*.md or .toh/skills/* and states Codex constraints — no subagents,
  no Stop hook, sequential TOH LOOP) + a CONCISE managed AGENTS.md block
  (TOH-FRAMEWORK-START/END: identity, capabilities, skills table, legacy `/toh-*` compat
  note, memory protocol). Never embed agent bodies in AGENTS.md again (pre-v2.1 behavior —
  Codex has no subagents to run them). Exports uninstallCodex() (removes only
  generator-marked skills + the managed block); install.js cleanExistingInstall and the
  `toh uninstall` CLI command both use it. `.toh/` runtime is seeded only-if-absent.

Per-IDE command divergence lives in ONE markdown source via `<!-- tfw:claude -->` (kept only for
Claude Code) / `<!-- tfw:fallback -->` (kept for everyone else) blocks, resolved by shared.js
transformCommand(). install.js normalizes .toh/commands to the universal variant AFTER the IDE
loop — that is why claude-code.js transforms from package src/commands, not .toh/commands.

## Repo map

- `src/agents/` — exactly 8 agent .md files + README.md, no subdirectories (src/agents/subagents/
  was deleted in v2.0.0, commit c33dcf3 — never reference it). Superset frontmatter: name,
  "Delegate when:" description, narrow per-agent tools allowlist, model, skills, triggers,
  optional memory/isolation/maxTurns; keep filename == frontmatter name. Model tiers are
  deliberate cost routing: opus = plan-orchestrator (THE BRAIN) + design-reviewer; sonnet =
  ui-builder, dev-builder, backend-connector, platform-adapter, root-cause-debugger (read-only
  Read/Grep/Glob/Bash — proves root cause, never edits); haiku = test-runner (Playwright
  auto-fix, maxTurns 30).
- `src/skills/` — 23 skills, one dir each with SKILL.md (formats vary). Load-bearing pair:
  orchestration-protocol (HOW work executes) + engineer-harness (how stages END) — reference
  both, duplicate neither. Command brains: vibe-orchestrator, plan-orchestrator, smart-routing;
  design-craft owns UI identity.
- `src/commands/` — 14 slash commands (toh.md + 13 toh-*.md) + README.md; YAML frontmatter
  binds 13 of them to skills (toh-help.md alone has no skills key); Thai-voiced bodies are intentional.
- `src/gemini-commands/` (14 TOML) and `src/antigravity-workflows/` (14 md) — parallel
  command surfaces that must stay in sync with src/commands/.
- `src/templates/` — structural-only starters (components/, pages/, nextjs-pro/): Next.js 16 /
  React 19 (ref-as-prop, zero forwardRef) / Tailwind 4 (no tailwind.config.js), pinned in
  nextjs-pro/package.json. Visual character always comes from each project's DESIGN.md.
- `src/memory/` — spec/docs ONLY; the installer never copies it. Memory templates are
  generated inline in 5 code sites (install.js + all 4 IDE handlers).
- `bin/` — toh-cli.js is the only live entry; toh-npx-wrapper.js is dead.
- `docs/` — README-TH.md (Thai mirror of README.md), V2-UPGRADE-PLAN.md, assets/.

## Core mechanics — never break these

- TOH LOOP: src/skills/orchestration-protocol/SKILL.md is its single source (survey,
  teams/subagents/sequential ladder, model routing, plan schema, the loop itself). Its
  hard-limits table is "load-bearing — never soften".
- Plan-as-file: .toh/plan.md (checkbox backlog, <=150 lines) + .toh/progress.md ARE the
  state; checkbox-resume is Auto-Resume across sessions and IDEs.
- QC gate: the orchestrator re-runs checkpoints ITSELF and quotes real output;
  `<promise>COMPLETE</promise>` only after quoted passing "Done When" runs.
- Design Identity: design-reviewer generates project-root DESIGN.md (two-pass, from
  design-craft/DESIGN-TEMPLATE.md) as task T000 before any UI code; the versioned
  AVOID-LIST.md ships inside src/skills/design-craft/, never per-project.
- Stop hook (Claude Code only): mergeSettingsStopHook in claude-code.js appends an idempotent
  (`<TFW-STOP-HOOK>` marker), strictly additive prompt hook to .claude/settings.json that blocks
  ending a session while plan.md has unchecked unblocked tasks. The other 4 IDEs run the same
  loop as prose — keep it self-sufficient without hooks.
- Reinstall safety: .toh/plan.md / .toh/progress.md AND the 7 .toh/memory/*.md files are
  seeded only if absent (live state — never clobber); never remove/reorder user hook entries;
  never overwrite a user .claude/loop.md.

## Change checklist (5-IDE parity)

- Command change → src/commands/*.md (keep both tfw marker branches in sync) +
  src/gemini-commands/*.toml + src/antigravity-workflows/*.md + the hardcoded catalog
  in installer/list.js + stats in toh-help.md and both READMEs.
- Agent change → src/agents/*.md + its README.md table + hardcoded agent tables in
  cursor.js; never widen a tools allowlist (per-agent security boundary).
- Memory format change → 5 inline code sites plus src/memory/ docs.

## Release process

1. Bump semver in package.json (pre-releases: X.Y.Z-beta.N).
2. Add a newest-first CHANGELOG.md entry `## [X.Y.Z] - YYYY-MM-DD` with Changed/Added/Technical
   subsections; Technical records agent/skill/command counts and every synced IDE surface (the
   [2.0.0] Technical says 8 / 22 / 14 — its R2 subsection adds the 23rd skill, 22 → 23).
3. Sync user-facing text in README.md AND docs/README-TH.md.
4. `npm pack --dry-run`: the files whitelist stays [bin, installer, src, docs, !docs/assets, dist]
   (+ auto package.json, README.md, LICENSE) — ~282 kB at v2.0.0. Keep the !docs/assets negation
   (and matching .npmignore line): dropping it triples the tarball. CHANGELOG.md does not ship.
5. Tag lowercase vX.Y.Z on the release commit and push the tag — .github/workflows/release.yml
   smoke-tests, publishes to npm with provenance (needs the NPM_TOKEN repo secret), and creates
   the GitHub Release from that CHANGELOG section. Never publish unverified by hand.

## Gotchas

- Local-only dirs may exist in a working copy (.claude/, claude-project/, TFW-CustomEdition/,
  .cursor/, .playwright-mcp/ — all gitignored); shipped files (bin/, installer/, src/, docs/,
  READMEs) must NEVER reference any of them.
- Stale counts: src/commands/README.md says 13 (omits /toh-protect); installer/list.js prints
  11/6/7 — trust toh-help.md's 14 / 8 / 23. Alias collision: /toh-plan and /toh-protect both claim /toh-p.
- src/agents/README.md oversimplifies two transforms — installer/ide-handlers/ is authoritative.
  Dead/stale, do not propagate: bin/toh-npx-wrapper.js, installer/bundle.js (v1.0.0 text, *star
  commands). (The old codex.js footer with the ArtificialWeb URL was removed in v2.1.0.)
- Tests: `npm test` runs tests/run.js — an IN-BAND node:test runner. Do not switch it to
  `node --test tests/`: child-process isolation is intermittently corrupted by the dependency
  stack on Node 24 ("Unable to deserialize cloned data"). Tests set TOH_QUIET=1 (install.js
  silences ora on that flag — ora is the IPC corruptor).
- Internal skill version strings are independent of the package version — don't "fix" them.
  dist/ is gitignored and absent but whitelisted — a stray local build would silently ship.
