<p align="center">
  <img src="https://raw.githubusercontent.com/wasintoh/toh-framework/main/docs/assets/toh-framework-banner.png" alt="Toh Framework" width="760" />
</p>

<h3 align="center">"พิมพ์ครั้งเดียว ได้ครบ!" — AI-Orchestration Driven Development</h3>

<p align="center">อนุมัติครั้งเดียว เดินไปกินกาแฟ กลับมาเจอแอปเสร็จพร้อมตรวจแล้ว</p>

[![npm version](https://img.shields.io/npm/v/toh-framework.svg?style=flat-square)](https://www.npmjs.com/package/toh-framework)
[![npm downloads](https://img.shields.io/npm/dt/toh-framework.svg?style=flat-square)](https://www.npmjs.com/package/toh-framework)
[![License](https://img.shields.io/npm/l/toh-framework.svg?style=flat-square)](https://github.com/wasintoh/toh-framework/blob/main/LICENSE)

**Toh Framework** คือ "แผนกสร้างแอป AI" ที่ติดตั้งเข้าโปรเจคของคุณ: **14 คำสั่ง, 8 agents ผู้เชี่ยวชาญ, 23 skills** — ตั้งค่าให้ Claude Code, Cursor, Antigravity และ Codex ในการติดตั้งครั้งเดียว พิมพ์ประโยคเดียว (เช่น `/toh-vibe ระบบจัดการร้านกาแฟ`) อนุมัติครั้งเดียว แล้วระบบจะวางแผน สร้าง ทดสอบ และแก้เองจนแอปเสร็จแบบพิสูจน์ได้

```bash
npx toh-framework install
```

🌐 **เว็บไซต์:** [tohframework.dev](https://tohframework.dev)

> 📖 **[🇬🇧 English Documentation](../README.md)**

## 🆕 มีอะไรใหม่ใน v2.1.0

> **รุ่น Compatibility — ตรวจจริง ซ่อมจริง ทุก IDE ที่ยังมีชีวิต** เราเอาทุก IDE ที่รองรับมาทดสอบกับเวอร์ชันปัจจุบันของมันจริงๆ แล้วซ่อมทุกจุดที่พังไปเงียบๆ — framework เดิม แต่คราวนี้ถูกโหลดครบทุกที่จริงๆ

| ฟีเจอร์ | คุณได้อะไร |
|---------|-----------|
| 🛰️ **Antigravity CLI (agy) — เกิดใหม่** | Google ปิด Gemini CLI สำหรับผู้ใช้ทั่วไปไปแล้ว (18 มิ.ย. 2026) — ไฟล์ที่เคยติดตั้งเป็นค่าเริ่มต้นจึงไม่มีโปรแกรมไหนอ่านเลย v2.1 รองรับ Antigravity (agy CLI + IDE) โดยตรง: surface ใหม่ใน `.agents/` มีทั้ง rule แบบ Always-On, 14 workflows, 8 subagents แบบไฟล์, Stop hook แบบ deterministic (`.agents/hooks.json`) และ skills ครบชุด — พร้อม mirror `.agent/workflows/` สำหรับรุ่นเก่า |
| 📦 **Codex — ไม่โดนตัดท้ายอีกต่อไป** | Codex ตัดไฟล์คู่มือโปรเจคที่เกิน 32 KB ทิ้งเงียบๆ — AGENTS.md เดิมของเราใหญ่เกิน 3.6 เท่า ทำให้ agents 6 จาก 8 ตัวไม่เคยถูกโหลดเลย AGENTS.md ใหม่เป็นตารางสรุปกะทัดรัด ~12.7 KB — ทุกส่วนอยู่ครบ ตัว agents และคำสั่งอ่านจาก `.toh/` ตอนใช้งานจริง และตัวติดตั้งจะ fail ทันทีถ้าไฟล์โตเกินงบ พร้อมเขียน `.codex/config.toml` เพิ่มโควต้าให้ (ไม่ทับไฟล์ของคุณเด็ดขาด) |
| 🤝 **มาตรฐาน skills เดียว ใช้ได้ 3 IDE** | Skills ทั้ง 37 ตัว (23 framework skills + 14 command skills `/toh-*`) ถูกเขียนครั้งเดียวลง `.agents/skills/` — มาตรฐานเปิดที่ Codex, Cursor 2.4+ และ Antigravity ค้นเจอเองโดยธรรมชาติ เขียนครั้งเดียว ใช้สามที่ ไม่มีเพี้ยน |
| 🧩 **Cursor 2.4 native subagents** | Cursor ได้ทีมงานจริงแล้ว: ผู้เชี่ยวชาญ Toh ทั้ง 8 ตัวติดตั้งเป็น native subagents ใน `.cursor/agents/` ให้ Cursor มอบหมายงานได้เลย (ก่อนหน้านี้ rule ของเราไปบอก Cursor ว่า "ที่นี่ไม่มีทีม" — เท่ากับทิ้งของฟรี) |
| ⚡ **Claude Code skills preload** | Subagents เริ่มงานพร้อม skills โหลดเต็มในตัวผ่าน frontmatter key `skills` แบบ native — ไม่ต้องลุ้นว่าโมเดลจะเปิดไฟล์อ่านเองหรือเปล่าอีกแล้ว |

### และใน 2.1.0 ยังมี

- ⌨️ **ทางลัดเป็นคำสั่งจริงบน Claude Code** — `/toh-v`, `/toh-p`, `/toh-pt` และเพื่อนๆ ถูกลงทะเบียนเป็นไฟล์คำสั่งจริง ไม่ใช่แค่ pattern ในเอกสาร และแก้ปัญหา `/toh-p` ชนกันแล้ว: `/toh-p` = `/toh-plan`, `/toh-pt` = `/toh-protect` (มี `/toh-security`, `/toh-audit` ด้วย)
- 📇 **Catalog สดจากต้นทาง** — `npx toh-framework list` อ่านคำสั่ง agents และ skills ตรงจาก source ตัวเลขจึงไม่มีวันตกรุ่นอีก
- 🧾 **คำอธิบาย skill ครบทุกตัว** — ทั้ง 23 skills มี frontmatter description จริงแล้ว ทุก IDE จึงรู้ว่าแต่ละ skill มีไว้ทำอะไรและเรียกใช้เองได้ถูกจังหวะ
- 🏳️ **ทางหนีสำหรับของเก่า (ปิดเป็นค่าเริ่มต้น)** — `--legacy-gemini` ยังเขียน `.gemini/` ให้ผู้ใช้ Gemini CLI ฝั่ง Enterprise/GCP; `--legacy-cursorrules` เขียน `.cursorrules` ที่ root ให้ Cursor รุ่นเก่ามาก

## 🤖 IDE ที่รองรับ

| IDE | สถานะ | หมายเหตุ |
|-----|--------|----------|
| 🧠 **Claude Code** | ✅ รองรับเต็ม | Native subagents + skills preload, Stop hook, slash commands & ทางลัด |
| 📝 **Cursor (2.4+)** | ✅ รองรับเต็ม | Native subagents (`.cursor/agents/`), skills ผ่าน `.agents/skills/`, rule แบบ always-on |
| 🛰️ **Antigravity CLI (agy) + IDE** | ✅ รองรับเต็ม | `.agents/` rules + skills + workflows + subagents + Stop hook |
| 🤖 **Codex CLI + ChatGPT Desktop** | ✅ รองรับ | AGENTS.md แบบกะทัดรัด + repo-level skills |
| 💎 **Gemini CLI** | 🏢 Legacy | เฉพาะ Enterprise/GCP — ใช้ `--legacy-gemini` (ฝั่งผู้ใช้ทั่วไปปิดบริการ 18 มิ.ย. 2026) |

## 💡 ทำไมต้อง Toh?

**Toh** = **T**ype **O**nce, **H**ave it all!

เราเชื่อว่า **Solo Developers** และ **Solopreneurs** ควรสามารถสร้างระบบ SaaS ได้ด้วยตัวเอง โดยไม่ต้องเป็น expert ทุกด้าน

Toh Framework ช่วยให้คุณ:
- 💬 **สั่งด้วยภาษาธรรมชาติ** - ไม่ต้องเขียน prompt ซับซ้อน
- 🤖 **AI ทำให้ทุกอย่าง** - แบ่งงาน เรียก agent ทำจนเสร็จ
- 👀 **เห็นผลทันที** - ไม่ต้องรอ ไม่ต้องตอบคำถาม
- 🚀 **พร้อมใช้งานจริง** - ไม่ใช่แค่ prototype

### 📜 เวอร์ชันก่อนหน้า

ดูประวัติทั้งหมดใน [CHANGELOG.md](../CHANGELOG.md)

**ไฮไลท์ล่าสุด:**

| เวอร์ชัน | วันที่ | ฟีเจอร์เด่น |
|---------|--------|------------|
| v2.1.0 | 2026-08-16 | รุ่น Compatibility: รองรับ agy, Codex ไม่โดนตัด, Cursor native subagents, `.agents/skills` มาตรฐานร่วม |
| v2.0.0 | 2026-07-16 | One-Go Build, TOH LOOP, Design Identity, Auto-Resume |
| v1.8.0 | 2026-01-11 | 7-File Memory System, Agent Announcements |
| v1.7.0 | 2025-12-26 | Security Engineer, คำสั่ง `/toh-protect` |
| v1.6.0 | 2025-12-18 | Claude Code Sub-Agents, Multi-Agent Orchestration |
| v1.5.0 | 2025-12-05 | รองรับ Google Antigravity/Gemini |

---

## ✨ Features

| Feature | รายละเอียด |
|---------|------------|
| **One-Go Build** | `/toh-plan` → อนุมัติครั้งเดียว → ได้ทั้งแอปแบบอัตโนมัติ |
| **TOH LOOP** | สร้าง ตรวจ แก้เองจนทุกงานเสร็จจริงแบบพิสูจน์ได้ |
| **`/toh` Smart Command** | พิมพ์อะไรก็ได้ AI เลือก agents และโมเดลให้ |
| **Design Identity** | `DESIGN.md` ประจำโปรเจค + AVOID-LIST — ไม่มีลุค AI |
| **Auto-Resume** | `.toh/plan.md` รอด `/clear` ปิดเครื่อง และย้าย IDE |
| **Sub-Agents** | 8 agents เชี่ยวชาญเฉพาะทาง พร้อม model tiers |
| **Auto Memory** | Context คงอยู่ข้าม sessions และ IDEs |

---

## 📦 การติดตั้ง

```bash
# ติดตั้งแบบ interactive (เลือก IDE และภาษา)
npx toh-framework install

# ติดตั้งแบบรวดเร็ว (Claude Code + Cursor + Antigravity, English)
npx toh-framework install --quick

# ติดตั้งเฉพาะ IDE
npx toh-framework install --ide claude
npx toh-framework install --ide cursor
npx toh-framework install --ide antigravity
npx toh-framework install --ide codex

# หลาย IDEs
npx toh-framework install --ide "claude,cursor,antigravity,codex"

# เป้าหมาย legacy (ปิดเป็นค่าเริ่มต้น)
npx toh-framework install --legacy-gemini       # .gemini/ สำหรับ Gemini CLI ฝั่ง Enterprise/GCP
npx toh-framework install --legacy-cursorrules  # .cursorrules ที่ root สำหรับ Cursor รุ่นเก่ามาก
```

## 🔄 อัพเดทเป็นเวอร์ชันล่าสุด

```bash
# วิธีที่ 1: ใช้ npx (แนะนำ - ได้เวอร์ชันล่าสุดเสมอ)
npx toh-framework@latest install

# วิธีที่ 2: ถ้าติดตั้ง globally
npm update -g toh-framework
toh install
```

> 💡 **Tip:** การติดตั้งใหม่จะอัพเดท skills, agents, และ commands โดยไม่ลบ memory ที่มีอยู่!

## 🧹 ถอนการติดตั้ง

เปลี่ยนใจได้ตลอด — คำสั่งเดียวเอา Toh Framework ออกจากโปรเจค โดยจะแสดงให้ดูก่อนเป็นภาษาคนธรรมดา
ว่าจะเกิดอะไรขึ้นบ้าง แล้วถามยืนยันก่อนลบเสมอ

```bash
# ดูก่อนว่าจะเกิดอะไรขึ้น — ไม่แตะไฟล์ใดเลย
npx toh-framework uninstall --dry-run

# ถอนการติดตั้ง (ถามยืนยันก่อน)
npx toh-framework uninstall

# ถ้าโปรเจคอยู่ที่อื่น ระบุโฟลเดอร์ได้
npx toh-framework uninstall -t /path/to/your/project

# ลบแผนงาน บันทึกงาน และโน้ตของโปรเจคด้วย (สำรองไฟล์ให้ก่อน)
npx toh-framework uninstall --all
```

**สิ่งที่จะไม่เกิดขึ้นเด็ดขาด:**

- **ไฟล์ของคุณจะไม่ถูกลบ** — ไฟล์ไหนที่พิสูจน์ไม่ได้ว่าเป็นของ Toh Framework จะถูกทิ้งไว้เหมือนเดิม
  พร้อมบอกบนหน้าจอว่าเหลืออะไร อยู่ตรงไหน
- **ไฟล์ที่ใช้ร่วมกันจะถูก "แก้เฉพาะส่วนของเรา" ไม่ใช่เขียนทับ** — `CLAUDE.md`, `AGENTS.md`,
  `.claude/settings.json`, `.agents/hooks.json` ทุกบรรทัดที่คุณเขียนเองยังอยู่ครบ เอาออกเฉพาะส่วนของ
  Toh Framework เท่านั้น ถ้าแยกไม่ออกว่าส่วนไหนเป็นของเรา จะไม่แตะไฟล์นั้นเลยและบอกให้ทราบ
- **แผนงานและโน้ตของคุณถูกเก็บไว้เป็นค่าเริ่มต้น** — `.toh/plan.md`, `.toh/progress.md` และโฟลเดอร์
  memory คืองานจริงของโปรเจค จะลบก็ต่อเมื่อคุณตอบ "ใช่" ในคำถามเพิ่มเติม (หรือใส่ `--all`) และไม่ว่า
  ทางไหนก็สำรองไว้ที่ `.toh-uninstall-backup/` ก่อนเสมอ
- **โฟลเดอร์จะถูกลบก็ต่อเมื่อว่างเปล่าแล้วเท่านั้น** ไฟล์ของคุณที่อยู่ข้างในจึงปลอดภัย

แฟล็กอื่น: `-y, --yes` (ข้ามคำถาม สำหรับสคริปต์) และ `--verbose` (แสดงรายชื่อไฟล์ทุกไฟล์แทนสรุปรายเครื่องมือ)

---

## 🚀 เริ่มต้นใช้งาน

### Claude Code

```bash
# เปิด project ด้วย Claude Code
claude .

# แสดงคำสั่งทั้งหมด
/toh-help

# Smart command - AI เลือก agent ให้
/toh สร้าง landing page พร้อมส่วน pricing

# สร้าง project ครบ
/toh-vibe ระบบจัดการร้านกาแฟ

# เพิ่ม UI
/toh-ui เพิ่ม dashboard แสดงยอดขาย

# เพิ่ม Logic
/toh-dev เพิ่ม form validation และ API calls

# ปรับ Design
/toh-design ทำให้ดูเป็น professional

# Test ระบบ
/toh-test

# ตรวจสอบความปลอดภัย
/toh-protect

# Deploy
/toh-ship
```

### Cursor

```bash
# ใช้คำสั่งเดียวกันในแชทได้เลย — rule แบบ always-on สอนให้ Cursor รู้จักคำสั่งเหล่านี้
/toh-vibe สร้างระบบจองห้องประชุม

# หรือใช้คำสั่งเฉพาะ
/toh-ui สร้างหน้า calendar สำหรับจองห้อง
```

### Antigravity (agy CLI หรือ Antigravity IDE)

```bash
# เริ่ม Antigravity CLI
agy

# ใช้คำสั่งเดียวกัน
/toh-vibe ระบบจัดการ inventory
```

### Codex CLI / ChatGPT Desktop

```bash
codex

# ใช้คำสั่งเดียวกัน — AGENTS.md สอนชุดคำสั่งครบให้ Codex
/toh-vibe ระบบจัดการ inventory
```

---

## 📋 คำสั่งทั้งหมด

| คำสั่ง | ทางลัด | รายละเอียด |
|--------|--------|------------|
| `/toh` | - | 🧠 **Smart Command** - พิมพ์อะไรก็ได้ AI เลือก agent |
| `/toh-plan` | `/toh-p` | 📋 **วางแผน** - เขียน `.toh/plan.md` อนุมัติครั้งเดียว สร้างจนจบเอง |
| `/toh-vibe` | `/toh-v` | 🎨 **สร้าง Project** - แอปครบในคำสั่งเดียว |
| `/toh-ui` | `/toh-u` | 🖼️ **สร้าง UI** - Pages, Components, Layouts |
| `/toh-dev` | `/toh-d` | ⚙️ **เพิ่ม Logic** - TypeScript, Zustand, Forms |
| `/toh-design` | `/toh-ds` | ✨ **ขัดเกลา Design** - Professional ไม่ดู AI |
| `/toh-test` | `/toh-t` | 🧪 **Test** - Auto test & fix จนผ่าน |
| `/toh-protect` | `/toh-pt` | 🔐 **Security Audit** - ตรวจสอบความปลอดภัย |
| `/toh-connect` | `/toh-c` | 🔌 **เชื่อม Backend** - Supabase, Auth, RLS |
| `/toh-line` | `/toh-l` | 💚 **LINE MINI App** (convert) |
| `/toh-mobile` | `/toh-m` | 📱 **Mobile App** - PWA / Capacitor |
| `/toh-fix` | `/toh-f` | 🔧 **แก้ Bug** - Debug อย่างเป็นระบบ |
| `/toh-ship` | `/toh-s` | 🚀 **Deploy** - Vercel, พร้อม Production |
| `/toh-help` | `/toh-h` | ❓ **Help** - แสดงคำสั่งทั้งหมด |

> บน Claude Code ทางลัดเป็นคำสั่งจริงที่ลงทะเบียนแล้ว (v2.1) ส่วน IDE อื่นใช้เป็น pattern ในแชทที่ rule file สอนให้โมเดลรู้จัก

---

## 🏗️ Tech Stack (Fixed)

ไม่ต้องเลือก - stack ที่ optimize แล้วพร้อมใช้:

| หมวด | เทคโนโลยี |
|------|-----------|
| Framework | Next.js 16 (App Router) + React 19 |
| Styling | Tailwind CSS 4 + shadcn/ui |
| State | Zustand |
| Forms | React Hook Form + Zod |
| Backend | Supabase |
| Testing | Playwright |
| Language | TypeScript (strict) |

---

## 🧠 ปรัชญา (AODD)

**AI-Orchestration Driven Development:**

1. **ภาษาธรรมชาติ → Tasks** - แค่บอกว่าอยากได้อะไร
2. **Orchestrator → Agents** - ระบบเรียก specialist ที่เหมาะสม
3. **ไม่ต้องจัดการ Process** - คุณแค่รับผลลัพธ์
4. **Test → Fix → Loop** - Auto-fix จนทุกอย่างผ่าน

```
User: "สร้างระบบจัดการร้านกาแฟ"

Orchestrator:
├── 📐 plan-orchestrator → วิเคราะห์ & วางแผน
├── 🎨 ui-builder → สร้าง UI ทั้งหมด
├── ⚙️ dev-builder → เพิ่ม logic
├── ✨ design-reviewer → ขัดเกลา design
├── 🧪 test-runner → Test & fix
├── 🔐 security-check → ตรวจสอบความปลอดภัย
└── ✅ ส่งมอบระบบพร้อมใช้!
```

### 🔁 Plan → Vibe Workflow

แผนคือ **ไฟล์** ไม่ใช่ข้อความแชท:

- `/toh-plan` เขียนแผนลง `.toh/plan.md` → อนุมัติ**ครั้งเดียว** ("Go") → AI สร้างทั้งแผนอัตโนมัติ ตรวจสอบทุก checkpoint เอง
- `/toh-vibe` ทำแผนค้างต่อได้เสมอ: อ่าน `.toh/plan.md` ก่อน แล้วทำต่อจาก task แรกที่ยังไม่ติ๊ก — ข้าม session ข้าม IDE ได้

หมายเหตุ: กลไก*บังคับ* loop อัตโนมัติแข็งแรงที่สุดบน Claude Code (Stop hook, `/goal`, `/loop`) และ Antigravity (Stop hook แบบ deterministic ใน `.agents/hooks.json`) — IDE อื่นรัน loop เดียวกันในรูปแบบคำสั่งในเอกสาร (instructions) โดยมี checkbox-resume ใน `.toh/plan.md` เป็นกลไกกู้คืน

**สั่ง build แบบไม่ต้องเฝ้า** — รันแบบ headless (Claude Code):

```bash
claude -p "/toh-vibe ระบบจัดการร้านกาแฟ" --permission-mode acceptEdits
```

---

## 📖 ตัวอย่าง

### สร้าง E-commerce
```
/toh-vibe ร้านค้าออนไลน์ มีสินค้า ตะกร้า และ checkout
```

### สร้าง Dashboard
```
/toh-vibe Dashboard แสดงยอดขาย มี charts และ date filters
```

### สร้าง SaaS
```
/toh-vibe ระบบจัดการ project มี teams และ tasks
```

---

## 🎯 กลุ่มเป้าหมาย

- **Solo Developers** - สร้าง SaaS ด้วยตัวเอง
- **Solopreneurs** - สร้าง MVP ทดสอบตลาด
- **Startup Founders** - Prototype สำหรับ investors
- **Freelancers** - ส่งงานลูกค้าเร็วขึ้น
- **นักศึกษา** - เรียนรู้ modern web development

---

## 📊 สถิติ Framework

- 🤖 **8 Sub-Agents** - เชี่ยวชาญเฉพาะทาง ติดตั้งแบบ native บน Claude Code, Cursor 2.4+ และ Antigravity
- 🎯 **14 Commands** - ตั้งแต่วางแผนถึง deployment
- 📚 **23 Skills** - ความสามารถ AI ครบครัน ส่งครั้งเดียวลง `.agents/skills/` ให้ทุก IDE ที่อ่านมาตรฐานเปิดนี้ `[NEW ใน 2.1]`
- 🎨 **Design Identity** - DESIGN.md ประจำโปรเจค + AVOID-LIST แบบมีเวอร์ชัน
- 📦 **15 Component Templates** - Premium components พร้อมใช้
- 🌐 **5 IDEs** - Claude Code, Cursor, Antigravity (agy CLI + IDE), Codex, Gemini CLI (legacy)

---

## 📚 เอกสารและคู่มือ

| คู่มือ | อยู่ที่ไหน |
|-------|-----------|
| 🇬🇧 เอกสารภาษาอังกฤษ | [README.md](../README.md) |
| ประวัติเวอร์ชันทั้งหมด | [CHANGELOG.md](../CHANGELOG.md) |
| คำสั่งทั้งหมด + cheatsheet | รัน `/toh-help` ใน IDE ของคุณ |
| คู่มือประจำโปรเจค (สร้างอัตโนมัติ) | `CLAUDE.md` / `AGENTS.md` / `.cursor/rules/` / `.agents/rules/` ในโปรเจคหลังติดตั้ง |
| ไฟล์แผนงาน | `.toh/plan.md` — checklist สดของแอปคุณ (เปิดดูความคืบหน้าได้ตลอด) |
| สัญญา design | `DESIGN.md` ที่ root โปรเจค — สร้างต่อโปรเจค แก้ไขเพื่อกำหนดลุคได้ |

---

## 🤝 ร่วมพัฒนา

ยินดีรับ Pull Request!

## 📝 License

MIT License - ดู [LICENSE](../LICENSE)

## 👨‍💻 ผู้พัฒนา

**วศิน ตรีสินธุรส** (Innovation Vantage)

- 🌐 เว็บไซต์: [tohframework.dev](https://tohframework.dev)
- GitHub: [@wasintoh](https://github.com/wasintoh)
- Email: dr.wasin@gmail.com

---

<p align="center">
  สร้างด้วย ❤️ เพื่อ Solo Developers ทุกคน
</p>

<p align="center">
  <strong>"พิมพ์ครั้งเดียว ได้ครบ!"</strong>
</p>
