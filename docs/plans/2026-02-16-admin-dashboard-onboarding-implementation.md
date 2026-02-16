# Admin Dashboard Onboarding Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship a production-ready admin first-run onboarding experience with a 3-step Add Child flow, no admin PIN entry, and finish-now/invite-later behavior.

**Architecture:** Keep the existing `DashboardPage` route and modal flow, but move onboarding rules into small pure helper modules for testability. Add an explicit setup lifecycle (`PROFILE_CREATED`, `INVITE_SENT`, `SETUP_COMPLETE`) in profile data, then surface it in dashboard UI via a setup rail and child-card badges. Use child-only `/setup-profile/:id` writes to own PIN and complete setup.

**Tech Stack:** React 19 + TypeScript, Vite, Tailwind CSS, Firebase Firestore, TanStack Query, Vitest + React Testing Library.

---

**Execution skills to use during implementation:** `@test-driven-development`, `@verification-before-completion`, `@requesting-code-review`

### Task 1: Add Test Harness (Vitest + RTL)

**Files:**
- Create: `vitest.setup.ts`
- Modify: `package.json`
- Modify: `vite.config.ts`
- Create: `src/features/onboarding/__tests__/smoke.test.ts`

**Step 1: Write the failing test**

```ts
// src/features/onboarding/__tests__/smoke.test.ts
import { describe, expect, it } from 'vitest';

describe('test harness smoke', () => {
  it('runs test files', () => {
    expect(true).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/features/onboarding/__tests__/smoke.test.ts -v`  
Expected: FAIL with missing `test` script and/or Vitest dependency.

**Step 3: Write minimal implementation**

```json
// package.json (scripts + devDependencies)
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

```ts
// vite.config.ts (add test block inside returned config)
test: {
  environment: 'jsdom',
  setupFiles: './vitest.setup.ts',
  globals: true,
},
```

```ts
// vitest.setup.ts
import '@testing-library/jest-dom';
```

Install: `npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom`

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/features/onboarding/__tests__/smoke.test.ts -v`  
Expected: PASS.

**Step 5: Commit**

```bash
git add package.json vite.config.ts vitest.setup.ts src/features/onboarding/__tests__/smoke.test.ts
git commit -m "test: add vitest and testing-library harness"
```

### Task 2: Remove PIN From Admin Add Child Modal

**Files:**
- Modify: `components/AddChildModal.tsx`
- Create: `components/__tests__/AddChildModal.onboarding.test.tsx`

**Step 1: Write the failing test**

```tsx
// components/__tests__/AddChildModal.onboarding.test.tsx
import { render, screen } from '@testing-library/react';
import AddChildModal from '@/components/AddChildModal';

it('does not render PIN field in admin onboarding step 1', () => {
  render(<AddChildModal isOpen onClose={() => undefined} onAdd={() => undefined} />);
  expect(screen.queryByText(/PIN/i)).not.toBeInTheDocument();
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- components/__tests__/AddChildModal.onboarding.test.tsx -v`  
Expected: FAIL because `PIN (Optional)` currently renders.

**Step 3: Write minimal implementation**

```ts
// components/AddChildModal.tsx (NewChildData)
export interface NewChildData {
  name: string;
  gradeLevel: string;
  subjects: { name: string; grade: Grade }[];
}
```

```tsx
// components/AddChildModal.tsx (remove state + UI)
// delete: const [pin, setPin] = useState('');
// delete: PIN input block
// update isValidStep1 to only validate name + gradeLevel
```

```tsx
// components/AddChildModal.tsx (step 3 summary copy)
<div className="flex justify-between px-4 py-3 border-b border-white/[0.04]">
  <span className="text-[#888]">Profile Security</span>
  <span className="text-white font-medium">Child sets PIN via invite</span>
</div>
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- components/__tests__/AddChildModal.onboarding.test.tsx -v`  
Expected: PASS.

**Step 5: Commit**

```bash
git add components/AddChildModal.tsx components/__tests__/AddChildModal.onboarding.test.tsx
git commit -m "feat: remove admin PIN field from add child onboarding"
```

### Task 3: Add Setup Lifecycle Domain Helpers and Types

**Files:**
- Modify: `types.ts`
- Create: `src/features/onboarding/setupLifecycle.ts`
- Create: `src/features/onboarding/__tests__/setupLifecycle.test.ts`

**Step 1: Write the failing test**

```ts
// src/features/onboarding/__tests__/setupLifecycle.test.ts
import { describe, expect, it } from 'vitest';
import { markInviteSent, markSetupComplete } from '@/src/features/onboarding/setupLifecycle';

describe('setup lifecycle', () => {
  it('transitions to INVITE_SENT when invite is generated', () => {
    const next = markInviteSent('PROFILE_CREATED', '2026-02-16T00:00:00.000Z');
    expect(next.setupStatus).toBe('INVITE_SENT');
    expect(next.inviteLastSentAt).toBeDefined();
  });

  it('transitions to SETUP_COMPLETE when child finishes setup', () => {
    const next = markSetupComplete('INVITE_SENT', '2026-02-16T00:00:00.000Z');
    expect(next.setupStatus).toBe('SETUP_COMPLETE');
    expect(next.setupCompletedAt).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/features/onboarding/__tests__/setupLifecycle.test.ts -v`  
Expected: FAIL because helper module does not exist.

**Step 3: Write minimal implementation**

```ts
// types.ts
export type ProfileSetupStatus = 'PROFILE_CREATED' | 'INVITE_SENT' | 'SETUP_COMPLETE';
```

```ts
// src/features/onboarding/setupLifecycle.ts
import { ProfileSetupStatus } from '@/types';

export const markInviteSent = (_current: ProfileSetupStatus, atIso: string) => ({
  setupStatus: 'INVITE_SENT' as const,
  inviteLastSentAt: atIso,
});

export const markSetupComplete = (_current: ProfileSetupStatus, atIso: string) => ({
  setupStatus: 'SETUP_COMPLETE' as const,
  setupCompletedAt: atIso,
});
```

```ts
// types.ts additions on Profile/Child
setupStatus?: ProfileSetupStatus;
inviteLastSentAt?: string;
setupCompletedAt?: string;
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/features/onboarding/__tests__/setupLifecycle.test.ts -v`  
Expected: PASS.

**Step 5: Commit**

```bash
git add types.ts src/features/onboarding/setupLifecycle.ts src/features/onboarding/__tests__/setupLifecycle.test.ts
git commit -m "feat: add profile setup lifecycle domain model"
```

### Task 4: Persist Setup Lifecycle in Firestore Service Paths

**Files:**
- Modify: `services/householdService.ts`
- Create: `services/__tests__/profileSetupPayloads.test.ts`

**Step 1: Write the failing test**

```ts
// services/__tests__/profileSetupPayloads.test.ts
import { describe, expect, it } from 'vitest';
import { createProfileWritePayload } from '@/services/householdService';

describe('profile write payloads', () => {
  it('defaults new child profiles to PROFILE_CREATED', () => {
    const payload = createProfileWritePayload({ householdId: 'h1', name: 'Emily' });
    expect(payload.setupStatus).toBe('PROFILE_CREATED');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- services/__tests__/profileSetupPayloads.test.ts -v`  
Expected: FAIL because `createProfileWritePayload` helper does not exist.

**Step 3: Write minimal implementation**

```ts
// services/householdService.ts (extract pure builder for testability)
export const createProfileWritePayload = (input: {
  householdId: string;
  name: string;
  avatarColor?: string;
}) => ({
  householdId: input.householdId,
  name: input.name,
  role: 'CHILD' as const,
  pinHash: '',
  avatarColor: input.avatarColor ?? '#3b82f6',
  gradeLevel: 'Unknown',
  subjects: [],
  rates: defaultRates(),
  balanceCents: 0,
  balance: 0,
  setupStatus: 'PROFILE_CREATED' as const,
  inviteLastSentAt: null,
  setupCompletedAt: null,
});
```

```ts
// services/householdService.ts integration points
// createChild/createProfile -> setupStatus: PROFILE_CREATED
// generateProfileSetupLink -> setupStatus: INVITE_SENT + inviteLastSentAt
// completeProfileSetup -> setupStatus: SETUP_COMPLETE + setupCompletedAt
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- services/__tests__/profileSetupPayloads.test.ts -v`  
Expected: PASS.

**Step 5: Commit**

```bash
git add services/householdService.ts services/__tests__/profileSetupPayloads.test.ts
git commit -m "feat: persist setup lifecycle states in household service"
```

### Task 5: Surface Setup Status and Invite Action in Child Cards

**Files:**
- Modify: `components/ChildCard.tsx`
- Create: `components/__tests__/ChildCard.setupStatus.test.tsx`
- Modify: `src/App.tsx`

**Step 1: Write the failing test**

```tsx
// components/__tests__/ChildCard.setupStatus.test.tsx
import { render, screen } from '@testing-library/react';
import ChildCard from '@/components/ChildCard';

it('shows setup pending badge for PROFILE_CREATED children', () => {
  render(<ChildCard {...makeProps({ child: makeChild({ setupStatus: 'PROFILE_CREATED' }) })} />);
  expect(screen.getByText('Setup Pending')).toBeInTheDocument();
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- components/__tests__/ChildCard.setupStatus.test.tsx -v`  
Expected: FAIL because no status badge currently renders.

**Step 3: Write minimal implementation**

```tsx
// components/ChildCard.tsx
const setupLabelMap = {
  PROFILE_CREATED: 'Setup Pending',
  INVITE_SENT: 'Invite Sent',
  SETUP_COMPLETE: 'Ready',
} as const;

{child.setupStatus && (
  <span className="px-2 py-1 rounded-full text-xs font-semibold border border-white/15 bg-white/5">
    {setupLabelMap[child.setupStatus]}
  </span>
)}
```

```tsx
// src/App.tsx
// pass child setup metadata through mapped children, and wire invite action from card
// onInviteChild(childId) -> householdService.generateProfileSetupLink(householdId, childId)
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- components/__tests__/ChildCard.setupStatus.test.tsx -v`  
Expected: PASS.

**Step 5: Commit**

```bash
git add components/ChildCard.tsx components/__tests__/ChildCard.setupStatus.test.tsx src/App.tsx
git commit -m "feat: add setup status badges and invite actions to child cards"
```

### Task 6: Build Dashboard Setup Rail for First-Run Admin Experience

**Files:**
- Create: `components/AdminSetupRail.tsx`
- Modify: `src/App.tsx`
- Create: `src/__tests__/adminDashboard.setupRail.test.tsx`

**Step 1: Write the failing test**

```tsx
// src/__tests__/adminDashboard.setupRail.test.tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '@/src/App';

it('shows 3-step setup rail for admin with zero children', () => {
  render(
    <MemoryRouter initialEntries={['/admin-dashboard']}>
      <App />
    </MemoryRouter>,
  );
  expect(screen.getByText(/Set up your first child in under 2 minutes/i)).toBeInTheDocument();
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/__tests__/adminDashboard.setupRail.test.tsx -v`  
Expected: FAIL because setup rail component/copy does not exist.

**Step 3: Write minimal implementation**

```tsx
// components/AdminSetupRail.tsx
export default function AdminSetupRail(props: {
  onStartAddChild: () => void;
  completedSteps: number;
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-6">
      <h2 className="text-xl font-semibold text-white">Set up your first child in under 2 minutes</h2>
      <p className="mt-2 text-sm text-gray-400">1 Basics · 2 Grades · 3 Review</p>
      <button type="button" onClick={props.onStartAddChild} className="mt-4 rounded-xl bg-[#b30000] px-5 py-3">
        Add First Child
      </button>
    </section>
  );
}
```

```tsx
// src/App.tsx
// in admin branch: render <AdminSetupRail /> when childrenWithRateMap.length === 0
// after first child creation: replace with compact banner and regular child grid
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/__tests__/adminDashboard.setupRail.test.tsx -v`  
Expected: PASS.

**Step 5: Commit**

```bash
git add components/AdminSetupRail.tsx src/App.tsx src/__tests__/adminDashboard.setupRail.test.tsx
git commit -m "feat: add first-run admin setup rail for onboarding"
```

### Task 7: Full Verification and Regression Gate

**Files:**
- Modify: `docs/plans/2026-02-16-admin-dashboard-onboarding-design.md` (if implementation notes differ)

**Step 1: Write failing verification checklist test (manual gate)**

```md
- [ ] Admin Add Child step 1 contains no PIN field
- [ ] Admin can finish onboarding without sending invite
- [ ] Child card shows Setup Pending after finish-now flow
- [ ] Invite action updates badge to Invite Sent
- [ ] /setup-profile/:id completion updates badge to Ready
```

**Step 2: Run checks and capture failures**

Run:
- `npm run test`
- `npm run build`

Expected: Any failure blocks merge.

**Step 3: Fix minimal regressions**

Apply only targeted fixes discovered in Step 2.

**Step 4: Re-run verification**

Run:
- `npm run test`
- `npm run build`

Expected: PASS for both commands.

**Step 5: Commit**

```bash
git add -A
git commit -m "chore: verify onboarding flow and regression gates"
```

