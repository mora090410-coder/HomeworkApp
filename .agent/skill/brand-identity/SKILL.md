---
name: brand-identity
description: Provides the single source of truth for HomeWork brand guidelines, design tokens, technology choices, and voice/tone.
---

# Brand Identity & Guidelines

**Brand Name:** HomeWork

**Brand Positioning:**
HomeWork is a family-first system that turns school performance into visible progress—helping parents reinforce work ethic, consistency, and earned rewards.

**Brand Attributes:**
*   Disciplined
*   Trustworthy
*   Encouraging
*   Structured
*   Premium-simple

## Reference Documentation

### Visual Design & UI Styling
*   **Colors & Typography:** [`resources/design-tokens.json`](resources/design-tokens.json)
*   **UI Rules & Patterns:** [`resources/ui-patterns.md`](resources/ui-patterns.md) (Buttons, Cards, Forms, Badges)

### Technical Implementation
*   **Tech Stack:** [`resources/tech-stack.md`](resources/tech-stack.md)

### Copywriting & Voice
*   **Voice & Tone:** [`resources/voice-tone.md`](resources/voice-tone.md)

## Quick Formula Summary
*   **Primary Identity:** Cardinal + Gold used with restraint.
*   **UI Foundation:** White space + neutral structure (light borders, clean cards).
*   **Typography:** Serif authority for headings; sans clarity for body.
*   **Tertiary Colors:** Charts and accents only.
*   **Accessibility:** Contrast-first decisions, always.

## Accessibility Checklist
*   [ ] Ensure all body text meets WCAG 2.1 AA contrast.
*   [ ] Do not use Gold text on White for normal text sizes.
*   [ ] Provide visible focus states for keyboard navigation (Gold focus ring recommended).
*   [ ] Links must be distinguishable from body text (color + underline on hover or always underlined).
*   [ ] Avoid placing body text over gradients; use overlays or solid scrims.
*   [ ] Disabled states: reduce opacity AND adjust color so contrast remains legible.
*   [ ] Use Light Gray #CCCCCC for borders/dividers on white surfaces.
*   [ ] Use Dark Gray #767676 for secondary text/icons on white; avoid it on black backgrounds unless contrast is verified.
