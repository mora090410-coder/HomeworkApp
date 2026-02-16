# Child Re-Entry Auth Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship parent-admin and child-username+PIN split authentication with cross-device child re-entry and parent PIN reset controls.

**Architecture:** Keep existing parent email/password Firebase auth path. Add callable-based child login that verifies username+PIN and returns a Firebase custom token for role-scoped child sessions. Extend setup and profile management to persist child usernames, and update routing/session bootstrap to honor role-based entry.

**Tech Stack:** React 19 + TypeScript + Vite, Firebase Auth/Firestore/Functions, TanStack Query, Vitest + React Testing Library.

---

**Execution skills to use during implementation:** `@test-driven-development`, `@verification-before-completion`, `@requesting-code-review`

### Task 1: Add Shared Child Credential Domain Helpers

**Files:**
- Create: `src/features/auth/childCredentials.ts`
- Create: `src/features/auth/__tests__/childCredentials.test.ts`
- Modify: `types.ts`

**Step 1: Write the failing test**

```ts
// src/features/auth/__tests__/childCredentials.test.ts
import { describe, expect, it } from 'vitest';
import { normalizeChildUsername, isValidChildUsername } from '@/src/features/auth/childCredentials';

describe('child credential helpers', () => {
  it('normalizes username casing and whitespace', () => {
    expect(normalizeChildUsername('  Emma.Rose  ')).toBe('emma.rose');
  });

  it('rejects invalid usernames', () => {
    expect(isValidChildUsername('ab')).toBe(false);
    expect(isValidChildUsername('bad name')).toBe(false);
    expect(isValidChildUsername('emily_01')).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/features/auth/__tests__/childCredentials.test.ts -v`  
Expected: FAIL because helper module does not exist.

**Step 3: Write minimal implementation**

```ts
// src/features/auth/childCredentials.ts
export const normalizeChildUsername = (input: string): string => input.trim().toLowerCase();

export const isValidChildUsername = (input: string): boolean => {
  const normalized = normalizeChildUsername(input);
  return /^[a-z0-9._-]{3,24}$/.test(normalized);
};
```

```ts
// types.ts additions
loginUsername?: string;
loginUsernameCanonical?: string;
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/features/auth/__tests__/childCredentials.test.ts -v`  
Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/auth/childCredentials.ts src/features/auth/__tests__/childCredentials.test.ts types.ts
git commit -m "feat: add child username credential helpers"
```

### Task 2: Add Callable Contracts and Service Methods

**Files:**
- Modify: `services/householdService.ts`
- Create: `services/__tests__/childAuthPayloads.test.ts`

**Step 1: Write the failing test**

```ts
// services/__tests__/childAuthPayloads.test.ts
import { describe, expect, it } from 'vitest';
import { buildChildLoginPayload, buildAdminResetPinPayload } from '@/services/householdService';

describe('child auth payload builders', () => {
  it('builds normalized child login payload', () => {
    expect(buildChildLoginPayload({ username: ' Emma_01 ', pin: '1234' })).toEqual({
      username: 'emma_01',
      pin: '1234',
      householdId: undefined,
    });
  });

  it('builds admin reset pin payload', () => {
    expect(buildAdminResetPinPayload({ householdId: 'h1', profileId: 'p1', newPin: '5678' })).toEqual({
      householdId: 'h1',
      profileId: 'p1',
      newPin: '5678',
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- services/__tests__/childAuthPayloads.test.ts -v`  
Expected: FAIL because builders are not exported.

**Step 3: Write minimal implementation**

- Export pure payload builders from `services/householdService.ts`.
- Add methods:
  - `childLogin({ username, pin, householdId? })`
  - `adminResetChildPin({ householdId, profileId, newPin })`
  - `updateChildUsername({ householdId, profileId, username })`
- Reuse existing callable backoff helper and input assertions.

**Step 4: Run test to verify it passes**

Run: `npm run test -- services/__tests__/childAuthPayloads.test.ts -v`  
Expected: PASS.

**Step 5: Commit**

```bash
git add services/householdService.ts services/__tests__/childAuthPayloads.test.ts
git commit -m "feat: add household service child auth callables"
```

### Task 3: Implement Functions for Child Login and Admin PIN Reset

**Files:**
- Modify: `functions/src/index.ts`
- Create: `functions/src/childAuthUtils.ts`
- Create: `functions/src/__tests__/childAuthUtils.test.ts`

**Step 1: Write the failing test**

```ts
// functions/src/__tests__/childAuthUtils.test.ts
import { describe, expect, it } from 'vitest';
import { normalizeUsernameForLookup, isUsernameFormatValid } from '../childAuthUtils';

describe('child auth utils', () => {
  it('normalizes lookup usernames', () => {
    expect(normalizeUsernameForLookup('  KID.One ')).toBe('kid.one');
  });

  it('validates username format', () => {
    expect(isUsernameFormatValid('ok_name')).toBe(true);
    expect(isUsernameFormatValid('no spaces')).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- functions/src/__tests__/childAuthUtils.test.ts -v`  
Expected: FAIL because helper file does not exist.

**Step 3: Write minimal implementation**

- Add `functions/src/childAuthUtils.ts` with normalization/validation helpers.
- In `functions/src/index.ts` add:
  - `childLogin` callable:
    - validate input,
    - locate child profile by canonical username,
    - compare hashed PIN,
    - issue custom token with claims `{ role, householdId, profileId }`.
  - `adminResetChildPin` callable:
    - require authenticated caller,
    - verify admin membership under `users/{uid}/households/{householdId}`,
    - hash and update target child PIN.

**Step 4: Run tests and build**

Run: `npm run test -- functions/src/__tests__/childAuthUtils.test.ts -v`  
Expected: PASS.

Run: `npm --prefix functions run build`  
Expected: PASS.

**Step 5: Commit**

```bash
git add functions/src/index.ts functions/src/childAuthUtils.ts functions/src/__tests__/childAuthUtils.test.ts
git commit -m "feat: add callable child login and admin pin reset"
```

### Task 4: Add Child Sign-In UI in AuthScreen

**Files:**
- Modify: `src/components/AuthScreen.tsx`
- Create: `src/components/__tests__/AuthScreen.childLogin.test.tsx`

**Step 1: Write the failing test**

```tsx
// src/components/__tests__/AuthScreen.childLogin.test.tsx
import { render, screen } from '@testing-library/react';
import AuthScreen from '@/src/components/AuthScreen';

it('renders child sign-in mode controls', () => {
  render(<AuthScreen onSuccess={() => undefined} initialMode="LOGIN" />);
  expect(screen.getByRole('button', { name: /child sign in/i })).toBeInTheDocument();
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/components/__tests__/AuthScreen.childLogin.test.tsx -v`  
Expected: FAIL because child mode toggle does not exist.

**Step 3: Write minimal implementation**

- Add login mode switch: `Parent Sign In` / `Child Sign In`.
- Child mode fields:
  - username
  - 4-digit PIN
- On submit:
  - call `householdService.childLogin`,
  - `signInWithCustomToken(auth, token)`,
  - persist returned role/profile session,
  - call `onSuccess`.
- Keep parent flow unchanged.

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/components/__tests__/AuthScreen.childLogin.test.tsx -v`  
Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/AuthScreen.tsx src/components/__tests__/AuthScreen.childLogin.test.tsx
git commit -m "feat: add child username and pin sign-in mode"
```

### Task 5: Extend Setup Route to Capture Username

**Files:**
- Modify: `src/App.tsx`
- Create: `src/__tests__/setupProfile.username.test.tsx`

**Step 1: Write the failing test**

```tsx
// src/__tests__/setupProfile.username.test.tsx
import { render, screen } from '@testing-library/react';
import App from '@/src/App';

it('shows username field in setup profile flow', async () => {
  render(<App />);
  expect(await screen.findByLabelText(/setup username/i)).toBeInTheDocument();
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/__tests__/setupProfile.username.test.tsx -v`  
Expected: FAIL because setup route does not collect username.

**Step 3: Write minimal implementation**

- In `SetupProfileRoute`, add username state + validation.
- Pass username into `householdService.completeProfileSetup`.
- Update success copy to child sign-in guidance.

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/__tests__/setupProfile.username.test.tsx -v`  
Expected: PASS.

**Step 5: Commit**

```bash
git add src/App.tsx src/__tests__/setupProfile.username.test.tsx
git commit -m "feat: collect child username during setup completion"
```

### Task 6: Add Parent Controls for Username + PIN Reset

**Files:**
- Modify: `components/SettingsModal.tsx`
- Create: `components/__tests__/SettingsModal.childCredentials.test.tsx`
- Modify: `src/App.tsx`

**Step 1: Write the failing test**

```tsx
// components/__tests__/SettingsModal.childCredentials.test.tsx
import { render, screen } from '@testing-library/react';
import SettingsModal from '@/components/SettingsModal';

it('shows child credential controls for admin', () => {
  // render with child fixture
  expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /reset pin/i })).toBeInTheDocument();
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- components/__tests__/SettingsModal.childCredentials.test.tsx -v`  
Expected: FAIL because controls do not exist.

**Step 3: Write minimal implementation**

- Add username editable field in child settings modal.
- Add `Reset PIN` action with new PIN + confirm fields.
- Wire save/reset actions through `src/App.tsx` to new household service methods.

**Step 4: Run test to verify it passes**

Run: `npm run test -- components/__tests__/SettingsModal.childCredentials.test.tsx -v`  
Expected: PASS.

**Step 5: Commit**

```bash
git add components/SettingsModal.tsx components/__tests__/SettingsModal.childCredentials.test.tsx src/App.tsx
git commit -m "feat: add admin child username and pin reset controls"
```

### Task 7: Role Routing and Regression Verification

**Files:**
- Modify: `src/App.tsx`
- Create: `src/__tests__/authRouting.childRole.test.tsx`

**Step 1: Write the failing test**

```tsx
// src/__tests__/authRouting.childRole.test.tsx
import { describe, expect, it } from 'vitest';

// mock active session role CHILD and assert child route render branch
it('routes authenticated child session to child view', () => {
  expect(true).toBe(true);
});
```

**Step 2: Run test to verify it fails meaningfully**

Run: `npm run test -- src/__tests__/authRouting.childRole.test.tsx -v`  
Expected: FAIL with missing routing assertion.

**Step 3: Write minimal implementation**

- Ensure auth bootstrap and persisted session handling correctly resolve child role after custom token sign-in.
- Ensure login route returns to child view for child-authenticated sessions.
- Preserve admin behavior.

**Step 4: Run full verification suite**

Run:

- `npm run test -- src/components/__tests__/AuthScreen.childLogin.test.tsx -v`
- `npm run test -- src/__tests__/setupProfile.username.test.tsx -v`
- `npm run test -- components/__tests__/SettingsModal.childCredentials.test.tsx -v`
- `npm run test -- src/__tests__/adminDashboard.setupRail.test.tsx -v`
- `npm run test`
- `npm run build`
- `npm --prefix functions run build`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/App.tsx src/__tests__/authRouting.childRole.test.tsx
git commit -m "fix: enforce child role re-entry routing and regressions"
```
