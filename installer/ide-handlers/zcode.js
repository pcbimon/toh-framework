/**
 * ZCode (Z.ai) IDE Handler — v2.1
 *
 * ZCode is Z.ai's GLM-powered coding agent (desktop app + bundled CLI). It does
 * NOT need a bespoke surface: it reads the two open standards this framework
 * already writes.
 *
 *   1. Workspace `AGENTS.md`      — project memory (same file Codex reads)
 *   2. Project `.agents/skills/`  — the 37 skill wrappers
 *   3. Project `.agents/commands/`— real `/toh-*` slash commands  ← ZCode-only today
 *
 * VERIFIED LIVE against ZCode CLI 0.16.3 on macOS, in a directory installed by
 * this installer:
 *
 *   $ zcode skills list --cwd <project> --json
 *     37 entries with "scope":"project", "source":"agents",
 *     "rootPath":"<project>/.agents/skills", diagnostics: []
 *
 *   $ zcode commands list --cwd <project> --json
 *     "scope":"project", "source":"agents",
 *     "rootPath":"<project>/.agents/commands"
 *
 * That is why this handler is thin by design — writing a `.zcode/` surface of
 * our own would duplicate files ZCode already finds. `.zcode/commands/` IS a
 * valid native path, but it is redundant with `.agents/commands/` and would
 * double every command on disk, so we deliberately do not write it.
 *
 * Memory templates are NOT generated here: install.js seeds .toh/memory for
 * every install before the IDE loop runs, so a seventh inline copy of those
 * templates would be pure drift surface.
 */

import { writeAgentsMd } from './codex.js';
import { writeAgentsCommands } from './shared.js';

/**
 * @param {string} targetDir  project root
 * @param {string} srcDir     package src/
 * @param {string} language   'en' | 'th'
 * @param {object} [options]
 * @param {boolean} [options.writeAgentsMd=true]
 *        Set false when Codex is ALSO selected. AGENTS.md is one physical file
 *        shared by both runtimes; codex.js writes the conservative variant
 *        (no subagents, no slash commands), which stays true for ZCode too.
 *        Writing it twice would leave whichever handler ran last claiming
 *        capabilities the other runtime does not have.
 */
export async function setupZcode(targetDir, srcDir, language = 'en', options = {}) {
  const { writeAgentsMd: shouldWriteAgentsMd = true } = options;

  if (shouldWriteAgentsMd) {
    await writeAgentsMd(targetDir, srcDir, language, 'zcode');
  }

  // Native project slash commands. Runtimes that ignore .agents/commands/ are
  // unaffected — they still reach the same 14 prompts via .agents/skills/toh-*.
  const { commands } = await writeAgentsCommands(targetDir, srcDir);

  // Reported by the installer spinner, so name the real surfaces — and stay
  // honest on the codex+zcode path where ZCode does not own AGENTS.md.
  return shouldWriteAgentsMd
    ? `AGENTS.md + .agents/commands/ (${commands})`
    : `.agents/commands/ (${commands})`;
}

export default { setupZcode };
