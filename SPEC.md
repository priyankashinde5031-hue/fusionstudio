# Fusion Studio — Membership Management Tool
### Build spec / working instructions for Claude Code

> **How to use this file.** Paste this as your first task in Claude Code, or keep it in the repo as `SPEC.md` and reference it. Do **not** dump the whole thing into `CLAUDE.md` — keep `CLAUDE.md` lean (stack, commands, conventions) and treat this as the product brief. Build in the phases at the bottom, one at a time, and stop for review after each phase.

---

## 0. Working agreement (read first)

- The environment is already configured. **Use the stack that already exists in the repo — do not scaffold a new one.** If the repo is empty, ask me before picking a stack; a sensible default is a single full-stack app with a relational DB (Postgres, or SQLite for local), a web admin dashboard, and a mobile-first customer web app (PWA).
- Everything customer-facing is **mobile-first**. Design for a 375px-wide phone first, desktop second.
- When you build any UI, **first read `/mnt/skills/public/frontend-design/SKILL.md`** and follow it. The membership card especially must not look templated (see §9).
- All users are in **India**: phone numbers are `+91`, 10 digits starting 6–9; currency is `₹`; dates display `DD/MM/YYYY`; **all time math uses IST (Asia/Kolkata)** — this matters for the 24-hour coupon window.
- Never hard-delete member, card, or coupon records — soft-delete/deactivate and keep an audit trail. Ask me before any migration that drops data.
- Keep secrets (auth provider keys, DB creds) in env vars, never in code.

---

## 1. What we're building

**Fusion Studio** is a salon. This tool manages memberships and coupons. It has **two surfaces**:

1. **Admin dashboard** (staff/desktop) — create membership types, benefits and coupons; assign cards and coupons to customers; redeem coupons.
2. **Customer app** (mobile web / PWA) — a customer logs in with their phone number and sees their membership card, their benefits, and their coupons; reveals coupon codes; transfers coupons to others.

The **mobile number is the identity** of every customer and the key a card or coupon is assigned to.

---

## 2. Glossary / core concepts

- **Member** — a customer, identified by mobile number. Two kinds:
  - **Loyalty Member** — has a membership card + benefits.
  - **Guest Member** — auto-created when someone receives a transferred coupon but isn't registered yet. (This is the "Non-Loyalty" account. Suggested display name: **"Guest Member"** — friendlier than "Non-Loyalty"; internally just a flag `is_loyalty = false`. Alternatives if you prefer: "Associate Member", "Friend of Fusion".) A Guest Member can hold and use coupons but has no card/benefits until upgraded.
- **Membership Type** — a tier the admin defines (e.g. Silver / Gold / Platinum). Carries a name, description, a **list of benefits**, an optional price, and a validity duration.
- **Benefit** — a perk attached to a membership type (free text line, e.g. "10% off all services", "1 free head spa / month").
- **Membership Card** — an issued instance of a membership type, assigned to one member. Has a unique **membership number** and a valid-from / valid-until.
- **Coupon (definition)** — a coupon template the admin creates: name, benefit/description, **validity (start)** and **expiry (end)**, terms.
- **Assigned coupon (instance)** — a copy of a coupon definition given to a specific member. Has a unique **coupon number**. This is what lives in the customer's wallet.
- **Redemption code** — a short secret generated when the customer **reveals** a coupon. Valid for **24 hours**, entered by staff in the admin dashboard to mark the coupon used. See §7.

---

## 3. Data model

Model coupon **definitions** separately from **assigned instances** (many members can hold the same coupon).

**`members`**
- `id`
- `mobile` (unique, `+91`, validated) — the identity
- `name` (nullable for guests)
- `is_loyalty` (bool) — false ⇒ "Guest Member"
- `mobile_verified_at` (nullable) — set once the number is verified via method A at first login (§4)
- `pin_hash` (nullable) — hashed 4–6 digit PIN; never store the PIN in plaintext
- `pin_reset_required` (bool) — admin can set this to force re-verification on next login
- `created_at`, `created_via` (`admin` | `coupon_transfer`)
- `deactivated_at` (nullable)

**`membership_types`**
- `id`, `name`, `description`
- `price` (nullable, ₹)
- `validity_days` (how long a card of this type stays valid)
- `theme` (e.g. `silver` | `gold` | `platinum` | `black`) — drives card look
- `is_active`

**`benefits`**
- `id`, `membership_type_id`, `text`, `sort_order`

**`membership_cards`**
- `id`
- `membership_number` (unique, human-readable — see §8)
- `membership_type_id`
- `member_id` (the assignee)
- `valid_from`, `valid_until`, `status` (`active` | `expired` | `revoked`)
- `issued_at`

**`coupon_definitions`**
- `id`, `name`, `description` (the benefit text), `terms` (nullable)
- `valid_from` (validity), `valid_until` (expiry)
- `is_active`

**`assigned_coupons`**  ← the wallet item
- `id`
- `coupon_number` (unique, human-readable — see §8)
- `coupon_definition_id`
- `member_id` (current holder)
- `status` — `available` | `revealed` | `redeemed` | `expired` (see state machine §7)
- `redemption_code` (nullable, set on reveal)
- `revealed_at`, `code_expires_at` (nullable)
- `redeemed_at`, `redeemed_by_admin_id` (nullable)
- `created_at`

**`coupon_transfers`** (audit)
- `id`, `assigned_coupon_id`, `from_member_id`, `to_member_id`, `to_mobile`, `created_at`

**`admins`** — staff login for the dashboard (email + password is fine here; this is internal).

**`audit_log`** — who did what, when (card issued, coupon assigned, revealed, redeemed, transferred).

---

## 4. Authentication — DECIDED

**Constraint: no SMS OTP, no email.** All users are Indian, so we lean on channels they already have.

**Decision (build this):**
- **Primary login = C, Mobile + PIN.** Day-to-day, a returning member logs in with their number + a 4–6 digit PIN they set on their first login.
- **Fallback = A, OTP-less (WhatsApp / Truecaller).** Used when a member can't use the PIN — **forgot PIN / PIN reset**, and new device. A one-tap WhatsApp or Truecaller verification re-establishes them, then they set a new PIN.
- **Registration always verifies the mobile number.** A member is created *unverified* (by an admin issuing a card, or by a coupon transfer). The number is only proven to belong to them at **first login / account claim**, via the fallback channel (A). Flow:
  1. Enter mobile → system sends a one-time WhatsApp/Truecaller verification (method A).
  2. On success, mark the member **verified** (`mobile_verified_at`).
  3. Prompt them to **set a PIN**. Done — every later login is just mobile + PIN (C).
- So **A is the verification/recovery rail, C is the everyday rail.** Because the PIN alone can't prove number ownership, the one-time A verification at registration is what makes the PIN trustworthy. An unverified member cannot reveal or transfer coupons.
- Admin can trigger a **PIN reset** from the dashboard, which forces the member through the A verification again on next login.

Build both behind one `AuthProvider` interface (`startVerification(mobile)` / `confirmVerification(...)` / `setPin(...)` / `loginWithPin(...)`) so the A provider (OTPless / Truecaller SDK) is swappable by config. **Until the real A provider is wired up, stub the verification step as auto-pass in dev** so the PIN flow is fully testable offline; leave a clear `TODO` where the provider plugs in.

Reference table (why these, over the rejected options):

| Option | How it works | Why it fits India | Trade-offs |
|---|---|---|---|
| **C. Mobile + PIN** ⭐ primary | Member sets a 4–6 digit PIN on first login; later logins = number + PIN | Zero third-party cost, fully offline, dead simple | Can't prove number ownership on its own → paired with A at registration |
| **A. OTP-less (WhatsApp + Truecaller)** ⭐ fallback + verification | OTPless / Truecaller SDK. One tap → verified via Truecaller identity or a WhatsApp tap. No SMS, no email. | ~Everyone has WhatsApp; Truecaller is huge in India; genuinely one-tap | Third-party dependency + per-verification cost; needs SDK setup |
| **B. WhatsApp OTP** — rejected | 6-digit code over WhatsApp | familiar | still an OTP step; A gives the same channel one-tap |
| **D. Passkey / biometric** — rejected | Face/fingerprint | best security | device-bound; recovery fiddly; older phones patchy |

Admin dashboard auth is separate and simple (email + password, internal staff only).

---

## 5. Admin dashboard — features

1. **Membership Types** — create/edit/deactivate. Each has name, description, theme, validity duration, optional price, and a **benefits list** (add/reorder/remove benefit lines).
2. **Coupons** — create/edit/deactivate coupon **definitions** with name, benefit description, **validity start** and **expiry**, and terms.
3. **Members** — search by mobile; view a member's card, benefits and coupons; create a member; upgrade a Guest Member to a Loyalty Member.
4. **Assign a card** — pick a member (by mobile) + a membership type → issues a card, auto-generates the **membership number**, sets valid-from/until.
5. **Assign coupons** — give one or more members an instance of a coupon definition → auto-generates a unique **coupon number** each. (Support bulk-assign by pasting a list of mobiles.)
6. **Redeem a coupon** — a prominent input: staff types the **redemption code** the customer shows them → system validates it's an active, un-expired revealed code → marks it **redeemed**, stamps time + which admin. Clear success/failure states (invalid / already used / expired-window / coupon expired).
7. **Views/reports** — list coupons by status (available / revealed / redeemed / expired), members by type, and a transfer log.

---

## 6. Customer app — features (mobile-first)

1. **Login** — phone number, per §4.
2. **Home** — the **membership card** rendered large and premium (§9) with the member's name, membership number, tier and valid-thru. Guest Members see a simpler state (no card) with a prompt about their coupons.
3. **Benefits** — the list of benefits tied to their card's membership type. Tap the card to flip to benefits on the back (nice-to-have).
4. **Coupons / wallet** — their assigned coupons grouped by **Available**, **Revealed (active)**, **Used**, **Expired**. Each shows name, benefit, validity and expiry.
5. **Reveal a coupon** — tap **Reveal** → shows the **redemption code** big and copyable, with a **live 24-hour countdown**. Instruction: "Show this code at the counter within 24 hours." (§7)
6. **Transfer a coupon** — on an **Available** (not-yet-revealed) coupon, tap **Transfer** → enter the **recipient's mobile number** → confirm. See §8. After transfer it leaves the sender's wallet.

Keep the whole thing installable (PWA: manifest + icons + offline shell). No app store needed.

---

## 7. Coupon lifecycle & the 24-hour rule (build this exactly)

An assigned coupon moves through these states:

```
available ──reveal──▶ revealed ──admin enters code in 24h──▶ redeemed (final)
   ▲                     │
   └──24h passes, no redeem (code expires)──┘   ← "revalidated": back to available
```

- **available**: in the wallet, code hidden. Can be **revealed** or **transferred**.
- **reveal action**: generate a fresh unique `redemption_code`, set `revealed_at = now`, `code_expires_at = now + 24h` (IST), status → **revealed**. Show code + countdown.
- **redeemed**: staff enters the code within the window → final state. Can't be revealed or transferred again.
- **the 24-hour rule / "revalidate"**: if the window passes with no redemption, the code becomes invalid and the coupon **returns to `available`** (code cleared). The customer can reveal again later to get a **new** code and a **new** 24-hour window. So the *reveal* is time-boxed, not the coupon itself.
- **coupon expiry** is separate: once the coupon **definition's** `valid_until` passes, the coupon is **expired** (final) and can't be revealed at all — regardless of the 24h reveal logic. Likewise it isn't usable before `valid_from`.

Implementation notes:
- Compute state transitions on read *and* with a scheduled job/cron so states are correct even if no one opens the app.
- `redemption_code`: 6–8 chars, uppercase, **unambiguous charset** (exclude `0/O`, `1/I/L`). Must be unique among all *currently active* revealed codes so staff entry is unambiguous. Store it; optionally also let staff enter the `coupon_number` to disambiguate.

---

## 8. Transfer logic (build this exactly)

- Only an **`available`** coupon can be transferred (not revealed/redeemed/expired). If it's currently revealed, block with a message ("finish or let this code expire before transferring").
- Sender taps Transfer → enters recipient **mobile number** → confirms.
- **If the recipient exists** (loyalty or guest): reassign the coupon's `member_id` to them, log a row in `coupon_transfers`, remove it from the sender's wallet, add to recipient's.
- **If the recipient does not exist**: **auto-create a member** with `is_loyalty = false` (display "**Guest Member**"), `name = null`, `created_via = coupon_transfer`, then assign the coupon to them. On their first login they see the coupon and can reveal it like anyone else.
- A Guest Member holds/uses coupons but has **no card or benefits** until an admin upgrades them.
- Allow onward transfer (guest → someone else) but always log it. Don't allow transferring to your own number.

---

## 9. Membership card — design brief ("make it sexy")

The card is the hero of the customer app. It must feel like a **premium physical membership card**, not a web `<div>`. Read the frontend-design skill first, then:

- **Vibe:** luxury salon / spa. Think high-end matte-black-and-gold membership card or a modern frosted-glass card. Restrained, expensive, tactile.
- **Tier themes** driven by `membership_type.theme`: distinct palettes and finishes per tier — e.g. Silver (cool brushed metal), Gold (warm champagne/foil), Platinum (pearl/iridescent), Black (matte black + gold accents). One layout, different skins.
- **On the card:** "Fusion Studio" wordmark/logo, member name, **membership number in a monospaced, credit-card-style layout**, tier badge, "Valid thru MM/YY", and a subtle background texture (fine guilloché lines, soft grain, or a light gradient sheen). Add a soft inner shadow + a diagonal glossy highlight so it reads as a real card.
- **Motion (tasteful, optional):** slight 3D tilt following device orientation or drag; tap to flip to the **back** showing the benefits list. Keep it 60fps on a mid-range Android; disable heavy effects if `prefers-reduced-motion`.
- Reference feel: Apple Wallet card, premium metal cards, spa gift cards. Do not ship the default Tailwind card look.

---

## 10. Non-functional

- Mobile-first, responsive, accessible (tap targets ≥44px, readable contrast).
- IST everywhere for time math; `DD/MM/YYYY` display; `₹` for any money; `+91` phone validation with clear inline errors.
- Basic rate-limiting on login and reveal endpoints.
- Seed script with 2–3 membership types (with benefits), a few coupons, and sample members so the app is demoable immediately.

---

## 11. Build phases (do one at a time, pause for review)

- **Phase 1 — Foundation & admin core.** Data model + migrations + seed. Admin auth. CRUD for membership types + benefits, and coupon definitions. *Deliverable: I can define tiers, benefits and coupons.*
- **Phase 2 — Members, cards, assignment.** Create members, assign cards (auto membership number), assign coupons (auto coupon number), member search. *Deliverable: I can issue a card and hand out coupons.*
- **Phase 3 — Customer app: login + wallet.** Auth per §4: first-login mobile **verification** (method A, stubbed auto-pass in dev) → **set PIN** → later logins are mobile + PIN (method C); plus admin-triggered PIN reset. Home with the membership card (basic version), benefits, coupons list. *Deliverable: a customer verifies once, sets a PIN, logs back in with it, and sees their stuff.*
- **Phase 4 — Reveal + 24h code + admin redemption.** Full state machine (§7) with the scheduled revalidation job, and the admin redeem screen. *Deliverable: end-to-end reveal → staff redeem works, and unused codes revalidate after 24h.*
- **Phase 5 — Transfer + Guest Members.** Transfer flow with auto-create (§8) and the transfer log. *Deliverable: user 1 → user 2 transfer, including to a brand-new number.*
- **Phase 6 — Polish.** The "sexy" card (§9), PWA install, empty/error states, rate limiting, and wiring the chosen real auth provider from §4.

---

## 12. Assumptions I made (correct me if wrong)

1. Login = **Mobile + PIN (primary)** with **OTP-less WhatsApp/Truecaller (fallback + recovery)**. **Mobile verification is mandatory at registration** — a member is created unverified and must pass the one-time A verification at first login before setting a PIN; unverified members can't reveal or transfer coupons. No SMS OTP, no email. (See §4.)
2. "Valid for 24 hours then revalidated" = the **revealed code** lasts 24h; if unused, the coupon returns to *available* and can be revealed again for a fresh code/window. The coupon's own expiry date is separate.
3. Multiple customers can hold the same coupon (definitions vs assigned instances).
4. Only **un-revealed** coupons are transferable.
5. Guest ("Non-Loyalty") members have coupons only — no card/benefits until upgraded.
6. Membership/coupon numbers are auto-generated, human-readable, unique (e.g. `FS-M-000123`, `FS-C-000123`) — tell me if you want a specific format or prefix.
