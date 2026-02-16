# Admin Dashboard Onboarding Design

**Date:** 2026-02-16  
**Owner:** Product + Engineering  
**Scope:** Post-signup Admin dashboard experience (`/admin-dashboard`) and first-child onboarding

---

## 1. Objective

Design a production-ready, enterprise-grade admin onboarding flow that gets a newly signed-up household admin from zero profiles to an operational Family Economy in minutes, while preserving strict role boundaries:

- Admin creates and manages child profiles.
- Child owns PIN creation and private setup on invite route.
- Dashboard remains the command center before, during, and after onboarding.

## 2. Current Context

Current behavior already includes:

- Admin dashboard action bar and child cards.
- Add Child multi-step modal.
- Child setup route at `/setup-profile/:id` for PIN + avatar.
- Invite link generation from admin actions.

Gap to close:

- First-run empty state does not guide setup as a clear, progressive system.
- Admin onboarding still surfaces optional PIN semantics that conflict with child-owned privacy model.
- Setup completion and invite status are not modeled as explicit lifecycle states in UX.

## 3. Product Decisions (Approved)

1. Primary post-signup action: **Add First Child**.
2. Onboarding pattern: **3-step setup** with progressive guidance.
3. Admin **does not set PIN**.
4. Step 3 supports **Finish Now, Invite Later**.
5. Invite remains available from dashboard/child card at any time.

## 4. Chosen UX Approach

### Recommendation

Use an **Inline Setup Rail** in the admin dashboard (recommended over hard wizard or static checklist).

Why:

- Preserves command-center context for power admins.
- Gives explicit progress and reduces first-run confusion.
- Supports pause/resume and mobile responsiveness.
- Avoids blocking users who prefer to finish setup later.

## 5. Information Architecture

### 5.1 Admin First-Run Dashboard

1. Header: HomeWork wordmark, `ADMIN` badge, `Profiles`, sign-out.
2. Primary region: `3-Step Setup Rail`.
3. Setup steps:
   - Step 1: Child Basics
   - Step 2: Current Grades
   - Step 3: Review & Finish
4. Context panel: “What unlocks next” summary (ledger, Sunday rates, assignment flow).
5. Existing global actions remain visible but non-primary.

### 5.2 After First Child Created

- Setup rail collapses to compact banner with status and quick actions.
- New child card appears immediately in grid.
- Badge communicates setup lifecycle state.

## 6. Step Flow Specification

### Step 1: Child Basics

- Fields: `Name`, `Grade Level`.
- Validation:
  - Name required, trimmed, min 2 chars.
  - Grade level required.
- CTA: `Next`.
- No PIN field shown.

### Step 2: Enter Current Grades

- Editable subject rows with grade selector.
- Add/remove subject row support.
- Live computed card: `Current Hourly Rate`.
- CTA: `Next`; secondary: `Back`.

### Step 3: Review & Finish

- Review summary:
  - Child name
  - Grade level
  - Subject count
  - Computed hourly rate
- Primary actions:
  - `Finish Now`
  - `Generate Invite Link` (optional in this step, not mandatory)
- Success behavior:
  - On `Finish Now`: create profile and return to dashboard with `Setup Pending` badge.
  - On invite generation: show copy/share affordance and mark status as `Invite Sent`.

## 7. Setup Lifecycle State Model

1. `PROFILE_CREATED`
   - Trigger: Admin finishes step 3 without invite.
   - UI badge: `Setup Pending`.
   - Allowed actions: Update Grades, Assign Task, Invite.

2. `INVITE_SENT`
   - Trigger: Admin generates setup link.
   - UI badge: `Invite Sent`.
   - Metadata: `inviteLastSentAt` timestamp.
   - Allowed actions: Copy, Regenerate.

3. `SETUP_COMPLETE`
   - Trigger: Child completes `/setup-profile/:id` (PIN + avatar stored).
   - UI badge: `Ready`.
   - Setup prompts removed from card.

## 8. Data & Backend Design Notes

### 8.1 Profile/Child Metadata

Add non-sensitive setup metadata at profile level:

- `setupStatus`: `PROFILE_CREATED | INVITE_SENT | SETUP_COMPLETE`
- `inviteLastSentAt` (nullable ISO timestamp)
- `setupCompletedAt` (nullable ISO timestamp)

### 8.2 Role and Privacy

- Admin creation endpoint writes profile identity and academic/ledger data only.
- PIN is written only by child-side setup completion endpoint.
- Firestore reads/writes continue using direct doc paths:
  - `households/{householdId}/profiles/{profileId}`

## 9. UI Behavior and Interaction Standards

- Primary CTA prominence:
  - `Add Child` / step CTA remains visually dominant.
- Disabled controls include explicit reason text/tooltips.
- Motion:
  - Step transition: 180-220ms ease-out.
  - Success pulse on child creation and invite generation.
- Accessibility:
  - Every control has accessible name.
  - Keyboard navigation for full stepper flow.
  - Touch targets >= 44px.
  - Color contrast at AA minimum.

## 10. Error Handling

- Inline validation for required fields in each step.
- Recoverable API errors shown as actionable messages (no silent failure).
- Invite generation fallback:
  - If link creation fails, keep profile creation intact and offer retry.
- Network retry policy follows service-level exponential backoff pattern.

## 11. Testing & Verification Strategy

### 11.1 Unit

- Step validation helpers (name/grade/subject checks).
- Hourly rate calculation in step 2.
- State badge mapping from `setupStatus`.

### 11.2 Integration (React)

- Full 3-step happy path with `Finish Now`.
- 3-step path with invite generation.
- No PIN field in admin onboarding UI.
- Child card appears with correct badge after completion.

### 11.3 End-to-End

- New admin signup -> `/admin-dashboard` -> complete first child setup.
- Invite later flow from child card.
- Child completes `/setup-profile/:id` and dashboard reflects `SETUP_COMPLETE`.

## 12. Out of Scope (This Design)

- Rebranding global typography system.
- New ledger math rules.
- Changes to Sunday 9:00 PM grade lock algorithm.

## 13. Success Metrics

- Time-to-first-child-created < 2 minutes median.
- Post-signup onboarding completion rate > 90%.
- Invite generation rate on first session increases vs baseline.
- Fewer support incidents related to PIN ownership confusion.

