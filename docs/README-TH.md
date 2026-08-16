<p align="center">
  <img src="https://raw.githubusercontent.com/wasintoh/toh-framework/main/docs/assets/toh-framework-banner.png" alt="Toh Framework 2.0" width="760" />
</p>

<h3 align="center">"พิมพ์ครั้งเดียว ได้ครบ!" — AI-Orchestration Driven Development</h3>

<p align="center">อนุมัติครั้งเดียว เดินไปกินกาแฟ กลับมาเจอแอปเสร็จพร้อมตรวจแล้ว</p>

[![npm version](https://img.shields.io/npm/v/toh-framework.svg?style=flat-square)](https://www.npmjs.com/package/toh-framework)
[![npm downloads](https://img.shields.io/npm/dt/toh-framework.svg?style=flat-square)](https://www.npmjs.com/package/toh-framework)
[![License](https://img.shields.io/npm/l/toh-framework.svg?style=flat-square)](https://github.com/wasintoh/toh-framework/blob/main/LICENSE)

🌐 **เว็บไซต์:** [tohframework.dev](https://tohframework.dev)

> 📖 **[🇬🇧 English Documentation](../README.md)**

## 🤖 IDE ที่รองรับ

| IDE | สถานะ | หมายเหตุ |
|-----|--------|----------|
| 🧠 **Claude Code** | ✅ รองรับเต็ม | Native Sub-Agents, Slash commands |
| 📝 **Cursor** | ✅ รองรับเต็ม | @ file references |
| 🌌 **Google Antigravity** | ✅ รองรับเต็ม | Gemini integration |
| 💎 **Gemini CLI** | ✅ รองรับเต็ม | Context files auto-loaded |
| 🤖 **Codex CLI** | ✅ รองรับ | OpenAI agents |

## 💡 ทำไมต้อง Toh?

**Toh** = **T**ype **O**nce, **H**ave it all!

เราเชื่อว่า **Solo Developers** และ **Solopreneurs** ควรสามารถสร้างระบบ SaaS ได้ด้วยตัวเอง โดยไม่ต้องเป็น expert ทุกด้าน

Toh Framework ช่วยให้คุณ:
- 💬 **สั่งด้วยภาษาธรรมชาติ** - ไม่ต้องเขียน prompt ซับซ้อน
- 🤖 **AI ทำให้ทุกอย่าง** - แบ่งงาน เรียก agent ทำจนเสร็จ
- 👀 **เห็นผลทันที** - ไม่ต้องรอ ไม่ต้องตอบคำถาม
- 🚀 **พร้อมใช้งานจริง** - ไม่ใช่แค่ prototype

## 🆕 มีอะไรใหม่ใน v2.0.0

> **รุ่น "เลิกเฝ้า AI ได้เลย"** — อนุมัติครั้งเดียว ได้แอปเสร็จทั้งระบบ

| ฟีเจอร์ | คุณได้อะไร |
|---------|-----------|
| 🚀 **One-Go Build** | อนุมัติครั้งเดียว ได้แอปเสร็จทั้งระบบ — `/toh-plan` เขียนแผนลงไฟล์ พิมพ์ **"Go"** แล้วสร้างรวดจนจบ ไม่ต้องนั่งกดต่อทีละขั้น |
| 🔁 **TOH LOOP** | พิมพ์แล้วลืมได้เลย — สร้าง ตรวจ แก้เองจนผ่านทีละงาน **ไม่ถาม "ทำต่อไหม?"** คั่นกลางอีกแล้ว |
| 🛡️ **Stop Hook** | ไม่ยอมเลิกงานจนกว่าทุกข้อจะ**เสร็จจริงแบบพิสูจน์ได้** — ยึดผลรันจริงเป็นหลักฐานเท่านั้น (Claude Code) |
| 🎨 **Design Identity** | ดูไม่ออกว่า AI ทำ — ทุกโปรเจคได้ `DESIGN.md` บุคลิกของตัวเอง (สี ฟอนต์ เมนู จุดเด่นเฉพาะตัว) + **AVOID-LIST** ฆ่าลุค AI ทุกรูปแบบ |
| ⏯️ **Auto-Resume** | หยุดเมื่อไหร่ก็ได้ — `/clear` ปิดเครื่อง หรือย้าย IDE กลับมา**ทำต่อจากจุดเดิมเป๊ะ** จาก `.toh/plan.md` |

### และใน 2.0.0 ยังมี

- 🧠 **`/toh` v5** — เข้าใจเจตนา สำรวจเครื่องมือที่มี จัดทีม+เลือกโมเดลเอง ตรวจก่อนรายงาน
- 🔬 **`/toh-fix`** — พิสูจน์ต้นตอด้วยหลักฐานจริงก่อนแก้เสมอ (ห้ามแก้มั่ว)
- ⚡ **Stack ใหม่** — Next.js 16 / React 19 / Tailwind CSS 4 (build ผ่านจริง)
- 💚 **`/toh-line` + `/toh-mobile`** — แปลงเป็น LINE MINI App หรือทำ PWA/Capacitor ในคำสั่งเดียว
- 🤖 **Agents ชุดเดียว** — แปลงให้เหมาะกับแต่ละ IDE ตอนติดตั้ง + เลือกโมเดลตามหน้าที่ (opus/sonnet/haiku)

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

# ติดตั้งแบบรวดเร็ว (Claude Code + Cursor, English)
npx toh-framework install --quick

# ติดตั้งเฉพาะ IDE
npx toh-framework install --ide claude
npx toh-framework install --ide cursor
npx toh-framework install --ide gemini
npx toh-framework install --ide codex

# หลาย IDEs
npx toh-framework install --ide "claude,cursor,gemini,codex"
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
# เรียก Toh agent
@toh สร้างระบบจองห้องประชุม

# หรือใช้คำสั่งเฉพาะ
@toh:ui สร้างหน้า calendar สำหรับจองห้อง
```

### Gemini CLI / Antigravity

```bash
# เริ่ม Gemini CLI
gemini

# ใช้คำสั่ง
/toh-vibe ระบบจัดการ inventory
```

### Codex CLI

Codex ไม่มี slash command แบบกำหนดเอง ดังนั้น TOH จะติดตั้ง **native Codex
skills** ไว้ที่ `.codex/skills/` — หนึ่ง skill ต่อหนึ่งเวิร์กโฟลว์
(`toh-vibe`, `toh-plan`, `toh-ui`, `toh-dev`, `toh-design`, `toh-test`,
`toh-connect`, `toh-line`, `toh-mobile`, `toh-fix`, `toh-ship`,
`toh-protect`, `toh-help`, `toh`)

```bash
# เปิดโฟลเดอร์โปรเจคใน Codex
codex

# เรียก skill ตรงๆ ด้วย $ + ชื่อ skill (หรือพิมพ์ /skills เพื่อดูทั้งหมด)
$toh-vibe ระบบจัดการร้านกาแฟ
$toh-plan สร้างแอปจองห้องพร้อมชำระเงิน

# หรือแค่บรรยายงาน — Codex จะเลือก skill จาก description ให้เอง
"สร้างระบบจัดการ inventory"
```

TOH เก็บ state ของ framework ไว้ที่ `.toh/` (`plan.md`, `progress.md`,
`memory/`) และกฎระดับโปรเจคไว้ใน block ที่ TOH จัดการของ `AGENTS.md`
เพื่อความเข้ากันได้แบบเดิม ถ้าพิมพ์ `/toh-vibe ...` เป็นข้อความธรรมดา
ระบบจะตีความ (ผ่าน `AGENTS.md`) ว่าเป็นการเรียก skill ที่ตรงกัน —
แต่มัน **ไม่ใช่** native slash command ของ Codex

ถอนการติดตั้ง (ลบเฉพาะไฟล์ Codex ที่ TOH สร้าง — skill ของคุณเองและข้อความ
ใน `AGENTS.md` จะถูกเก็บไว้):

```bash
npx toh-framework uninstall --ide codex
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
| `/toh-protect` | `/toh-pt` | 🔐 **Security Audit** - ตรวจสอบความปลอดภัย `[NEW]` |
| `/toh-connect` | `/toh-c` | 🔌 **เชื่อม Backend** - Supabase, Auth, RLS |
| `/toh-line` | `/toh-l` | 💚 **LINE MINI App** (convert) |
| `/toh-mobile` | `/toh-m` | 📱 **Mobile App** - PWA / Capacitor |
| `/toh-fix` | `/toh-f` | 🔧 **แก้ Bug** - Debug อย่างเป็นระบบ |
| `/toh-ship` | `/toh-s` | 🚀 **Deploy** - Vercel, พร้อม Production |
| `/toh-help` | `/toh-h` | ❓ **Help** - แสดงคำสั่งทั้งหมด |

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
├── 🔐 security-check → ตรวจสอบความปลอดภัย [NEW]
└── ✅ ส่งมอบระบบพร้อมใช้!
```

### 🔁 Plan → Vibe Workflow

แผนคือ **ไฟล์** ไม่ใช่ข้อความแชท:

- `/toh-plan` เขียนแผนลง `.toh/plan.md` → อนุมัติ**ครั้งเดียว** ("Go") → AI สร้างทั้งแผนอัตโนมัติ ตรวจสอบทุก checkpoint เอง
- `/toh-vibe` ทำแผนค้างต่อได้เสมอ: อ่าน `.toh/plan.md` ก่อน แล้วทำต่อจาก task แรกที่ยังไม่ติ๊ก — ข้าม session ข้าม IDE ได้

หมายเหตุ: กลไก*บังคับ* loop อัตโนมัติ (Stop hook, `/goal`, `/loop`) มีเฉพาะบน Claude Code เท่านั้น — IDE อื่นรัน loop เดียวกันในรูปแบบคำสั่งในเอกสาร (instructions) โดยมี checkbox-resume ใน `.toh/plan.md` เป็นกลไกกู้คืน

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

- 🤖 **8 Sub-Agents** - เชี่ยวชาญเฉพาะทาง
- 🎯 **14 Commands** - ตั้งแต่วางแผนถึง deployment
- 📚 **23 Skills** - ความสามารถ AI ครบครัน `[NEW: Orchestration Protocol]`
- 🎨 **Design Identity** - DESIGN.md ประจำโปรเจค + AVOID-LIST แบบมีเวอร์ชัน
- 📦 **15 Component Templates** - Premium components พร้อมใช้
- 🌐 **5 IDEs** - Claude Code, Cursor, Antigravity, Gemini, Codex

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
