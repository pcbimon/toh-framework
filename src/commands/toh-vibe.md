---
command: /toh-vibe
aliases: ["/toh-v"]
description: Type one line of intent → a complete, running, good-looking multi-page app
trigger: /toh-vibe or /toh-v followed by an app description
skills:
  - vibe-orchestrator
  - engineer-harness
---

# /toh-vibe - Type Once, Have it all! ✨

> **Version:** 5.0.0
> **Command:** `/toh-vibe [app idea]` · alias `/toh-v`
> **Philosophy:** สั่งบรรทัดเดียว → ได้แอปหลายหน้าที่รันได้จริงและสวยตั้งแต่แรกเห็น

นี่คือคำสั่งเรือธง สำหรับ **โปรเจคใหม่ล้วน** (greenfield) พี่โตบอกไอเดียบรรทัดเดียว หนูตัดสินใจที่เหลือเองทั้งหมด — ไม่สัมภาษณ์ ไม่ถามกลับ ส่งมอบแอปที่ประทับใจกว่า Lovable ตั้งแต่ครั้งแรก

ใช้แกนเดียวกับ `/toh`: **Intent → Route → Verify → Report** แต่ scope = สร้างโปรเจคใหม่

---

## 🧭 4 Moves

### 1. Intent — อ่านให้ออกว่าจะสร้างอะไร
จากไอเดียบรรทัดเดียว เดา: ธุรกิจประเภทไหน · กลุ่มผู้ใช้เป็นใคร · หน้าไหนที่ *สำคัญจริง* กับธุรกิจนี้ แล้ว **ตัดสินใจ default ที่สมเหตุผลเอง** — อย่าถามพี่โตว่าอยากได้ฟีเจอร์อะไร framework อะไร สีอะไร หนูเลือกให้

### 2. Route — วางแผนสั้น แล้วกระจายงาน
โชว์แผนโปรเจคกระชับก่อน (รายชื่อหน้า + stack ที่จะใช้) แล้ว delegate ไป native subagents โดยอ่าน description ของแต่ละตัวให้ Claude Code จับคู่งานเอง:
- `plan-orchestrator` — วางโครงหน้า/ฟีเจอร์ · `ui-builder` — สร้างทุกหน้า · `dev-builder` — logic + state + mock CRUD · `design-reviewer` — เกลาให้ดู pro · `test-runner` — build & verify

ยิงขนานส่วนที่ไม่พึ่งกัน เคารพ dependency — ไม่มีตาราง phase ตายตัว ไม่มี status theater

### 3. Verify — ต้องรันได้จริง
`npm run build` ผ่าน · dev server รันขึ้น · ทุกหน้าโหลดได้ **ห้ามส่งมอบทั้งที่มี build error** เจอ error แก้ให้จบทุกจุดก่อนค่อยรายงาน

### 4. Report — พูดภาษาคน
สร้างอะไรให้บ้าง · URL ที่เปิดดู (เช่น `http://localhost:3000`) · ลองกดอะไรดูก่อน · ขั้นถัดไปแนะนำอะไร — ผลลัพธ์ก่อน ศัพท์เทคนิคแปลเป็นภาษาคน · dev server รันอยู่แล้ว ไม่ต้อง `npm run dev` ซ้ำ

---

## 🎨 หลักการที่ต้องคงไว้ (lean)

- **หลายหน้า** 4-6 หน้าขึ้นไป ที่ใช้งานได้จริง ไม่ใช่ 1-2 หน้าโล่งๆ
- **Mock data สมจริง** ข้อมูลไทยที่ดูจริง — ห้าม Lorem ipsum
- **Responsive** สวยครบทุกขนาดจอ mobile-first
- **Anti-AI-looking** ใช้ความ restraint เป็นหลัก — ตัด gradient บนปุ่ม, glassmorphism, shadow หนา, emoji ใน UI ที่ทำให้ดูเป็นงาน AI
- **No Questions Asked** ตัดสินใจ default เองทั้งหมด ไม่สัมภาษณ์ผู้ใช้
- **First impression ต้องชนะ** — ดีกว่า Lovable ตั้งแต่แรกเห็น

**เรื่อง look & feel:** ให้ `design-reviewer` เลือกบุคลิกงานตาม business context เอง (ดู design skills) — ไม่มี registry สี/pattern ตายตัวในไฟล์นี้ แต่ละแอปควรมีบุคลิกของตัวเอง ไม่โคลนกัน

---

## 💾 Memory

- **เริ่ม:** อ่าน `.toh/memory/active.md` + `.toh/memory/summary.md`
- **จบ:** อัพเดท `active.md` + `summary.md` (โปรเจคใหม่ = รูปร่างเปลี่ยนเสมอ) บันทึกหน้าและ stack ที่สร้าง

---

## 📌 Example

**สั่ง:** `/toh-vibe ระบบจัดการร้านกาแฟ`

**Intent:** ร้านกาแฟ → เจ้าของร้าน/พนักงาน → หน้าที่สำคัญ: หน้าขาย, เมนู, สต็อก, ยอดขาย, ตั้งค่า

**Route (แผนสั้น):**
> - Stack: Next.js + Tailwind + shadcn/ui + Zustand
> - หน้า: Dashboard ยอดขาย · เมนู/สินค้า · หน้าขาย (POS) · สต็อก · ตั้งค่า
> - `ui-builder` ทำหน้า (ขนาน) + `dev-builder` mock CRUD/state → `design-reviewer` เกลา → `test-runner` build

**Verify:** build ผ่าน dev server รันขึ้น เดินครบทุกหน้า

**Report:** "สร้างระบบร้านกาแฟ 5 หน้าเสร็จแล้วค่ะ เปิดที่ `http://localhost:3000` — ลองหน้า POS กดสั่งเมนูดู ยอดขายจะขึ้นที่ Dashboard เอง อยากต่อฐานข้อมูลจริงสั่ง `/toh เชื่อม Supabase` ได้เลย"

---

## ❌ ห้าม

- ห้ามถามว่าอยากได้ฟีเจอร์/framework/สีอะไร — ตัดสินใจเอง
- ห้ามสร้างแค่ 1-2 หน้า · ห้าม Lorem ipsum · ห้ามส่งมอบทั้งที่ build ยัง error
- ห้ามให้ผู้ใช้ไปแก้ error เอง — แก้ให้จบก่อนส่ง

*Type Once, Have it all! — v5.0.0*
