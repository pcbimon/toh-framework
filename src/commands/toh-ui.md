---
command: /toh-ui
aliases: ["/toh-u"]
description: Create or edit UI components, pages, or layouts
trigger: /toh-ui or /toh-u followed by description
---

# /toh-ui - Create/Edit UI

## Signature Command 🎨

```
/toh-ui [description]
/toh-u [description]
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
   ├── ~/.claude/skills/ui-first-builder/SKILL.md
   └── ~/.claude/skills/design-craft/SKILL.md

2. ANALYZE Request
   ├── New page? → Create in app/[name]/page.tsx
   ├── New component? → Create in components/features/
   ├── Edit existing? → Modify in place
   └── Layout change? → Update layout.tsx

3. GENERATE UI
   ├── Use shadcn/ui components
   ├── Add realistic mock data
   ├── Include hover/loading states
   └── Make it responsive

4. VERIFY
   └── Dev server shows changes (HMR)

5. 🚨 SAVE MEMORY
   ├── Update active.md (ALWAYS — current state)
   ├── Update summary.md (if project shape changed — new pages)
   ├── Update components.md (new components)
   ├── Update architecture.md (if new pages)
   ├── Update changelog.md (UI changes)
   └── Update agents-log.md (if agents delegated)
```

## Example Prompts

```bash
# New page
/toh-ui settings page with profile edit form

# New component
/toh-u product card component showing image, name, price, add to cart button

# Edit existing
/toh-ui add sidebar to dashboard page

# Layout change
/toh-u change layout to 2 columns on desktop

# Complex UI
/toh-ui modal for edit product with image upload
```

## Output Format

```markdown
## ✅ UI ready!

### Created/Modified:
- `app/settings/page.tsx` - Settings page
- `components/features/profile-form.tsx` - Form component

### Preview:
View at http://localhost:3000/settings

### Memory:
✅ Memory saved

### Next:
- `/toh-dev` add logic to make form functional
```

## Rules

1. **ALWAYS** use shadcn/ui components
2. **ALWAYS** add realistic mock data
3. **ALWAYS** make responsive (mobile-first)
4. **NEVER** ask "what style do you want?"
5. **NEVER** create empty placeholder UI
