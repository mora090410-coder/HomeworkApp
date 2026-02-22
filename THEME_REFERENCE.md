# HomeWork — Theme Usage Reference
## The Crimson Standard

Single source of truth: `design-tokens.json` → `generate-tokens.js` → `src/generated/tokens.js` → `tailwind.config.js`

---

## COLOR USAGE RULES

| Token | Hex | Use For |
|---|---|---|
| `crimson` | #8B0000 | Danger, debt, rejection, active tabs, pulsing dots |
| `burgundy` | #6B0F0F | Crimson hover states, deep accents |
| `gold` | #C9A84C | Earnings, financial figures, borders, rewards |
| `goldLight` | #E2C97E | Subtle gold accents, hover fills |
| `cream` | #EDE7D9 | All card backgrounds, modal backgrounds |
| `creamMid` | #E8E0CE | Pressed card states, input backgrounds |
| `background` | #F5F0E8 | Page background — every screen |
| `charcoal` | #1C1C24 | Primary text, headings |
| `charcoalMid` | #2C2C38 | Secondary dark surfaces |

### Opacity Scale (Tailwind slash syntax)
- `/10` → subtle fill backgrounds
- `/20` → borders on light surfaces  
- `/30` → BACK button borders
- `/40` → muted labels, ghost borders
- `/50` → placeholder text
- `/60` → secondary text
- Full (no slash) → primary usage

---

## TYPOGRAPHY RULES

| Context | Class |
|---|---|
| Financial figures ($10.00, $3.75) | `font-serif text-gold` |
| Display headings, names | `font-serif text-charcoal` |
| All UI text, labels, body | `font-sans text-charcoal` |
| Section labels, ALLCAPS | `font-sans text-xs tracking-widest text-charcoal/40 uppercase` |
| Muted body copy | `font-sans text-charcoal/50 text-sm` |
| Positive earnings | `font-serif text-gold` |
| Negative / debt | `font-serif text-crimson` |

**Never** use a raw hex value for color in a component.  
**Never** use `text-green-*` for money — always `text-gold font-serif`.

---

## BUTTON SYSTEM

| Button Type | Class |
|---|---|
| Primary action | `btn-primary` or `bg-ascendant-gradient text-white rounded-full` |
| Ghost gold (secondary) | `btn-ghost-gold` |
| Ghost crimson (reject/debt) | `btn-ghost-crimson` |
| Ghost neutral (cancel/back) | `btn-ghost-neutral` |

**Signal logic:**
- Gradient → positive action (earn, approve, deposit, create)
- Gold ghost → secondary positive (pay now, view)
- Crimson ghost → debt or rejection (reject, advance funds)
- Neutral ghost → cancel, back, dismiss

---

## CARD SYSTEM

| Card Type | Class |
|---|---|
| Standard card | `bg-cream border border-gold/10 rounded-2xl` |
| Action-required card | `bg-cream border border-crimson/20 rounded-2xl` |
| Modal container | `bg-cream border border-gold/20 rounded-2xl` |
| Empty state | `border border-gold/20 rounded-2xl bg-cream/50` |
| Dark banner (payout) | `bg-charcoal border border-gold/20 rounded-2xl` |

---

## STATUS / BADGE SYSTEM

| Badge | Class |
|---|---|
| Active / positive | `badge-gold` |
| Needs action / rejection | `badge-crimson` |
| Neutral / count | `badge-neutral` |
| Pulsing dot (urgent) | `dot-crimson` |
| Static dot (stable) | `dot-gold` |

---

## TASK STATUS → UI MAP

### Child View
| Status | Child Sees |
|---|---|
| ASSIGNED | "Mark Started" — `btn-ghost-crimson` |
| IN_PROGRESS (local) | "✓ I'm Done" — `btn-primary` |
| PENDING_APPROVAL | "Sent for Review" pill — `badge-crimson` |
| PENDING_PAYMENT | "Approved! Payout coming." — `text-gold font-serif` |
| REJECTED | "REDO: [reason]" badge + "Mark Started" |

### Parent View
| Status | Parent Sees |
|---|---|
| ASSIGNED | "Waiting for child..." + Edit/Delete |
| REJECTED | "Waiting for child..." + Edit/Delete |
| PENDING_APPROVAL | Reject + Pay Now + Approve & Deposit |
| PENDING_PAYMENT | "Approved — pay out" + Record Cash Payment |

---

## GRADIENT

```css
bg-ascendant-gradient = linear-gradient(135deg, #8B0000 → #C9A84C)
```
Use for: primary CTA buttons, active states, positive financial actions.  
Never use for: rejection, debt, cancel, back actions.

---

## NEVER DO

- ❌ `text-green-*` on any financial figure
- ❌ `bg-white` on any card
- ❌ Hex values (`#C9A84C`) directly in components
- ❌ `border-dashed` on empty states
- ❌ Gradient on debt/advance/reject buttons
- ❌ Delete without confirmation dialog
- ❌ Child-facing buttons (Mark Started, I'm Done) in parent view
