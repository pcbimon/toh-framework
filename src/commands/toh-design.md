---
command: /toh-design
aliases: ["/toh-ds"]
description: Polish design to look professional, eliminate AI-generated look
trigger: /toh-design or /toh-ds
---

# /toh-design - Polish Design

## Signature Command ✨

```
/toh-design [specific area]
/toh-ds [specific area]
```

## What Happens

```
0. 🚨 READ MEMORY (Tiered Loading — don't blind-read all 7)
   ├── Tier 1 · ALWAYS at start (~800 tokens)
   │   ├── .toh/memory/active.md   (current task)
   │   └── .toh/memory/summary.md  (project overview)
   ├── Tier 2 · read per task type
   │   ├── .toh/memory/architecture.md (structure — build/code work)
   │   ├── .toh/memory/components.md   (existing components — build/code work)
   │   └── .toh/memory/changelog.md    (recent changes — debug work)
   └── Tier 3 · read ONLY when referenced
       ├── .toh/memory/decisions.md    (past decisions)
       └── .toh/memory/agents-log.md   (agent activity)

1. READ Skills
   └── ~/.claude/skills/design-craft/SKILL.md

2. AUDIT Current Design
   ├── Check color usage (one accent only?)
   ├── Check typography (proper hierarchy?)
   ├── Check spacing (consistent?)
   ├── Check animations (subtle?)
   └── Check AI anti-patterns

3. IMPROVE
   ├── Fix color inconsistencies
   ├── Adjust typography scale
   ├── Normalize spacing
   ├── Add subtle animations
   └── Remove "AI-generated" tells

4. REPORT Changes

5. 🚨 SAVE MEMORY
   ├── Update active.md (ALWAYS — current state)
   ├── Update summary.md (if project shape changed)
   ├── Update components.md (if UI changed)
   ├── Update changelog.md (design changes)
   ├── Update decisions.md (design decisions)
   └── Update agents-log.md (if agents delegated)
```

## Example Prompts

```bash
# General polish
/toh-design make it look more professional

# Specific area
/toh-ds improve dashboard cards

# Animation
/toh-design add appropriate animations

# Fix specific issue
/toh-ds accent color doesn't match, please adjust
```

## Output Format

```markdown
## ✅ Design polished successfully!

### What was improved:

**🎨 Colors**
- Changed accent from violet to blue (professional)
- Adjusted text from black to slate-900 (softer)

**📝 Typography**
- Reduced excessive font-bold usage
- Increased line-height for better readability

**📐 Spacing**
- Made padding consistent (p-4 throughout)
- Added gap between sections

**🎬 Animation**
- Added hover:shadow-md on cards
- Added transition-colors on buttons

### Before/After:
Check the diff in git or refresh the page
```

## Anti-Patterns Checklist

Will check and fix these issues:

- [ ] Purple/violet gradients → Solid blue
- [ ] Pure black text → Slate-900
- [ ] Inconsistent padding → Unified scale
- [ ] Too many font weights → Max 2-3
- [ ] Bounce animations → Subtle ease
- [ ] Generic placeholder → Realistic content
- [ ] Round-3xl everything → Contextual radius

## Rules

1. **ALWAYS** maintain functionality while improving looks
2. **ALWAYS** keep changes subtle, not dramatic
3. **NEVER** change color scheme without reason
4. **NEVER** add decorative elements that don't serve purpose
