---
name: design-craft
description: >
  Universal design principles for UI ที่ดู "product จริง" ไม่ใช่ "AI-generated".
  Replaces per-business color lookup with 6 principles that give each app its own
  personality. Typography-first hierarchy, neutral surface + one accent, restraint,
  real density, real content, craft details. Includes type/spacing/motion scales,
  shadcn-style component patterns (Tailwind 4 + React 19), AI red-flags, review checklist.
  Triggers: build UI, new component, design review, polish UI, "looks like AI made it",
  design system, style guide, make it beautiful, /toh-vibe, /toh-ui, /toh-design.
triggers:
  - /toh-vibe (new projects)
  - /toh-ui (new components)
  - /toh-design (polish)
  - Any UI creation or design review request
---

# Design Craft

Make AI-built apps look **human-crafted**. Not from a template. Not from a color formula.

<core_principle>
## The Craft Standard

ถ้ามีคนดูออกว่า "AI ทำ" = เราแพ้แล้ว

Good design is invisible. ผู้ใช้ควรรู้สึกว่าแอปดู professional โดย **ไม่รู้ตัวว่าทำไม** —
ไม่ใช่สังเกตว่ามันเดินตาม template.

### Why the old "business → hex" approach failed

```
เดิม:  business type → lookup สี → apply     (deterministic = ทุกแอปประเภทเดียวกันโคลนกัน = ลายเซ็น AI)
ใหม่:  brand context → design principles → ตัดสินใจเฉพาะงาน (แต่ละแอปมีบุคลิกของตัวเอง)
```

"ร้านอาหาร = ส้ม, การเงิน = เขียว" ทำให้ทุกแอปหน้าตาเหมือนกัน. เราทิ้ง registry นั้น
แล้วใช้ **หลักการสากล** ที่ Linear / Stripe / Vercel ใช้จริง — บวกกับการเข้าใจ brand
เพื่อเลือกบุคลิกให้ต่างกัน.
</core_principle>

---

## Business context = ANALYSIS ANGLE, not a lookup table

ก่อนออกแบบ ให้เข้าใจ context เพื่อ **ตัดสินใจ** ไม่ใช่เพื่อ **เปิดตาราง**:

- **Brand & mood** — แอปนี้ควรให้ความรู้สึกอะไร? (calm / energetic / serious / playful)
  แล้วเลือก accent hue + type weight ให้สะท้อน mood นั้น — ไม่ใช่หยิบสีจากลิสต์.
- **Audience** — ใครใช้? dev tool ต่างจาก consumer app: density, dark-mode, ภาษา copy.
- **Job to be done** — dashboard เน้นอ่านข้อมูล, marketing page เน้น narrative, form เน้น flow.
- **Competitors / references** — ดูของจริงในหมวดนั้น 2-3 เจ้า แล้ว **ทำให้ต่าง** ไม่ใช่โคลน
  (โดยเฉพาะ AI apps: อย่าลอก purple-blue gradient ของทุกเจ้า).

Context บอก "ทิศทาง" — 6 principles ข้างล่างบอก "วิธีทำให้ดี".

---

## Principle 1 — Typography-First

Hierarchy มาจาก **weight + size** ไม่ใช่สี. ถ้าเปิดแอปเป็นขาว-ดำแล้วยัง scan ได้ = hierarchy ดี.

```
ใช้ font ระดับ product จริง:
- Latin:  Inter (Variable) / Geist / system-ui stack
- Thai:   IBM Plex Sans Thai / Noto Sans Thai / Sarabun
- Mono:   Geist Mono / JetBrains Mono (code, tabular numbers)
```

Next.js: โหลดผ่าน `next/font` (self-host, ไม่มี layout shift) — อย่าฝัง `<link>` Google Fonts ตรงๆ.

### Type scale (Tailwind classes)

```
Display / Hero:   text-4xl / text-5xl  font-semibold  tracking-tight
Page Title:       text-2xl  font-semibold             (24px)
Section Title:    text-lg   font-medium               (18px)
Card Title:       text-base font-medium               (16px)
Body:             text-sm   font-normal               (14px, line-height 1.5-1.6)
Small / Caption:  text-xs   text-muted-foreground     (12px)
```

Rules:
- Heading = `font-semibold` หรือ `font-medium` เสมอ — ไม่เคย `font-normal`.
- Body = regular. **อย่า `font-bold` ทั้งหน้า** (ทุกอย่าง bold = ไม่มีอะไร bold).
- Max 3 sizes ต่อ component. Left-align body (heading อาจ center ใน layout ที่ center).
- Big headings ใส่ `tracking-tight`. ห้าม ALL CAPS กับข้อความยาว.

---

## Principle 2 — Neutral Surface + One Accent

~90% ของ UI เป็น neutral. Accent ใช้เฉพาะ **key action / active state / focus** — นี่คือมาตรฐาน
Linear / Stripe / Vercel. สีเยอะ = amateur.

```css
/* Semantic tokens (Tailwind 4 @theme ใน globals.css) — ผูกกับ shadcn variables */
--background:        neutral page bg (near-white / near-black in dark)
--foreground:        primary text (ไม่ใช่ pure black — ใช้ ~neutral-900)
--muted-foreground:  secondary / hint text
--border:            dividers (neutral-200 / neutral-800)
--primary:           THE accent — ปุ่มหลัก, link, active nav, focus ring
--destructive:       error / delete เท่านั้น
```

เลือก accent **หนึ่งสี** ให้เข้ากับ brand mood (ข้อ "Business context"):
- trustworthy / default → blue
- money / growth → green/emerald
- calm / health → teal
- energetic / appetite → orange
- creative → ใช้ violet ได้ **ถ้าตั้งใจจริง** (ไม่ใช่ default ที่หลุดมา)

Rules:
1. หนึ่ง accent ต่อแอป. ไม่มีข้อยกเว้น.
2. Background เป็น neutral — ไม่เคยเป็นสี accent เต็มพื้น.
3. **ห้าม gradient บนปุ่มหลัก** — solid ดู intentional กว่า.
4. Dark mode: invert semantic tokens ให้ถูก ไม่ใช่แค่เทาทั้งหมด. คุม contrast (WCAG AA).

Tailwind 4: กำหนดสีใน `@theme { --color-primary: … }` แล้วใช้ `bg-primary text-primary-foreground`.
ไม่มี `tailwind.config.js` แล้ว.

---

## Principle 3 — Restraint = Premium

สิ่งที่ต้อง **ตัดทิ้ง** เพราะเป็น AI signature ทุกตัว:

| ตัด | เพราะ | ใช้แทน |
|-----|-------|--------|
| Gradient บนปุ่ม / purple-blue gradient | ลายเซ็น Lovable/AI | solid `bg-primary` |
| Glassmorphism (`backdrop-blur` + `bg-white/10`) | trend เกร่อ + perf แย่ | surface ทึบ + border บางๆ |
| Shadow หนา / ซ้อนหลายชั้น | ดู bootstrap เก่า | `shadow-sm`, hover เป็น `shadow-md` |
| `rounded-3xl` / `rounded-full` ทุกที่ | thoughtless | ดูตารางข้างล่าง |
| Emoji ใน UI header (`<h1>Dashboard 🚀</h1>`) | ดูไม่ pro | ข้อความล้วน |
| Copy โอเวอร์ ("Supercharge your workflow!") | marketing AI | ภาษา product จริง |
| Animation > 200ms / bounce / spring แรง | ดู cheap | 150-200ms ease-out |
| Pure black `#000` text | harsh | `neutral-900` / `--foreground` |

### Border-radius — vary by element (อย่าใช้ค่าเดียวทั้งแอป)

```
Inputs / small buttons:  rounded-md   (6px)
Cards / dialogs:         rounded-lg / rounded-xl  (8-12px)
Avatars / pills / badge: rounded-full  (เหมาะกับของกลม)
เพดาน:                   ไม่เกิน 12px (rounded-xl) กับ container ทั่วไป
```

**หลักคิด:** ถ้าลบ effect ออกแล้วยังดูดี = effect นั้นไม่จำเป็นตั้งแต่แรก.

---

## Principle 4 — Density to Match Real Work

Layout ต้องสะท้อน **งานจริง** ที่ผู้ใช้ทำ ไม่ใช่ template โล่งๆ.

- **Dashboard / admin / data app** → dense. ตาราง, stat row, ข้อมูลจริงเยอะ.
  ❌ อย่าทำ "card ลอย 3 ใบ + hero text ยักษ์ + whitespace มหาศาล" — นั่นคือหน้า landing ไม่ใช่ dashboard.
- **Marketing / landing** → มี narrative, section ไล่เรื่อง, hero ได้แต่ต้องมีเนื้อ.
- **Form / settings** → flow เป็นแนวตั้ง, group ที่เกี่ยวข้องอยู่ด้วยกัน, ไม่ยัด 2 คอลัมน์มั่ว.

Layout variety: อย่าให้ทุกอย่างเป็น `Card → Card → Card`. ผสม table, list, stat, section.
อย่า center ทุกอย่าง — ใช้ grid, ซ้ายชิด, asymmetry ที่ตั้งใจ.

### Spacing scale (Tailwind default — ใช้ให้สม่ำเสมอ)

```
2  (8px)   inline / icon gap
3  (12px)  gap ใน component
4  (16px)  gap มาตรฐานระหว่าง element
6  (24px)  ระหว่าง component / card padding
8  (32px)  ระหว่าง section
12 (48px)  page section ใหญ่
```

```tsx
// Standard page container
<div className="p-4 md:p-6 lg:p-8">
  <h1 className="text-2xl font-semibold mb-6">Dashboard</h1>
  <section className="space-y-6">{/* ... */}</section>
</div>
```

Rule: ระดับเดียวกันใช้ gap เท่ากัน. อย่า `p-3` ตรงนี้ `p-5` ตรงนั้นแบบสุ่ม.

---

## Principle 5 — Real Content Stance

Copy จริงทำให้แอปดูมีตัวตน. Placeholder/marketing-speak ทำให้ดูเป็น demo.

```
❌ "Welcome back, User! 👋"        ✅ ชื่อจริง หรือ "Overview"
❌ "Supercharge your workflow! 🚀" ✅ อธิบายสิ่งที่ทำได้ตรงๆ
❌ Lorem ipsum                      ✅ ตัวอย่างข้อมูลที่สมจริงในโดเมนนั้น
❌ "Amazing feature awaits!"        ✅ ชื่อ feature ที่คนเข้าใจ
```

- Empty state = ข้อความจริง + action ที่ทำต่อได้ (ไม่ใช่ "No data").
- ตัวเลข/วันที่/ชื่อใน mock ให้ดูเหมือน production (ไม่ใช่ "Item 1, Item 2").
- ภาษาตาม CLAUDE.md ของโปรเจค (ไทย = copy ไทยจริง ไม่ใช่แปลตรงตัวแข็งๆ).

---

## Principle 6 — Craft Details (แยก pro ออกจาก demo)

สิ่งที่ AI มักลืม แต่คือตัวชี้ว่าเป็นงานจริง:

- **Focus states** — ทุก interactive element ต้องมี `focus-visible:ring-2 ring-ring` ที่เห็นชัด (a11y + keyboard).
- **Empty states** — ออกแบบจริง: icon เบาๆ + ประโยคอธิบาย + ปุ่ม action.
- **Loading states** — ใช้ **skeleton** (โครงเทาๆ ตาม layout จริง) ไม่ใช่ spinner กลางจอ.
- **Error states** — inline, บอกว่าเกิดอะไร + ทำอะไรต่อได้ ไม่ dump stack.
- **Hover / active** — feedback บางๆ ทุกปุ่ม/แถว (`hover:bg-muted`), press `active:scale-[0.98]`.
- **Disabled / pending** — ปุ่ม submit ต้องมีสถานะกำลังทำงาน (React 19: `useActionState` / `useFormStatus`).

---

## Component Patterns (shadcn-style · Tailwind 4 · React 19)

React 19: ref เป็น prop ปกติ — **ไม่ต้อง `forwardRef`**.

### Card
```tsx
// Clean card — border บาง + shadow เบา, ไม่มี decoration เกิน
<Card className="bg-card border shadow-sm">
  <CardContent className="p-6">{/* ... */}</CardContent>
</Card>
// ห้าม: rounded-3xl, shadow หนา, gradient border, glassmorphism
```

### Button
```tsx
<Button>Save</Button>                         {/* primary */}
<Button variant="outline">Cancel</Button>     {/* secondary */}
<Button variant="destructive">Delete</Button> {/* destructive */}
<Button variant="ghost" size="icon"><Settings className="size-4" /></Button>
// ห้าม: gradient button, 3D effect, ปุ่มหลักหลายอันในหน้าเดียว (hierarchy พัง)
```

### Form (React 19 Actions)
```tsx
<form action={formAction} className="space-y-4">
  <div className="space-y-2">
    <Label htmlFor="name">Name</Label>
    <Input id="name" name="name" placeholder="Enter name" />
    {state?.errors?.name && <p className="text-sm text-destructive">{state.errors.name}</p>}
  </div>
  <SubmitButton />   {/* ใช้ useFormStatus() → disabled + "Saving…" ตอน pending */}
</form>
// ห้าม: inline label, floating label (ถ้าไม่ได้ขอ), icon ยัดใน input
```

### Table
```tsx
<Table>
  <TableHeader>
    <TableRow className="bg-muted/50">
      <TableHead>Name</TableHead>
      <TableHead>Status</TableHead>
      <TableHead className="text-right">Actions</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow className="hover:bg-muted/50">
      <TableCell>John Smith</TableCell>
      <TableCell><Badge>Active</Badge></TableCell>
      <TableCell className="text-right">
        <Button variant="ghost" size="sm">Edit</Button>
      </TableCell>
    </TableRow>
  </TableBody>
</Table>
// ห้าม: zebra stripes, border หนา, จัด content ตรงกลาง
```

---

## Motion & Animation

Animation ต้อง **ให้ feedback** ไม่ใช่ flashy. เร็ว (150-200ms) subtle ไม่ dramatic.

```tsx
// Hover / color transitions
<div className="transition-colors hover:bg-muted" />
<Card className="transition-shadow hover:shadow-md" />

// React 19 View Transitions หรือ CSS สำหรับ page/enter — เบาๆ
// Framer Motion (ถ้าใช้): enter = fade + slide สั้นๆ
initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.2, ease: "easeOut" }}
// List stagger: staggerChildren 0.05 (ไม่ช้ากว่านี้)
// Button press: whileTap={{ scale: 0.98 }}
```

Timing:
- Hover: ~150ms · transition ทั่วไป: ~200ms · **เพดาน: 200ms**.
- ❌ bounce, spring แรง, entrance ดราม่า, animate ทุก element, spinner ทุกที่ (ใช้ skeleton).

---

## AI Red Flags — scan ก่อนส่งมอบ

### The "Lovable / AI look"
- Purple / violet เป็น primary (ทั้งที่ brand ไม่ได้สื่อ creativity)
- Purple-blue gradient (ทุก AI app ใช้ = ลายเซ็น)
- Gradient บน card สีขาว / บนปุ่ม
- `rounded-3xl` ทุกที่
- Emoji ใน header · "Welcome back, User! 👋"
- Glassmorphism ลอยทั่วหน้า
- Illustration สไตล์ stock generic

### The "Bootstrap / Material look"
- Drop shadow หนา, pill button ทุกปุ่ม, ลิงก์น้ำเงินทุกคำ
- Card deck สูงเท่ากันเป๊ะ, jumbotron header
- Floating action button, ripple ทุกที่, hamburger บน desktop

### What makes it "human-made"
1. **Restraint** — ไม่ได้ highlight ทุก feature
2. **Hierarchy** — primary / secondary / tertiary ชัด
3. **Whitespace** — มีที่หายใจ (แต่ dashboard ยัง dense พอ)
4. **Consistency** — pattern เดิมซ้ำทั้งแอป
5. **Subtle details** — touch เล็กๆ ที่ไม่ตะโกน
6. **Real content** — ไม่มี placeholder โผล่

---

## Review Checklist

**Color**
- [ ] Accent สีเดียว, ~90% neutral
- [ ] ไม่มี gradient บนปุ่ม / บนพื้นขาว
- [ ] ไม่มี pure black text · contrast ผ่าน WCAG AA

**Typography**
- [ ] Hierarchy มาจาก weight/size (ไม่ใช่สี) · max 3 sizes/component
- [ ] Heading semibold/medium, body regular · ไม่มี ALL CAPS ยาว · line-height 1.5+

**Spacing / Layout**
- [ ] Padding สม่ำเสมอ · density เหมาะกับประเภทงาน (dashboard dense ไม่ใช่ card ลอย)
- [ ] Layout variety (ไม่ใช่ card เรียงล้วน) · ไม่ center มั่ว

**Motion**
- [ ] Transition 150-200ms · ไม่มี bounce · loading = skeleton ไม่ใช่ spinner

**Component**
- [ ] Card/Button/Form/Table สะอาด · radius vary ตาม element (≤12px container)
- [ ] Button hierarchy ชัด (primary เดียว)

**Craft**
- [ ] Focus states เห็นชัด · empty/loading/error states ออกแบบครบ
- [ ] Real content (ไม่มี Lorem ipsum / marketing-speak / emoji ใน header)

**Final**
- [ ] ถ้าเป็นผู้ใช้ ดูออกไหมว่า AI ทำ? → ต้อง **ไม่**
- [ ] ดูเหมือน product จริงของบริษัทจริงไหม? → ต้อง **ใช่**
- [ ] แอป 3 ประเภทต่างกัน → บุคลิกต่างกันจริงไหม? → ต้อง **ใช่**

---

*Design Craft — universal principles, distinct personality per app.*
