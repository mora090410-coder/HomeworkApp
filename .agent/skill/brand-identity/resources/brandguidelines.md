HOMEWORK
Brand Identity & Design System

Version 2.0  —  The Crimson Standard
February 2026  |  Confidential

"The Family Economy. Redefined."
HomeWork is not a chore tracker. It is a friction-free operating system for the family economy—distilling the concepts of effort, value, and capital formation into an interface that requires zero cognitive load to understand.

01  Core Philosophy

The Subtractive Manifesto
We do not add features. We remove barriers to understanding. Every element must earn its place by contributing to the core "aha moment"—the instant a child realizes that effort creates visible, real capital. If it doesn't serve that moment, it is eliminated.

The Dual Emotional Promise
FOR THE PARENT
Relief. An automated, fair system running quietly in the background. No arguments about fairness. No manual tracking. The confidence of a structured economy, not a negotiation. FOR THE CHILD
Dignity. The agency of a real worker with a real rate. Visible progress in their Vault. The feeling that effort has tangible, immediate consequence. Capital they control.

Voice & Tone
HomeWork speaks as a quiet, competent partner. It never nags, cajoles, or celebrates excessively. It presents reality with beautiful precision.

What We Say
"Balance: $12.50"
"Claim your bounty."
"Build. Earn. Progress."
"Your contract is ready." What We Never Say
"Great job! 🎉"
"You owe chores."
"Don't forget!"
"Allowance time!"

02  Color System

The previous "Momentum" gradient (Catalyst Blue → Kinetic Orange) has been retired. It communicated the wrong product category—fintech utilities and delivery apps. The new "Crimson Standard" palette communicates what HomeWork actually is: earned authority, domestic warmth, and aspirational growth.

Primary Palette
THE IDENTITY COLORS

Crimson
# 8B1A1A Burgundy
# 6B0F0F Warm Cream
# F5F0E8 Charcoal
# 0F0F14

Secondary Palette
ACCENT & REWARD COLORS

Champagne Gold
# C9A84C Gold Light
# E2C97E Cream Mid
# EDE7D9 Charcoal Mid
# 1C1C24

Semantic Colors
SYSTEM STATES

Success
# 2D7D4F Destructive
# B03030 Neutral Mid
# 6B6B6B Neutral Light
# A0A0A0

The "Ascendant" Gradient
This gradient replaces the deprecated Momentum blend. It is used for the primary CTA button, progress rings, and reward moment animations. It communicates the arc from structure (Crimson/authority) to reward (Champagne Gold/aspiration).

Crimson  #8B1A1A   →   Champagne Gold  #C9A84C
The "Ascendant" Gradient  |  135° angle  |  CTA buttons, progress rings, reward states

Color Usage Rules
Token Value Usage
Crimson (#8B1A1A) Primary brand color Logo container, primary headings, CTA text, active nav states
Warm Cream (#F5F0E8) Background — light mode Page backgrounds, card fills, section backgrounds (NOT pure white)
Charcoal (#0F0F14) Background — dark mode Dark sections, premium CTAs, footer, pricing panels
Champagne Gold (#C9A84C) Accent & reward Section dividers, milestone markers, "earned" states, hover accents
Burgundy (#6B0F0F) Pressed/dark state Button press states, active card borders, focus rings
Gradient: Ascendant Primary action CTA buttons, progress rings, celebration animations only

03  Typography

Typography is unchanged from v1.0 in structure. The primary face remains SF Pro (system font on Apple, Helvetica Neue fallback for web). What changes is the application: type now lives on cream and charcoal backgrounds, not white and blue-gray.

Type Scale
Token Value Usage
H1 3rem / -0.02em / Heavy 800 Hero headlines, major section openers
H2 2.25rem / -0.015em / Bold 700 Section headings
H3 1.75rem / -0.01em / Bold 700 Card titles, subsection labels
H4 1.375rem / -0.005em / Medium 500 Feature labels, step titles
Body 1rem / 1.5 / Regular 400 Paragraph text, explanations
Small 0.875rem / 1.45 / Regular 400 Supporting text, metadata
Caption 0.75rem / 1.35 / Regular 400 Timestamps, fine print, labels
Label (Caps) 0.75rem / +0.08em tracked / Bold 700 ALL CAPS section category labels

Critical Type Rules
•  Financial figures ($12.50, $14.99) are always Hero—largest element on screen, Heavy weight.
•  Labels act as scaffolding—smaller, tracked, Neutral color. They frame data, never compete with it.
•  Never use pure black (#000000). Use Charcoal (#0F0F14) on light backgrounds only.
•  On dark (Charcoal) backgrounds: primary text is Warm Cream (#F5F0E8), secondary is Neutral Light.
•  Headline tracking: tighten to -0.02em on H1 for impact. Loosen Label caps to +0.08em for scan.

04  Design Tokens (v2.0)

The following tokens replace all v1.0 tokens. Update your tokens.json, Tailwind config, and CSS variables to match. The deprecated blue/orange gradient variables should be removed entirely.

Colors
Token Value Usage
--color-crimson #8B1A1A Primary brand color. CTA borders, logo, accents.
--color-burgundy #6B0F0F Pressed state for crimson elements.
--color-cream #F5F0E8 Light mode background. Replaces pure #FFFFFF.
--color-cream-mid #EDE7D9 Card backgrounds on cream. Subtle layering.
--color-charcoal #0F0F14 Dark mode background. Text on light.
--color-charcoal-mid #1C1C24 Dark card fills. Sections within dark bg.
--color-gold #C9A84C Champagne accent. Dividers, milestones, earned.
--color-gold-light #E2C97E Lighter gold. Hover states on gold elements.
--color-text-primary #0F0F14 Primary text on cream backgrounds.
--color-text-secondary #6B6B6B Supporting text. Replaces old neutral_text.
--color-text-cream #F5F0E8 Text on dark/charcoal backgrounds.
--color-success #2D7D4F Success states. Darker than v1 for contrast.
--color-destructive #B03030 Error/delete states.

Gradients
Token Value Usage
--gradient-ascendant linear-gradient(135deg, #8B1A1A, #C9A84C) CTA buttons, progress rings. Replaces Momentum.
--gradient-ascendant-hover linear-gradient(135deg, #6B0F0F, #E2C97E) Hover state of Ascendant gradient.
--gradient-dark-fade linear-gradient(180deg, #0F0F14, #1C1C24) Dark section backgrounds. Subtle depth.

UI & Spacing
Token Value Usage
--radius-card 12px Card border radius. Unchanged from v1.
--radius-button 9999px Pill-shaped CTA buttons.
--radius-chip 6px Small tag/chip elements.
--shadow-ambient 0 20px 40px -10px rgba(0,0,0,0.12) Card float shadow. Slightly stronger than v1.
--shadow-button 0 8px 24px -4px rgba(139,26,26,0.35) Crimson glow under CTA buttons.
--border-card 1px solid rgba(201,168,76,0.2) Subtle gold card borders on cream bg.
--border-card-dark 1px solid rgba(201,168,76,0.15) Gold borders on dark backgrounds.

05  Key Component Specs

Primary CTA Button
The CTA button is the single most important UI element. It must feel like a physical, pressable object—not a flat rectangle.

Token Value Usage
Background var(--gradient-ascendant) Crimson → Champagne Gold at 135°
Border Radius 9999px (pill) Never square, never rounded-lg. Always pill.
Padding 14px 32px Generous horizontal padding for presence.
Text White / SF Pro Bold / 1rem Never cream on gradient—use pure white.
Box Shadow var(--shadow-button) Crimson glow. Makes it float off the surface.
Hover State var(--gradient-ascendant-hover) Darker gradient + slightly larger shadow.
Active/Press scale(0.97) + darken Physical press feel. 150ms ease-out.

Cards
Token Value Usage
Background (light) var(--color-cream) or #FFFFFF Use cream-mid for nested cards.
Background (dark) var(--color-charcoal-mid) Cards within dark sections.
Border var(--border-card) Subtle gold border. 1px at 20% opacity.
Border Radius 12px Consistent with --radius-card.
Shadow var(--shadow-ambient) Large diffused float shadow.
Padding 24px–32px Generous interior breathing room.

Progress Ring (Child Vault)
The Luminary Ring is unchanged in behavior. The color changes from the Momentum gradient to the Ascendant gradient.
Token Value Usage
Active arc var(--gradient-ascendant) Crimson base → gold at completion
Track (empty) rgba(201,168,76,0.15) Barely-visible gold track
Glow box-shadow: 0 0 16px rgba(139,26,26,0.4) Crimson radiated glow at progress tip
Cap style round Rounded ends. No hard stops.

06  Landing Page — Immediate Changes

Based on the v1 build review, the following changes are required before launch. Ordered by priority.

P0 — Ship Today
Token Value Usage
Background: all white sections Replace #FFFFFF → #F5F0E8 (Warm Cream) White feels clinical. Cream feels domestic.
Background: dark sections Replace #1a2035 → #0F0F14 (Charcoal) Current dark blue reads as corporate/SaaS
CTA Button gradient Replace blue→orange → Ascendant (#8B1A1A→#C9A84C) This is the most visible wrong-brand signal
"THE FAMILY ECONOMY. REDEFINED." Color → #C9A84C (Gold). Remove blue tracking. Gold, not blue. This is a HomeWork line.
Step numbers 01/02/03 Replace blue/orange gradient → #8B1A1A (Crimson) Or solid Crimson. Either works. No blue.

P1 — Before Launch
Token Value Usage
Logo placement Move to nav top-left. Remove center halo glow. Hero logo with glow reads as loading screen.
Sticky nav Add: Logo left | Sign In (ghost) + Start Free Trial (crimson) right Parents who scroll need a re-entry CTA.
Hero dead space Collapse 200px gap between logo and headline. Quote → Headline → CTA as single tight block.
"THE FAMILY ECONOMY" subhead If kept, render in Gold small caps. Remove blue tracking. Naval: let the headline breathe.

P2 — Polish Pass
Token Value Usage
Section transitions Add cream-to-charcoal gradient bridge between halves Current jump is jarring. One narrative arc.
Agency/Worth/Growth cards Add gold left-border accent (4px, #C9A84C) No identity markers currently.
Testimonial attribution Verify or note as placeholder until real review Fictional quotes carry legal/trust risk.

07  Deprecated — Remove Immediately

The following v1.0 tokens and patterns are deprecated. They should not appear anywhere in the codebase after the v2.0 migration.

Token Value Usage
momentum_start: #3B82F6 DEPRECATED Catalyst Blue. Remove all references.
momentum_end: #F97316 DEPRECATED Kinetic Orange. Remove all references.
photon_white: #FFFFFF as bg DEPRECATED Use --color-cream (#F5F0E8) for bg surfaces.
vapor_grey: #F3F4F6 DEPRECATED Use --color-cream-mid (#EDE7D9) instead.
Blue accent text DEPRECATED Any blue used as accent → Gold (#C9A84C)
neutral_text: #6B7280 REPLACED Use --color-text-secondary (#6B6B6B)
Gradient: blue→orange on CTAs DEPRECATED Replace with Ascendant gradient.

The Crimson Standard
HomeWork v2.0 Brand Identity  |  February 2026
