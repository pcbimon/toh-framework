/**
 * Codex integration tests (node:test).
 *
 * Covers:
 *   - fresh installation layout (.toh/, .agents/skills/, AGENTS.md)
 *   - preservation of existing AGENTS.md content
 *   - idempotency + deterministic output across reinstalls
 *   - preservation of unrelated user Codex skills
 *   - removal of stale TOH-managed skills
 *   - uninstall (TOH files out, user files stay)
 *   - SKILL.md validity (frontmatter, non-empty body, resolving references)
 *   - AGENTS.md size guard and Codex project-doc quota
 *
 * Run: npm test
 */

// Silence ora spinners: ora corrupts the node:test child-process IPC channel.
// Reads at call time, so import hoisting is not a problem.
process.env.TOH_QUIET = '1';

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';
import { parse as parseToml } from 'smol-toml';

import { install } from '../installer/install.js';
import {
  AGENTS_MAX_BYTES,
  CODEX_AGENTS_DIR,
  CODEX_MODEL_ROUTING,
  CODEX_SKILLS_DIR,
  assertAgentsMdSize,
  setupCodex,
  uninstallCodex,
  installCodexSkills,
  readAgentCatalog,
  readCommandCatalog,
  readSupportingSkillCatalog,
  setupCodexConfig,
  translateAgentToCodex
} from '../installer/ide-handlers/codex.js';
import { CAPABILITY_PROFILES, renderCapabilitiesSection } from '../installer/ide-handlers/shared.js';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.join(path.dirname(__filename), '..');
const SRC_DIR = path.join(REPO_ROOT, 'src');

const EXPECTED_COMMANDS = [
  'toh',
  'toh-connect',
  'toh-design',
  'toh-dev',
  'toh-fix',
  'toh-help',
  'toh-line',
  'toh-mobile',
  'toh-plan',
  'toh-protect',
  'toh-ship',
  'toh-test',
  'toh-ui',
  'toh-vibe'
];

const EXPECTED_AGENTS = [
  'backend-connector',
  'design-reviewer',
  'dev-builder',
  'plan-orchestrator',
  'platform-adapter',
  'root-cause-debugger',
  'test-runner',
  'ui-builder'
];

// ---------------------------------------------------------------- helpers

async function makeTmpProject() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'toh-codex-test-'));
}

async function quickInstallCodex(targetDir) {
  // install() with quick: true is fully non-interactive, even on reinstall.
  await install({ target: targetDir, ide: 'codex', quick: true });
}

/** Map of relative file path -> content for every file under root. */
async function snapshotTree(root) {
  const out = new Map();
  const walk = async (dir) => {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(p);
      else out.set(path.relative(root, p), await fs.readFile(p, 'utf8'));
    }
  };
  if (await fs.pathExists(root)) await walk(root);
  return out;
}

function parseSkillFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  assert.ok(m, 'SKILL.md must start with a YAML frontmatter block');
  return { fm: yaml.load(m[1]), body: m[2] };
}

// ---------------------------------------------------------------- tests

test('fresh install creates .toh/, .agents/skills/, config.toml and AGENTS.md', async () => {
  const dir = await makeTmpProject();
  try {
    await quickInstallCodex(dir);

    assert.ok(await fs.pathExists(path.join(dir, '.toh', 'plan.md')), '.toh/plan.md exists');
    assert.ok(await fs.pathExists(path.join(dir, '.toh', 'progress.md')), '.toh/progress.md exists');
    assert.ok(await fs.pathExists(path.join(dir, '.toh', 'memory', 'active.md')), 'memory seeded');
    assert.ok(await fs.pathExists(path.join(dir, '.toh', 'skills', 'orchestration-protocol', 'SKILL.md')), '.toh skills installed');
    assert.ok(await fs.pathExists(path.join(dir, 'AGENTS.md')), 'AGENTS.md exists');
    assert.ok(await fs.pathExists(path.join(dir, '.codex', 'config.toml')), 'Codex config exists');
    const config = await fs.readFile(path.join(dir, '.codex', 'config.toml'), 'utf8');
    const parsedConfig = parseToml(config);
    assert.equal(parsedConfig.project_doc_max_bytes, 65536, 'project doc quota is a root-level setting');
    assert.equal(parsedConfig.features.multi_agent, true, 'native delegation is enabled');
    assert.ok(!(await fs.pathExists(path.join(dir, '.codex', 'skills'))), 'legacy .codex/skills is not used');

    const generatedAgents = (await fs.readdir(path.join(dir, CODEX_AGENTS_DIR))).sort();
    assert.deepEqual(generatedAgents, EXPECTED_AGENTS.map((name) => `${name}.toml`), 'all eight native agents generated');
    const manifest = await fs.readJson(path.join(dir, '.codex', 'toh-framework.json'));
    assert.equal(Object.keys(manifest.agents).length, 8, 'native agents are ownership-tracked');
    const rootCause = parseToml(await fs.readFile(path.join(dir, CODEX_AGENTS_DIR, 'root-cause-debugger.toml'), 'utf8'));
    assert.equal(rootCause.sandbox_mode, 'read-only', 'read-only source agent maps to Codex read-only sandbox');
    assert.equal(rootCause.model, CODEX_MODEL_ROUTING.review.model);
    assert.equal(rootCause.model_reasoning_effort, CODEX_MODEL_ROUTING.review.model_reasoning_effort);
    assert.ok(rootCause.developer_instructions.includes('Status, Result, Evidence, Files, and Blockers'));
    assert.ok((await fs.readFile(path.join(dir, 'AGENTS.md'), 'utf8')).includes('.codex/agents/*.toml'));

    const supporting = await readSupportingSkillCatalog(SRC_DIR);
    assert.equal(supporting.length, 23, 'all 23 supporting skills are catalogued');
    assert.equal((await fs.readdir(path.join(dir, CODEX_SKILLS_DIR))).length, 37, '23 supporting skills and 14 workflow commands are wrapped');
    for (const skill of EXPECTED_COMMANDS) {
      assert.ok(
        await fs.pathExists(path.join(dir, CODEX_SKILLS_DIR, skill, 'SKILL.md')),
        `native skill installed: ${skill}`
      );
    }
  } finally {
    await fs.remove(dir);
  }
});

test('native agent translation preserves source intents and valid TOML', async () => {
  const dir = await makeTmpProject();
  try {
    await quickInstallCodex(dir);
    const catalog = await readAgentCatalog(dir);
    assert.deepEqual(catalog.map((agent) => agent.name), EXPECTED_AGENTS);
    for (const agent of catalog) {
      const parsed = parseToml(translateAgentToCodex(agent));
      assert.equal(parsed.name, agent.name);
      assert.equal(parsed.model, CODEX_MODEL_ROUTING[agent.modelIntent].model);
      assert.equal(parsed.model_reasoning_effort, CODEX_MODEL_ROUTING[agent.modelIntent].model_reasoning_effort);
      assert.equal(typeof parsed.developer_instructions, 'string');
    }
  } finally {
    await fs.remove(dir);
  }
});

test('Codex CLI capabilities are native without a CLI binary probe', () => {
  const profile = CAPABILITY_PROFILES.codex;
  assert.equal(profile.client, 'codex-cli');
  assert.equal(profile.detection, 'declared-at-install');
  assert.equal(profile.subagents, 'native');
  assert.equal(profile.parallel, true);
  assert.equal(profile.modelRouting, true);
  const section = renderCapabilitiesSection('codex');
  assert.match(section, /\.codex\/agents/);
  assert.match(section, /Codex model and reasoning/);
  assert.doesNotMatch(section, /single-session only/);
});

test('existing Codex feature and quota settings are not duplicated', async () => {
  const dir = await makeTmpProject();
  try {
    const configPath = path.join(dir, '.codex', 'config.toml');
    const userConfig = 'project_doc_max_bytes = 12345\n[features]\nmulti_agent = false\n';
    await fs.ensureDir(path.dirname(configPath));
    await fs.writeFile(configPath, userConfig);

    await setupCodexConfig(dir);
    assert.equal(await fs.readFile(configPath, 'utf8'), userConfig, 'user-owned Codex settings stay unchanged');
  } finally {
    await fs.remove(dir);
  }
});

test('existing Codex features keep their value while root quota is added', async () => {
  const dir = await makeTmpProject();
  try {
    const configPath = path.join(dir, '.codex', 'config.toml');
    const userConfig = '[features]\nmulti_agent = false\n';
    await fs.ensureDir(path.dirname(configPath));
    await fs.writeFile(configPath, userConfig);

    await setupCodexConfig(dir);
    const parsed = parseToml(await fs.readFile(configPath, 'utf8'));
    assert.equal(parsed.project_doc_max_bytes, 65536);
    assert.equal(parsed.features.multi_agent, false, 'user feature value stays unchanged');
  } finally {
    await fs.remove(dir);
  }
});

test('root quota is inserted before unrelated Codex tables', async () => {
  const dir = await makeTmpProject();
  try {
    const configPath = path.join(dir, '.codex', 'config.toml');
    const userConfig = '[profiles.default]\nmodel = "user-model"\n';
    await fs.ensureDir(path.dirname(configPath));
    await fs.writeFile(configPath, userConfig);

    await setupCodexConfig(dir);
    const parsed = parseToml(await fs.readFile(configPath, 'utf8'));
    assert.equal(parsed.project_doc_max_bytes, 65536, 'quota remains at the TOML root');
    assert.equal(parsed.features.multi_agent, true);
    assert.equal(parsed.profiles.default.model, 'user-model', 'unrelated table is preserved');
  } finally {
    await fs.remove(dir);
  }
});

test('Claude agent output keeps native fields and drops Codex-only modelIntent', async () => {
  const dir = await makeTmpProject();
  try {
    await install({ target: dir, ide: 'claude-code', quick: true });
    const raw = await fs.readFile(path.join(dir, '.claude', 'agents', 'ui-builder.md'), 'utf8');
    const { fm } = parseSkillFrontmatter(raw);
    assert.equal(fm.name, 'ui-builder');
    assert.equal(fm.model, 'sonnet');
    assert.equal(fm.modelIntent, undefined);
  } finally {
    await fs.remove(dir);
  }
});

test('existing AGENTS.md user content is preserved', async () => {
  const dir = await makeTmpProject();
  try {
    const userContent = '# My Project\n\nKeep this text.\n';
    await fs.writeFile(path.join(dir, 'AGENTS.md'), userContent);

    await quickInstallCodex(dir);

    const agents = await fs.readFile(path.join(dir, 'AGENTS.md'), 'utf8');
    assert.ok(agents.includes('Keep this text.'), 'user text kept');
    assert.ok(agents.includes('<!-- TOH-FRAMEWORK-START -->'), 'TOH block present');
    assert.ok(agents.indexOf('Keep this text.') < agents.indexOf('<!-- TOH-FRAMEWORK-START -->'), 'TOH block appended after user content');
  } finally {
    await fs.remove(dir);
  }
});

test('reinstall is idempotent and deterministic', async () => {
  const dir = await makeTmpProject();
  try {
    await quickInstallCodex(dir);
    const first = await snapshotTree(dir);

    await quickInstallCodex(dir); // quick mode must not prompt
    const second = await snapshotTree(dir);

    // Exactly one TOH block in AGENTS.md
    const agents = second.get('AGENTS.md');
    const starts = agents.split('<!-- TOH-FRAMEWORK-START -->').length - 1;
    const ends = agents.split('<!-- TOH-FRAMEWORK-END -->').length - 1;
    assert.equal(starts, 1, 'exactly one TOH start marker');
    assert.equal(ends, 1, 'exactly one TOH end marker');

    // Same file set (no duplicated skills)
    assert.deepEqual([...first.keys()].sort(), [...second.keys()].sort(), 'file set stable');

    // Deterministic content for everything except timestamped install metadata
    const VOLATILE = new Set(['.toh/manifest.json', '.toh/capabilities.json']);
    for (const [file, content] of first) {
      if (VOLATILE.has(file)) continue;
      assert.equal(second.get(file), content, `identical content: ${file}`);
    }
  } finally {
    await fs.remove(dir);
  }
});

test('native agents preserve user and ZCode files and modified generated agents', async () => {
  const dir = await makeTmpProject();
  try {
    const userAgentPath = path.join(dir, CODEX_AGENTS_DIR, 'user-agent.toml');
    const zcodePath = path.join(dir, '.zcode', 'agents', 'user.toml');
    const userAgent = 'name = "user-agent"\ndescription = "User-owned"\n';
    await fs.ensureDir(path.dirname(userAgentPath));
    await fs.ensureDir(path.dirname(zcodePath));
    await fs.writeFile(userAgentPath, userAgent);
    await fs.writeFile(zcodePath, 'user zcode configuration\n');

    await quickInstallCodex(dir);
    const generatedPath = path.join(dir, CODEX_AGENTS_DIR, 'ui-builder.toml');
    const modified = `${await fs.readFile(generatedPath, 'utf8')}\nUser customization.\n`;
    await fs.writeFile(generatedPath, modified);

    await quickInstallCodex(dir);
    assert.equal(await fs.readFile(generatedPath, 'utf8'), modified, 'modified generated agent is preserved');
    assert.equal(await fs.readFile(userAgentPath, 'utf8'), userAgent, 'user Codex agent is preserved');
    assert.equal(await fs.readFile(zcodePath, 'utf8'), 'user zcode configuration\n', 'ZCode files are untouched');

    const result = await uninstallCodex(dir, { backup: false });
    assert.equal(result.removedAgents.length, 7, 'only unmodified generated agents are removed');
    assert.ok(await fs.pathExists(generatedPath), 'modified generated agent remains');
    assert.ok(await fs.pathExists(userAgentPath), 'user Codex agent remains');
    assert.ok(await fs.pathExists(zcodePath), 'ZCode file remains');
  } finally {
    await fs.remove(dir);
  }
});

test('unrelated user Codex skills are never touched', async () => {
  const dir = await makeTmpProject();
  try {
    const userSkillDir = path.join(dir, CODEX_SKILLS_DIR, 'my-company-skill');
    await fs.ensureDir(userSkillDir);
    const userSkill = '---\nname: my-company-skill\ndescription: mine\n---\n\nUser-owned.\n';
    await fs.writeFile(path.join(userSkillDir, 'SKILL.md'), userSkill);

    await quickInstallCodex(dir);

    assert.equal(
      await fs.readFile(path.join(userSkillDir, 'SKILL.md'), 'utf8'),
      userSkill,
      'user skill content unchanged'
    );

    // Even a user-owned skill with a toh- name survives (no ownership hash).
    const userTohDir = path.join(dir, CODEX_SKILLS_DIR, 'toh-custom');
    await fs.ensureDir(userTohDir);
    const userToh = '---\nname: toh-custom\ndescription: user owned\n---\n\nMine.\n';
    await fs.writeFile(path.join(userTohDir, 'SKILL.md'), userToh);
    await setupCodex(dir, SRC_DIR, 'en');
    assert.equal(await fs.readFile(path.join(userTohDir, 'SKILL.md'), 'utf8'), userToh, 'user toh-* skill kept');
  } finally {
    await fs.remove(dir);
  }
});

test('stale TOH-managed skills are removed on reinstall', async () => {
  const dir = await makeTmpProject();
  try {
    await quickInstallCodex(dir);

    // Simulate a skill generated by an older TOH version with a manifest entry.
    const staleDir = path.join(dir, CODEX_SKILLS_DIR, 'toh-legacy');
    await fs.ensureDir(staleDir);
    const staleContent = '---\nname: toh-legacy\ndescription: old\nmetadata:\n  generator: toh-framework\n---\n\nOld.\n';
    await fs.writeFile(
      path.join(staleDir, 'SKILL.md'),
      staleContent
    );
    const staleAgentPath = path.join(dir, CODEX_AGENTS_DIR, 'toh-legacy-agent.toml');
    const staleAgentContent = 'name = "toh-legacy-agent"\ndescription = "old"\ndeveloper_instructions = "old"\n';
    await fs.writeFile(staleAgentPath, staleAgentContent);
    const manifestPath = path.join(dir, '.codex', 'toh-framework.json');
    const manifest = await fs.readJson(manifestPath);
    manifest.files['.agents/skills/toh-legacy/SKILL.md'] = {
      sha256: createHash('sha256').update(staleContent).digest('hex'),
      kind: 'command',
      source: '.toh/commands/toh-legacy.md'
    };
    manifest.agents['.codex/agents/toh-legacy-agent.toml'] = {
      sha256: createHash('sha256').update(staleAgentContent).digest('hex'),
      source: '.toh/agents/toh-legacy-agent.md',
      modelIntent: 'implementation'
    };
    await fs.writeJson(manifestPath, manifest, { spaces: 2 });

    await setupCodex(dir, SRC_DIR, 'en');

    assert.ok(!(await fs.pathExists(staleDir)), 'stale TOH-managed skill removed');
    assert.ok(!(await fs.pathExists(staleAgentPath)), 'stale TOH-managed agent removed');
    assert.ok(await fs.pathExists(path.join(dir, CODEX_SKILLS_DIR, 'toh-plan', 'SKILL.md')), 'current skills intact');
  } finally {
    await fs.remove(dir);
  }
});

test('uninstall removes TOH Codex files and keeps user files + .toh state', async () => {
  const dir = await makeTmpProject();
  try {
    // Pre-existing user content
    await fs.writeFile(path.join(dir, 'AGENTS.md'), '# My Project\n\nKeep this text.\n');
    const userSkillDir = path.join(dir, CODEX_SKILLS_DIR, 'my-company-skill');
    await fs.ensureDir(userSkillDir);
    await fs.writeFile(path.join(userSkillDir, 'SKILL.md'), '---\nname: my-company-skill\ndescription: mine\n---\n');

    await quickInstallCodex(dir);

    // Pretend the loop ran: live state that must survive a codex uninstall.
    await fs.writeFile(path.join(dir, '.toh', 'plan.md'), '# Plan: real work\n\n- [ ] T001 [P] ui-builder — thing in app/page.tsx\n');

    const { removedSkills, removedAgents, agentsMd, config, backupPath } = await uninstallCodex(dir);

    assert.equal(removedSkills.length, 14, 'all TOH workflow wrappers removed');
    assert.equal(removedAgents.length, 8, 'all unmodified native agents removed');
    for (const skill of EXPECTED_COMMANDS) {
      assert.ok(!(await fs.pathExists(path.join(dir, CODEX_SKILLS_DIR, skill))), `removed ${skill}`);
    }
    assert.ok(await fs.pathExists(path.join(userSkillDir, 'SKILL.md')), 'user skill remains');
    assert.ok(await fs.pathExists(path.join(dir, CODEX_SKILLS_DIR)), '.agents/skills dir kept');
    assert.ok(!(await fs.pathExists(path.join(dir, CODEX_AGENTS_DIR))), 'empty native agent directory removed');
    assert.equal(config, 'removed');
    assert.ok(backupPath && await fs.pathExists(backupPath), 'uninstall creates a backup');

    assert.equal(agentsMd, 'updated');
    const agents = await fs.readFile(path.join(dir, 'AGENTS.md'), 'utf8');
    assert.ok(agents.includes('Keep this text.'), 'user AGENTS.md text remains');
    assert.ok(!agents.includes('<!-- TOH-FRAMEWORK-START -->'), 'TOH block removed');

    // Codex-only uninstall must not touch shared .toh state.
    const plan = await fs.readFile(path.join(dir, '.toh', 'plan.md'), 'utf8');
    assert.ok(plan.includes('real work'), '.toh/plan.md preserved');
  } finally {
    await fs.remove(dir);
  }
});

test('uninstall deletes AGENTS.md only when it was TOH-only', async () => {
  const dir = await makeTmpProject();
  try {
    await setupCodex(dir, SRC_DIR, 'en'); // standalone: creates AGENTS.md
    const { agentsMd } = await uninstallCodex(dir);
    assert.equal(agentsMd, 'removed');
    assert.ok(!(await fs.pathExists(path.join(dir, 'AGENTS.md'))), 'TOH-only AGENTS.md removed');
    assert.ok(!(await fs.pathExists(path.join(dir, '.codex', 'config.toml'))), 'TOH-only config removed');
  } finally {
    await fs.remove(dir);
  }
});

test('every generated SKILL.md is valid and its references resolve', async () => {
  const dir = await makeTmpProject();
  try {
    await quickInstallCodex(dir);

    const skillsRoot = path.join(dir, CODEX_SKILLS_DIR);
    const entries = (await fs.readdir(skillsRoot, { withFileTypes: true })).filter((e) => e.isDirectory());
    assert.equal(entries.length, 37, 'exactly 23 supporting and 14 TOH workflow wrappers exist');

    const NAME_RE = /^[a-z0-9-]{1,64}$/;
    for (const entry of entries) {
      const raw = await fs.readFile(path.join(skillsRoot, entry.name, 'SKILL.md'), 'utf8');
      const { fm, body } = parseSkillFrontmatter(raw);

      assert.ok(NAME_RE.test(fm.name), `${entry.name}: valid skill name`);
      assert.equal(fm.name, entry.name, 'frontmatter name matches directory');
      assert.ok(typeof fm.description === 'string' && fm.description.length > 0, 'description present');
      assert.ok(fm.description.length <= 1024, 'description within Codex limit');
      if (EXPECTED_COMMANDS.includes(entry.name)) {
        assert.equal(fm.metadata?.generator, 'toh-framework', 'command generator marker present');
        assert.equal(fm.metadata?.kind, 'command', 'command wrapper kind present');
      }
      assert.ok(body.trim().length > 0, 'non-empty instructions');

      // Every `.toh/...` reference in the body must resolve to a real file.

    const agents = await fs.readFile(path.join(dir, 'AGENTS.md'), 'utf8');
    assert.ok(Buffer.byteLength(agents, 'utf8') <= AGENTS_MAX_BYTES, 'AGENTS.md is below Codex limit');
      const refs = raw.match(/`(\.toh\/[^`]+)`/g) || [];
      assert.ok(refs.length > 0, `${entry.name}: references .toh files`);
      for (const ref of refs) {
        const rel = ref.slice(1, -1);
        assert.ok(await fs.pathExists(path.join(dir, rel)), `${entry.name}: resolves ${rel}`);
      }
    }
  } finally {
    await fs.remove(dir);
  }
});

test('skills reference the supporting .toh/skills from command frontmatter', async () => {
  const dir = await makeTmpProject();
  try {
    await quickInstallCodex(dir);
    const catalog = await readCommandCatalog(SRC_DIR);
    for (const entry of catalog) {
      const raw = await fs.readFile(
        path.join(dir, CODEX_SKILLS_DIR, entry.skillName, 'SKILL.md'),
        'utf8'
      );
      assert.ok(raw.includes(`.toh/commands/${entry.file}`), `${entry.skillName}: references its command file`);
      for (const s of entry.skills) {
        assert.ok(raw.includes(`.toh/skills/${s}/SKILL.md`), `${entry.skillName}: references skill ${s}`);
        assert.ok(
          await fs.pathExists(path.join(dir, '.toh', 'skills', s, 'SKILL.md')),
          `${entry.skillName}: supporting skill ${s} actually installed`
        );
      }
    }
  } finally {
    await fs.remove(dir);
  }
});

test('modified TOH files are preserved because ownership hashes no longer match', async () => {
  const dir = await makeTmpProject();
  try {
    await quickInstallCodex(dir);
    const file = path.join(dir, CODEX_SKILLS_DIR, 'toh-plan', 'SKILL.md');
    const modified = `${await fs.readFile(file, 'utf8')}\nUser customization.\n`;
    await fs.writeFile(file, modified);

    await quickInstallCodex(dir);
    assert.equal(await fs.readFile(file, 'utf8'), modified, 'reinstall does not overwrite modified skill');

    const result = await uninstallCodex(dir, { backup: false });
    assert.ok(!result.removedSkills.includes('toh-plan'), 'modified skill is not removed');
    assert.equal(await fs.readFile(file, 'utf8'), modified, 'uninstall keeps modified skill');
  } finally {
    await fs.remove(dir);
  }
});

test('AGENTS.md size assertion rejects files above the Codex ceiling', () => {
  assert.throws(
    () => assertAgentsMdSize('x'.repeat(AGENTS_MAX_BYTES + 1)),
    /Codex limit/i
  );
});

test('install fails when the final AGENTS.md exceeds the Codex ceiling', async () => {
  const dir = await makeTmpProject();
  try {
    await fs.writeFile(path.join(dir, 'AGENTS.md'), 'x'.repeat(AGENTS_MAX_BYTES));
    await assert.rejects(
      () => quickInstallCodex(dir),
      /AGENTS\.md is .*Codex limit/i
    );
  } finally {
    await fs.remove(dir);
  }
});

test('uninstall dry-run reports owned files without changing the project', async () => {
  const dir = await makeTmpProject();
  try {
    await quickInstallCodex(dir);
    const before = await snapshotTree(dir);
    const result = await uninstallCodex(dir, { dryRun: true });

    assert.equal(result.dryRun, true);
    assert.equal(result.removedSkills.length, 14);
    assert.equal(result.removedAgents.length, 8);
    assert.equal(result.agentsMd, 'removed');
    assert.equal(result.config, 'removed');
    assert.deepEqual([...before.keys()].sort(), [...(await snapshotTree(dir)).keys()].sort(), 'dry-run keeps file set');
  } finally {
    await fs.remove(dir);
  }
});

test('catalog parsing fails with an actionable error on a broken package', async () => {
  const dir = await makeTmpProject();
  try {
    await assert.rejects(
      () => installCodexSkills(dir, path.join(dir, 'no-such-src')),
      /command source not found/i
    );
  } finally {
    await fs.remove(dir);
  }
});
