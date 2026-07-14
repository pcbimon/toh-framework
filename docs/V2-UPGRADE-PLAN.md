# 🚀 Toh Framework v2.0.0 — Upgrade Plan

> **Status:** 📋 Proposal — รอ พี่โต approve ทีละส่วนก่อนลงมือ
> **Created:** 2026-07-14 · โดยคลอเดียจัง (Engineering Review)
> **Baseline:** v1.8.1 (2026-01-11)
> **ปรัชญานำทาง:** AODD — "Type Once, Have it all!" · ผู้ใช้ต้องรู้สึกว่า "สั่งง่าย เข้าใจ เหมือนมีทีม Engineer ครบทีมที่พูดภาษาคน"

---

## 📊 Executive Summary

| # | หัวข้อ | ปัญหาปัจจุบัน | ทิศทาง v2.0 | Impact | Effort | Phase |
|---|--------|---------------|-------------|--------|--------|-------|
| 1 | Stack Upgrade | Next 14.2 / React 18 / Tailwind 3.4 | Next 16.2 / React 19.2 / Tailwind 4 | 🔴 สูง | M | **2** |
| 2 | Design System | Prescriptive registry → ดู "AI-made" | Principle-based, มาตรฐานสากล | 🔴 สูง | M | **2** |
| 3 | /toh Orchestrator | 733 บรรทัด สคริปต์ตายตัว ไม่ฉลาด | Intent-based router สั้น ฉลาดจริง | 🔴 สูง | L | **1** |
| 4 | /toh-fix | Pattern-match อาการ ไม่หา root cause | Evidence-first debugging | 🔴 สูง | M | **1** |
| 5 | /toh-line | Setup ทั่วไป + snippet แช่แข็ง | Convert คำสั่งเดียว + live docs | 🟡 กลาง | M | **3** |
| 6 | /toh-mobile | Expo = เขียนใหม่ + ภาระผู้ใช้ | PWA → Capacitor (codebase เดียว) | 🟡 กลาง | M | **3** |
| 7 | Agent Team | ซ้ำ 2 ชุด, boilerplate หนัก | Single source + build-time transform | 🟡 กลาง | M | **4** * |
| 8 | Harness & ภาษาคน | ไม่มีกติกาเลือก tool / รายงาน technical | Smart tool selection + non-dev voice | 🟢 เสริม | S | **4** |
| 9 | Memory System | อ่าน 7 ไฟล์ทุกคำสั่ง = token หนัก | Tiered loading (core 3 + on-demand 4) | 🟢 เสริม | S | **4** |

**Effort:** S = <1 session · M = 1-2 sessions · L = 2-3 sessions
**ครอบคลุมครบทั้ง 9 ข้อใน 4 phases:** Phase 1 (ข้อ 3,4) → Phase 2 (ข้อ 1,2) → Phase 3 (ข้อ 5,6) → Phase 4 (ข้อ 7,8,9)
\* ข้อ 7 มีข้อยกเว้น: agent ใหม่ `root-cause-debugger` สร้างตั้งแต่ **Phase 1** (คู่กับ /toh-fix) — ส่วน consolidation รวม 2 ชุดเหลือชุดเดียวทำใน Phase 4

---

## 1️⃣ Stack Upgrade — Latest & Stable

### ปัญหา
`src/templates/nextjs-pro/package.json` และ snippet ใน skills ทั้งหมด lock อยู่ที่ stack กลางปี 2024

### Target Stack (เสถียร ณ ก.ค. 2026)

| Package | เดิม | ใหม่ | หมายเหตุ migration |
|---------|------|------|--------------------|
| next | 14.2.3 | ^16.2.x | Turbopack default, async request APIs (`params`/`searchParams` เป็น Promise), `next lint` ถูกถอด → ใช้ ESLint ตรง |
| react / react-dom | ^18 | ^19.2 | `useEffectEvent`, View Transitions, ref เป็น prop ปกติ (ไม่ต้อง forwardRef) |
| tailwindcss | ^3.4 | ^4.x | **เปลี่ยนใหญ่:** CSS-native config ผ่าน `@theme` ใน globals.css, ไม่ต้องมี tailwind.config.js, import เดียว `@import "tailwindcss"` |
| zustand | ^4.5 | ^5.x | ตัด default export deprecated |
| zod | ^3.23 | ^4.x | ตรวจ breaking ใน error format |
| eslint | ^8 | ^9 (flat config) | ต้องเขียน eslint.config.mjs ใหม่ |
| typescript | ^5 | ^5.latest | ปรับ tsconfig ตาม Next 16 |
| @supabase/supabase-js | ^2.43 | ^2.latest | เช็ค auth helpers → `@supabase/ssr` |

### งานที่ต้องทำ
- [ ] อัพเดท `src/templates/nextjs-pro/` ทั้งโฟลเดอร์ (package.json, app structure, globals.css เป็น Tailwind 4 style, ลบ tailwind.config.js)
- [ ] อัพเดท components ใน `src/templates/components/` — React 19 patterns (ไม่ใช้ forwardRef, ใช้ ref prop)
- [ ] **Grep ทุก snippet ใน `src/skills/*/SKILL.md`** ที่อ้าง Next 14/Tailwind 3 syntax แล้วแก้ให้ตรง
- [ ] เพิ่มกติกาใหม่ใน dev-engineer skill: **"เมื่อสร้างโปรเจคใหม่ ให้เช็ค latest stable ด้วย `npm view [pkg] version` ก่อนเสมอ"** → framework จะไม่ล้าสมัยอีก (จำหลักการ ไม่จำเลขเวอร์ชัน)

### Acceptance
`create-next-app` จาก template แล้ว `npm run build` ผ่าน โดยไม่มี deprecation warning หลัก

---

## 2️⃣ Design System — สวยแบบสากล ไม่ใช่สวยแบบ AI

### ปัญหา
- `design-mastery` (1,560 บรรทัด) hardcode business registry: "ร้านอาหาร = ส้ม, การเงิน = เขียว" → ทุกแอปประเภทเดียวกันหน้าตาโคลนกัน = ลายเซ็น AI ชัดเจน
- ซ้ำซ้อนกับ `design-excellence` (375 บรรทัด) — สอง skill ทำเรื่องเดียวกัน

### หลักการใหม่: จาก "สูตรสี" → "หลักออกแบบสากล"

```
เดิม:  business type → lookup สี → apply     (deterministic = ดูออกว่า AI)
ใหม่:  brand context → design principles → ตัดสินใจเฉพาะงาน (แต่ละแอปมีบุคลิกตัวเอง)
```

**Principle set (แทน registry):**
1. **Typography-first** — hierarchy ชัดด้วย weight/size ไม่ใช่สี, ใช้ font ระดับ product จริง (Inter Variable / Geist / IBM Plex Sans Thai สำหรับงานไทย)
2. **Neutral surface + one accent** — พื้น neutral 90%, accent ใช้เฉพาะ action สำคัญ (มาตรฐาน Linear/Stripe/Vercel)
3. **Restraint = Premium** — ตัด: gradient บนปุ่ม, glassmorphism, emoji ใน UI, shadow หนา, border-radius เกิน 12px, animation เกิน 200ms — ทั้งหมดคือ AI signature
4. **Density ตามงานจริง** — dashboard ต้อง dense อ่านข้อมูลได้จริง ไม่ใช่ card ลอยๆ 3 ใบ + hero text ใหญ่
5. **Real content stance** — ไม่เขียน copy โอเวอร์ ("Supercharge your workflow! 🚀") ใช้ภาษา product จริง
6. **Craft details** — focus states, empty states, loading skeleton, error states ครบ = สิ่งที่แยกงาน pro ออกจากงาน demo

### งานที่ต้องทำ
- [ ] รวม `design-mastery` + `design-excellence` → skill เดียว `design-craft` (~400 บรรทัด, principle-based)
- [ ] เก็บ business context ไว้เป็น "มุมวิเคราะห์" ไม่ใช่ "ตาราง lookup สี"
- [ ] เพิ่ม Anti-AI checklist ให้ design-reviewer agent ใช้ตอน review จริง (scan แล้วต้องชี้ได้ว่าจุดไหนดู AI เพราะอะไร)
- [ ] อัพเดท templates ให้สะท้อนหลักใหม่ (Navbar/Card/Button ปัจจุบันยังโอเค แต่เช็ค radius/shadow)

### Acceptance
สร้างแอป 3 ประเภทต่างกัน → ได้บุคลิกต่างกันจริง และคนดูไม่ทักว่า "AI ทำ"

---

## 3️⃣ /toh — จาก "โรงละคร Orchestration" → Orchestrator ที่ฉลาดจริง

### Root cause ที่ /toh ไม่เก่ง
`toh.md` 733 บรรทัด เขียนสไตล์ prompt ปี 2024: บังคับแสดงตาราง ASCII หลายชุด, กำหนด format ทุก response, สคริปต์ confidence % ปลอมๆ → ผลคือ:
1. โมเดล **ใช้พลังไปกับการ "แสดง" ตาม format** แทนการคิดแก้ปัญหา
2. Context ถูกเผาไปกับ boilerplate ก่อนเริ่มงานจริง
3. กติกาตายตัวขัดกับความฉลาดของโมเดลยุคใหม่ (ยิ่ง prescribe มาก ยิ่งโง่ลง — หลัก "subtract-style" ของ Claude 4.5/5)

### ทิศทางใหม่: `/toh` v5 (~150 บรรทัด)

```
โครงใหม่:
1. Intent  — เข้าใจว่าผู้ใช้ต้องการอะไร (ไม่ต้องประกาศตาราง)
2. Route   — งานเล็กทำเอง / งานใหญ่ delegate ไป native subagents (ขนานเมื่อไม่มี dependency)
3. Verify  — build/test จริงก่อนส่งมอบเสมอ
4. Report  — สรุปสั้น ภาษาคน: ได้อะไร เปิดดูตรงไหน มีอะไรต้องรู้
```

**หลักเขียนใหม่:**
- บอก **เป้าหมาย + หลักการ + ตัวอย่าง 2-3 ชุด** — ไม่บอกทุก step
- แสดงแผนเฉพาะงานที่ >3 tasks (งานเล็กลงมือเลย — นี่แหละ "No Questions Asked")
- ตัด mandatory format/ตาราง Agent Status/Handoff protocol ที่เป็นพิธีกรรม → เหลือ progress สั้นๆ ที่มีความหมายต่อ user
- ให้ orchestrator ตัดสินใจเลือก agent เอง จาก description ของ agent (native mechanism) ไม่ใช่ตาราง mapping ตายตัว

### งานที่ต้องทำ
- [ ] เขียน `toh.md` v5.0 ใหม่ทั้งไฟล์ (~150 บรรทัด)
- [ ] ย้าย logic การเลือก agent ไปอยู่ที่ description ของ agent แต่ละตัว (ให้ Claude Code match เอง)
- [ ] ปรับ `toh-vibe.md` ให้สอดคล้อง (ใช้แกนเดียวกัน ต่างแค่ scope = สร้างโปรเจคใหม่)
- [ ] Sync ไป antigravity-workflows + gemini-commands

### Acceptance
สั่ง `/toh` งานจริง 5 แบบ (เล็ก→ใหญ่) — งานเล็กเริ่มลงมือใน turn แรก, งานใหญ่มีแผนกระชับแล้วทำจนจบโดยไม่ต้องจ้ำจี้

---

## 4️⃣ /toh-fix — Root Cause First, Fix Once

### Root cause ที่ต้องสั่งหลายรอบ
1. ตาราง "Common Fixes" สอน pattern-matching: `undefined → ใส่ ?.` = **กดอาการ ไม่ถามว่าทำไมข้อมูลถึง undefined** → bug กลับมาที่อื่น → ผู้ใช้สั่งซ้ำ
2. ไม่มีขั้น **หา evidence** ก่อนตั้งสมมุติฐาน (ไม่อ่าน log จริง, ไม่ดู `git diff` ว่าอะไรเพิ่งเปลี่ยน, ไม่ instrument)
3. "3-5-Rewrite Rule" ยอมแพ้เร็วเกินไป — ถ้าหา root cause เป็นระบบ ส่วนใหญ่จบใน 1-2 attempt

### Protocol ใหม่: Evidence → Diagnosis → Fix → Prove

```
1. REPRODUCE     ทำให้เกิดซ้ำได้ก่อน (ถ้าทำซ้ำไม่ได้ = ยังแก้ไม่ได้)
2. EVIDENCE      รวบรวมข้อเท็จจริง — ห้ามเดา:
                 · อ่าน error + stack trace เต็มๆ
                 · git log/diff: อะไรเปลี่ยนล่าสุด (bug ใหม่ = โค้ดใหม่ 80%)
                 · ตาม data flow: ค่ามาจากไหน หายที่จุดไหน (console.log/debugger จริง)
3. DIAGNOSE      differential diagnosis: ตั้งสมมุติฐาน 2-3 ข้อ + หลักฐานสนับสนุน/หักล้าง
                 → เลือกข้อที่หลักฐานชี้ ไม่ใช่ข้อที่แก้ง่ายสุด
                 → ถาม "why" ต่อจนถึงต้นตอ (ทำไม undefined? → API ตอบช้า? → ทำไมไม่มี loading state?)
4. FIX           แก้ที่ต้นตอ 1 จุด + แก้จุดที่อาการโผล่เป็น defense เสริมได้
5. PROVE         รัน/ทดสอบซ้ำเส้นทางเดิมที่พัง + เส้นทางข้างเคียง แล้วค่อยรายงาน
```

### งานที่ต้องทำ
- [ ] เขียน `toh-fix.md` ใหม่ตาม protocol ข้างบน
- [ ] แปลง "Common Fixes" → "Common **Root Causes**" (เช่น undefined map → สาเหตุจริงที่พบบ่อย: ไม่มี loading state / API shape เปลี่ยน / race condition — พร้อมวิธีพิสูจน์แต่ละข้อ)
- [ ] ปรับ `debug-protocol` skill ให้สอดคล้อง + เพิ่มเทคนิค instrument (targeted logging, binary search ด้วย git bisect)
- [ ] Rewrite rule ใหม่: เสนอ rewrite เมื่อ "โค้ดส่วนนั้นพิสูจน์แล้วว่า design ผิด" ไม่ใช่นับจำนวนรอบอย่างเดียว

### Acceptance
Bug ทดสอบ 5 เคส — อย่างน้อย 4 เคสระบุ root cause ถูกและจบใน attempt เดียว

---

## 5️⃣ /toh-line — Convert คำสั่งเดียว + Docs จริง

### บริบทใหม่จาก LINE (สำคัญมาก 🇹🇭)
- LINE ประกาศ **รวม LIFF เข้าเป็นแบรนด์เดียว "LINE MINI App"** — แอปใหม่แนะนำให้สร้างเป็น LINE MINI App channel
- **ไทยสร้าง LINE MINI App channel ได้แล้ว (มี.ค. 2026)** — ตลาดหลักของ Toh Framework
- LIFF SDK ยังอัพเดทต่อเนื่อง (v2.27.x) — snippet แช่แข็งใน skill เสี่ยง drift ตลอด

### ทิศทางใหม่: `/toh-line` = "convert to LINE Mini App" เป็น default

```
/toh-line              → convert แอปปัจจุบันเป็น LINE MINI App (default ไม่ต้องพิมพ์อะไรต่อ)
/toh-line + [feature]  → convert + เพิ่ม feature LINE (share, message, rich menu ฯลฯ)
```

**Convert flow (ผู้ใช้ non-dev ทำตามได้):**
1. **Doc check ก่อนเสมอ** — ดึง docs ปัจจุบันจาก developers.line.biz (ผ่าน Context7/web fetch) → ใช้ SDK version + API ล่าสุดจริง ไม่ใช้ snippet ในไฟล์
2. Wrap แอปเดิมด้วย LIFF init + provider (มันเป็น web อยู่แล้ว — งาน convert จริงๆ มีแค่นี้)
3. Adapt UX ตาม LINE guideline (safe area, ปุ่ม action, ไม่ต้องมี login page แยก — ใช้ LINE profile)
4. เดินเรื่อง channel: อธิบายทีละขั้นภาษาคน "เปิดเว็บนี้ → กดตรงนี้ → copy ค่านี้มาวาง" พร้อม checklist สิ่งที่ต้องเตรียม (LINE Developers account, endpoint URL)
5. Verify: เช็คว่า init สำเร็จ + fallback ตอนเปิดนอก LINE ทำงาน

### งานที่ต้องทำ
- [ ] เขียน `toh-line.md` ใหม่ — convert-first, doc-driven
- [ ] ปรับ `platform-specialist` skill: ตัด snippet ยาวๆ → เหลือ checklist + คำสั่ง "ดึง docs จริงก่อนเขียนโค้ด" + จุดพลาดที่พบบ่อย (init ก่อนเรียก API, isInClient check)
- [ ] เพิ่มเนื้อหา LINE MINI App channel (ไม่ใช่แค่ LIFF บน LINE Login channel แบบเดิม)

### Acceptance
แอป Next.js ที่มีอยู่ → สั่ง `/toh-line` ครั้งเดียว → ได้แอปพร้อม deploy + คู่มือตั้งค่า channel ที่ non-dev ทำตามได้จบ

---

## 6️⃣ /toh-mobile — PWA → Capacitor (ตามที่พี่โตเคาะ ✅)

### เหตุผลเชิง UX (สรุปจากที่คุยกัน)
- Expo = คนละ codebase (ต้อง generate React Native ใหม่) ขัด "Type Once" + ผู้ใช้ต้องลง Expo Go/สแกน QR = friction
- **PWA:** ผู้ใช้เห็นแอปบนมือถือตัวเองใน ~1 นาที (Add to Home Screen) — ไม่ลงอะไรเลย = "เฮ้ย ง่าย" ที่พี่โตต้องการ
- **Capacitor:** เมื่อต้องขึ้น App Store/Play Store — wrap Next.js เดิมทั้งก้อน + native APIs (camera, push) — pattern เดียวกับ LINE convert เป๊ะ ผู้ใช้เข้าใจง่าย: "web ของคุณ แปลงร่างได้ทุก platform"

### ทิศทางใหม่

```
/toh-mobile            → convert เป็น PWA (default): manifest, icons, service worker,
                          install prompt, offline พื้นฐาน + สอนวิธี Add to Home Screen
/toh-mobile store      → เพิ่ม Capacitor: iOS/Android project + native plugins
                          + อธิบายเส้นทางขึ้น store ภาษาคน (ต้องมี Apple Developer ฯลฯ)
```

### งานที่ต้องทำ
- [ ] เขียน `toh-mobile.md` ใหม่ (PWA-first + Capacitor track)
- [ ] เพิ่ม PWA section + Capacitor section ใน `platform-specialist` (แทน Expo section — เก็บ Expo ไว้เป็น legacy note สั้นๆ)
- [ ] Next.js 16 PWA setup: manifest.ts, service worker (Serwist หรือ native), icon generation
- [ ] Capacitor: `next build` static export/SSR strategy, `cap sync`, live reload dev flow
- [ ] อธิบาย trade-off ให้ผู้ใช้แบบภาษาคนในตัว command (เมื่อไหร่ PWA พอ / เมื่อไหร่ต้อง store)

### Acceptance
แอปเดิม → `/toh-mobile` → เปิดมือถือ Add to Home Screen ใช้ได้จริงใน session เดียว

---

## 7️⃣ Agent Team — Single Source + มืออาชีพขึ้น

### ข้อเท็จจริงจาก installer (ตรวจแล้ว)
2 ชุดมีไว้เพื่อ multi-IDE จริง: `subagents/` → `.claude/agents/` (Claude Code native) ส่วน `agents/` → `.toh/agents/` (Cursor/Codex/Gemini อ่านเป็น context) **แต่เนื้อหาซ้ำ ~95%** = แก้ 1 เรื่องต้องแก้ 14 ไฟล์

### ทางแก้: Single Source of Truth + Build-time Transform

```
src/agents/*.md          ← ชุดเดียว (Claude Code native format + frontmatter)
        │
   installer แปลงตอน install:
        ├── Claude Code  → copy ตรง (.claude/agents/)
        ├── Cursor       → strip frontmatter → รวมเป็น toh-agents.mdc
        ├── Codex        → strip frontmatter → embed ใน AGENTS.md
        └── Gemini/Antigravity → แปลง format ตามแต่ละ IDE
```

### ยกระดับความเป็นมืออาชีพ
- [ ] **ลบ `src/agents/subagents/`** — เหลือ `src/agents/` ชุดเดียว + เขียน transform ใน ide-handlers
- [ ] **Model tier ต่อ agent:** plan-orchestrator/design-reviewer = ตัวคิดหนัก (opus/inherit), ui/dev/connect = sonnet, test-runner = haiku ได้ (งาน mechanical) → เร็วขึ้น ถูกลง
- [ ] **ตัด Memory Protocol boilerplate** ออกจากทุก agent → ให้ orchestrator ส่ง context ที่จำเป็นให้แทน (agent ไม่ต้องอ่าน 7 ไฟล์เองทุกตัว — ลด token มหาศาล)
- [ ] **เพิ่ม agent ใหม่ 1 ตัว: `root-cause-debugger`** — สาย investigate โดยเฉพาะ (อ่าน log, git diff, instrument) รับงานจาก /toh-fix → อุดช่องโหว่ข้อ 4 เชิงโครงสร้าง
- [ ] เกลา description ทุก agent ให้ Claude Code auto-match แม่น (นี่คือกลไก routing จริงของข้อ 3)
- [ ] กำหนด tools ต่อ agent ให้แคบตามหน้าที่ (test-runner ไม่ต้องมี Write เต็ม ฯลฯ) = ปลอดภัย + โฟกัสขึ้น

### Acceptance
แก้ agent 1 ไฟล์ → ทุก IDE ได้ผลเหมือนกันหลัง install · เรียก agent team ทำงานจริงแล้ว role ไม่เหยียบกัน

---

## 8️⃣ Harness — เลือก Tool ฉลาด + พูดภาษาคน

### สิ่งที่เพิ่มใหม่ (skill: `engineer-harness` — ใช้ร่วมทุก command)

**A. Tool Selection Rules:**
```
· ไม่แน่ใจ API/version → ค้น docs จริง (Context7/web) ก่อนเขียน — ห้ามเขียนจากความจำ
· แก้ bug → รัน/reproduce จริงก่อน ไม่วินิจฉัยจากการอ่านอย่างเดียว
· งานอิสระหลายชิ้น → delegate ขนาน
· ก่อนส่งมอบ → build + เปิดดูผลจริงเสมอ (ไม่ใช่ "น่าจะได้แล้ว")
· เจอของใหม่ (lib ที่ไม่รู้จัก) → อ่าน node_modules types/README จริง
```

**B. Non-dev Communication Mode:**
```
รายงานแบบทีมวิศวกรที่ลูกค้ารัก:
· ผลลัพธ์ก่อน รายละเอียดทีหลัง — "หน้า Dashboard เสร็จแล้ว เปิดดูที่ localhost:3000"
· แปลศัพท์เสมอ — "ต่อฐานข้อมูล (ที่เก็บข้อมูลถาวรของแอป) เรียบร้อย"
· Error = บอกว่ากระทบอะไร + กำลังทำอะไรต่อ ไม่ dump stack trace ใส่ผู้ใช้
· ถามเมื่อจำเป็นจริงเท่านั้น และถามแบบ multiple choice ที่คนธรรมดาตอบได้
```

### งานที่ต้องทำ
- [ ] สร้าง `src/skills/engineer-harness/SKILL.md` (~150 บรรทัด)
- [ ] ผูกเข้า `/toh`, `/toh-fix`, `/toh-vibe` (commands หลัก)
- [ ] รวม `response-format` + `smart-suggestions` skill เดิมเข้ามา (ลดจำนวน skill ซ้ำซ้อน)

---

## 9️⃣ Memory System — เบาลง ฉลาดเท่าเดิม

### ปัญหา
ทุก command + ทุก agent บังคับอ่าน 7 ไฟล์ก่อนเริ่ม = ~3,000 tokens × ทุกครั้ง และ agent แต่ละตัวอ่านซ้ำกันเอง

### ทางแก้: Tiered Loading
```
Tier 1 (อ่านเสมอ):     active.md + summary.md            (~800 tokens)
Tier 2 (อ่านตามงาน):   architecture.md + components.md   (งานสร้าง/แก้โค้ด)
                        changelog.md                       (งาน debug — ดู attempts เดิม)
Tier 3 (อ่านเมื่ออ้าง): decisions.md, agents-log.md
Agent ที่ถูก delegate:  รับ context จาก orchestrator — ไม่อ่านเองซ้ำ
```

- [ ] อัพเดท `memory-system` skill + ทุก command ให้ใช้ tiered loading
- [ ] agents-log.md พิจารณายุบรวมเข้า changelog.md (ลดเหลือ 6 ไฟล์)

---

## 🗓 Release Plan

| Phase | เนื้อหา | Version | หมายเหตุ |
|-------|---------|---------|----------|
| 1 | /toh v5 + /toh-fix ใหม่ + root-cause-debugger agent | 2.0.0-beta.1 | จุดที่ผู้ใช้เจ็บสุด เห็นผลไวสุด |
| 2 | Stack upgrade (Next 16/React 19/TW 4) + design-craft | 2.0.0-beta.2 | template + skills sync กัน |
| 3 | /toh-line convert + /toh-mobile PWA/Capacitor | 2.0.0-beta.3 | platform track |
| 4 | Agent consolidation + harness + memory tiering + docs | **2.0.0** 🚀 | breaking changes รวมจบที่นี่ |

**ทุก Phase:** test ติดตั้งจริงบนโปรเจคใหม่ + อัพเดท CHANGELOG/README (EN+TH) + sync 4 IDE handlers ก่อนปิด

### ความเสี่ยงที่ต้องระวัง
1. **Tailwind 4 migration** กระทบ template + snippet มากที่สุด — ทำใน branch แยก ทดสอบ build ก่อน merge
2. **Agent consolidation** กระทบ installer ทั้ง 4 handlers — ต้อง test install ครบทุก IDE
3. เอกสาร README/help ต้อง sync เลขสถิติ (commands/skills count) — เขียน script เช็คอัตโนมัติได้เลย
4. ผู้ใช้เดิมที่มี `.toh/` version เก่า — installer ควรมี migrate mode

---

*แผนนี้คือ Proposal — พี่โต review แล้วเคาะ Phase ไหนก่อนได้เลยค่ะ แนะนำเริ่ม Phase 1 เพราะแก้จุดที่เจ็บสุดและไม่มี breaking change 💪*
