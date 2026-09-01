/**
 * Runtime capability probe — Codex CLI (v2.1.x, GitHub issue #2 problem 2)
 *
 * The static CAPABILITY_PROFILES table in shared.js declares codex as the
 * conservative floor (subagents 'none', goal/hooks/parallel false). Modern
 * codex-cli (reporter ran 0.147.0) reports those features stable+enabled via
 * `codex features list` — but the repo philosophy is load-bearing: an
 * unverified YES makes the model promise delegation it cannot perform.
 *
 * So instead of flipping constants, this module PROBES the codex CLI that is
 * actually installed on the machine at install time. The probe is pure and
 * side-effect-free: it only ever returns data. It can only ever UPGRADE a
 * whitelisted flag; every failure mode (binary missing, timeout, non-JSON
 * output, unrecognized schema) collapses to { ok: false } and the caller
 * keeps the conservative floor.
 *
 * VERIFIED-LIVE (2026-08-26, codex-cli 0.149.1 on Linux + 0.145.0 on the
 * owner's macOS — identical behavior on both):
 *   - `codex features list --json` DOES NOT EXIST ("error: unexpected
 *     argument '--json'", exit 2). The probe therefore runs the plain
 *     `codex features list` and parses its text table.
 *   - Real output is a 3-column text table: `<name>  <stage>  <enabled>`,
 *     stage ∈ { stable | under development | removed }, enabled ∈ true|false.
 *   - Real feature names relevant to the profile: `multi_agent` (stable true),
 *     `hooks` (stable true), `goals` (stable true). `multi_agent_v2` is
 *     stable but enabled=false; `enable_fanout` and `collaboration_modes`
 *     are removed. There is NO `parallel`-equivalent feature — the parallel
 *     flag stays at the static floor (false) on purpose.
 * JSON parsing is kept first as future-proofing (should codex ever ship a
 * machine-readable listing); the table parser handles today's reality. Both
 * stay deliberately strict — anything unrecognized means "no override",
 * never a guess.
 */

import { execFile } from 'child_process';

const PROBE_TIMEOUT_MS = 5000;
const PROBE_MAX_BUFFER = 1024 * 1024; // 1 MiB — `features list` output is tiny
const EVIDENCE_CAP_BYTES = 2048;

// Whitelist: codex feature name -> profile override. ONLY these keys can ever
// be upgraded, and only when the feature is explicitly reported stable AND
// enabled. Everything else in the codex profile stays the static floor.
// Names below are the REAL codex feature names (verified live, see header).
// `parallel` has no codex feature equivalent (`enable_fanout` is removed),
// so nothing here may ever upgrade it — the floor (false) stands.
const FEATURE_OVERRIDES = {
  multi_agent: { subagents: 'native' },
  hooks: { hooks: true },
  goals: { goal: true }
};

/** execFile that resolves (never rejects) with { ok, stdout, reason? }. */
function runCli(cmd, args) {
  return new Promise((resolve) => {
    let child;
    try {
      child = execFile(
        cmd,
        args,
        { timeout: PROBE_TIMEOUT_MS, maxBuffer: PROBE_MAX_BUFFER, windowsHide: true },
        (error, stdout) => {
          if (error) {
            const reason = error.killed || error.signal
              ? `timeout after ${PROBE_TIMEOUT_MS}ms`
              : error.code === 'ENOENT'
                ? 'codex CLI not found on PATH'
                : `exit ${error.code ?? 'unknown'}: ${String(error.message || '').slice(0, 200)}`;
            resolve({ ok: false, stdout: String(stdout || ''), reason });
          } else {
            resolve({ ok: true, stdout: String(stdout || '') });
          }
        }
      );
    } catch (error) {
      resolve({ ok: false, stdout: '', reason: `spawn failed: ${String(error.message || error).slice(0, 200)}` });
      return;
    }
    child.on('error', () => { /* surfaced through the callback's error */ });
  });
}

/**
 * Strict parser: parsed JSON -> { ok, overrides, reason? }.
 * Exported for the self-check fixtures (pure function, no I/O).
 *
 * Accepted shapes (VERIFY-LIVE — unconfirmed against a real codex-cli):
 *   1. [ { name|id, stage|status, enabled }, ... ]
 *   2. { features: [ ...same entries... ] }
 *   3. { <featureName>: { stage|status, enabled }, ... }
 * A feature maps to an override ONLY when it is whitelisted above AND
 * stage/status === 'stable' (case-insensitive) AND enabled === true.
 * Any other top-level shape -> { ok: false } (no override, conservative floor).
 */
export function extractOverrides(data) {
  let entries = null;

  if (Array.isArray(data)) {
    entries = data;
  } else if (data && typeof data === 'object' && Array.isArray(data.features)) {
    entries = data.features;
  } else if (
    data && typeof data === 'object' &&
    Object.keys(data).length > 0 &&
    Object.values(data).every((v) => v && typeof v === 'object' && !Array.isArray(v))
  ) {
    // Object map: { subagents: { stage, enabled }, ... }
    entries = Object.entries(data).map(([name, v]) => ({ name, ...v }));
  }

  if (!entries) {
    return { ok: false, overrides: {}, reason: 'unrecognized features schema' };
  }

  const overrides = {};
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') continue; // strict: skip junk rows
    const name = typeof entry.name === 'string' ? entry.name
      : typeof entry.id === 'string' ? entry.id
        : null;
    if (!name || !FEATURE_OVERRIDES[name]) continue; // not whitelisted -> ignored
    const stage = entry.stage ?? entry.status;
    const stableAndEnabled =
      typeof stage === 'string' &&
      stage.toLowerCase() === 'stable' &&
      entry.enabled === true;
    if (stableAndEnabled) Object.assign(overrides, FEATURE_OVERRIDES[name]);
  }
  return { ok: true, overrides };
}

/**
 * Parse the REAL `codex features list` text table into entry objects.
 * Exported for the self-check fixtures (pure function, no I/O).
 *
 * Verified-live format (codex-cli 0.145.0–0.149.1), one feature per line:
 *   apps                          stable             true
 *   artifact                      under development  false
 *   collaboration_modes           removed            true
 * i.e. `<name>  <stage>  <enabled>` separated by runs of 2+ spaces, where
 * stage itself may contain single spaces ("under development").
 *
 * Strictness: a line parses only when it has exactly 3 columns and the last
 * is the literal `true`/`false`. Fewer than MIN_TABLE_ROWS well-formed rows
 * means this is NOT the features table (a help screen, an error banner) and
 * the whole parse is rejected -> conservative floor.
 */
const MIN_TABLE_ROWS = 3;
export function parseFeatureTable(stdout) {
  const entries = [];
  for (const rawLine of String(stdout || '').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const cols = line.split(/\s{2,}/);
    if (cols.length !== 3) continue;
    const [name, stage, enabledRaw] = cols.map((c) => c.trim());
    if (enabledRaw !== 'true' && enabledRaw !== 'false') continue;
    if (!/^[a-z0-9_.-]+$/i.test(name)) continue;
    entries.push({ name, stage, enabled: enabledRaw === 'true' });
  }
  if (entries.length < MIN_TABLE_ROWS) {
    return { ok: false, entries: null, reason: 'features output is not a recognizable table' };
  }
  return { ok: true, entries };
}

/**
 * Probe the installed codex CLI for its feature set.
 *
 * @returns {Promise<{
 *   attempted: true,
 *   ok: boolean,
 *   cliVersion: string|null,
 *   overrides: object,        // {} unless ok && features verified stable+enabled
 *   evidence: string,         // raw trimmed stdout, capped at ~2 KB
 *   at: string,               // ISO timestamp of the probe
 *   reason?: string           // present when ok === false
 * }>}
 */
export async function probeCodexCapabilities() {
  const at = new Date().toISOString();

  // Version (same guards) — useful in capabilities.json even when the
  // features probe fails. Runs CONCURRENTLY with the features probe so a hung
  // codex binary costs one 5s timeout window, not a stack of them.
  // `--json` verified NOT to exist (exit 2) — one plain listing is the real
  // interface. Version runs CONCURRENTLY so a hung codex binary costs one
  // 5s timeout window, not a stack of them.
  const [versionRun, featuresRun] = await Promise.all([
    runCli('codex', ['--version']),
    runCli('codex', ['features', 'list'])
  ]);
  const cliVersion = versionRun.ok && versionRun.stdout.trim()
    ? versionRun.stdout.trim().slice(0, 100)
    : null;

  const evidence = featuresRun.stdout.trim().slice(0, EVIDENCE_CAP_BYTES);

  if (!featuresRun.ok) {
    return {
      attempted: true, ok: false, cliVersion, overrides: {}, evidence, at,
      reason: featuresRun.reason || 'codex features list failed'
    };
  }

  // Future-proof: accept JSON first (should codex ever ship it), then the
  // verified-live text table. Both parsers are strict; anything else is a
  // conservative no-override.
  let entriesOrParsed = null;
  let tableReason = null;
  try {
    entriesOrParsed = JSON.parse(featuresRun.stdout);
  } catch {
    const table = parseFeatureTable(featuresRun.stdout);
    if (table.ok) {
      entriesOrParsed = table.entries;
    } else {
      tableReason = table.reason;
    }
  }

  if (entriesOrParsed === null) {
    return {
      attempted: true, ok: false, cliVersion, overrides: {}, evidence, at,
      reason: tableReason || 'features output is neither JSON nor a recognizable table'
    };
  }

  const { ok, overrides, reason } = extractOverrides(entriesOrParsed);
  return {
    attempted: true, ok, cliVersion, overrides, evidence, at,
    ...(reason ? { reason } : {})
  };
}

// One probe per process: writeCapabilitiesJson (shared.js) and writeAgentsMd
// (codex.js) both need the result during a single install run — spawning the
// CLI twice would double the worst-case latency for zero information.
let _cachedProbe = null;

/** Memoized probeCodexCapabilities() — one CLI invocation per process. */
export function probeCodexCapabilitiesCached() {
  if (!_cachedProbe) _cachedProbe = probeCodexCapabilities();
  return _cachedProbe;
}

/** Test hook: forget the memoized probe (never used by the installer itself). */
export function _resetProbeCacheForTests() {
  _cachedProbe = null;
}

export default {
  probeCodexCapabilities,
  probeCodexCapabilitiesCached,
  extractOverrides,
  parseFeatureTable,
  _resetProbeCacheForTests
};
