# MASTER_CONTRACT.md — HomeWork Codebase Source of Truth

> **Generated:** 2026-02-21  
> **Purpose:** Paste this document into every future AI prompt that touches shared code.  
> **Scope:** All TypeScript files under `src/`.

---

## SECTION 1: TYPE DEFINITIONS

### 1.1 Enums

#### `Grade` (enum)

- **DEFINED IN:** `src/types.ts:1-13`
- **USED IN:** `src/types.ts`, `src/constants.ts`, `src/utils.ts`, `src/utils/calculations.ts`, `src/services/householdService.ts`, `src/components/AddChildModal.tsx`, `src/components/UpdateGradesModal.tsx`, `src/components/SettingsModal.tsx`, `src/App.tsx`
- **VALUES:** `A+`, `A`, `A-`, `B+`, `B`, `B-`, `C+`, `C`, `C-`, `D`, `F`
- **NOTE:** This is the **letter-grade enum** (academic grades). See `gradeLevel` below for school year levels.

#### `TaskStatus` (union type)

- **DEFINED IN:** `src/types.ts:18-27`
- **VALUES:** `'DRAFT' | 'OPEN' | 'ASSIGNED' | 'PENDING_APPROVAL' | 'PENDING_PAYMENT' | 'PENDING_WITHDRAWAL' | 'PAID' | 'REJECTED' | 'DELETED'`
- **USED IN:** Every component and service that deals with tasks.
- **⚠ CONFLICT #2:** `parseTaskStatus()` in `src/utils.ts:39-54` only allows 7 of these 9 values, **missing `REJECTED` and `PENDING_WITHDRAWAL`**. It also does **not** recognize `IN_PROGRESS` which is used as a **UI-only local state** (never persisted to Firestore).

#### `Role` (union type)

- **DEFINED IN:** `src/types.ts:15`
- **VALUES:** `'CHILD' | 'ADMIN' | 'MEMBER'`

#### `ProfileSetupStatus` (union type)

- **DEFINED IN:** `src/types.ts:16`
- **VALUES:** `'PROFILE_CREATED' | 'INVITE_SENT' | 'SETUP_COMPLETE'`

#### `AdvanceCategory` (union type)

- **DEFINED IN:** `src/types.ts:85-91`
- **VALUES:** `'Food/Drinks' | 'Entertainment' | 'Clothes' | 'School Supplies' | 'Toys/Games' | 'Other'`

---

### 1.2 Interfaces & Types

#### `GradeConfig`

- **DEFINED IN:** `src/types.ts:29-32`
- **DEFINITION:**

  ```ts
  interface GradeConfig {
    grade: Grade;
    valueCents: number;
  }
  ```

- **USED IN:** `src/types.ts`, `src/utils.ts`, `src/services/householdService.ts`, `src/components/UpdateGradesModal.tsx`
- **⚠ CONFLICT #1:** `buildRateMapFromGradeConfigs()` in `src/utils.ts:130-137` accesses `config.ratePerHour` but `GradeConfig` only has `{ grade, valueCents }`. `ratePerHour` does NOT exist on this type.

#### `Household`

- **DEFINED IN:** `src/types.ts:34-37`
- **DEFINITION:**

  ```ts
  interface Household {
    id: string;
    name: string;
  }
  ```

- **USED IN:** `src/services/householdService.ts`, `src/App.tsx`

#### `Family` (type alias)

- **DEFINED IN:** `src/types.ts:39`
- **DEFINITION:** `type Family = Household;`
- **NOTE:** `Family` is a direct alias for `Household`. Never used independently.

#### `Subject`

- **DEFINED IN:** `src/types.ts:41-45`
- **DEFINITION:**

  ```ts
  interface Subject {
    id: string;
    name: string;
    grade: Grade;
  }
  ```

- **USED IN:** `src/types.ts`, `src/utils.ts`, `src/utils/calculations.ts`, `src/services/householdService.ts`, `src/components/AddChildModal.tsx`, `src/components/UpdateGradesModal.tsx`

#### `StandardTask`

- **DEFINED IN:** `src/types.ts:47-51`
- **DEFINITION:**

  ```ts
  interface StandardTask {
    id: string;
    name: string;
    baselineMinutes: number;
  }
  ```

- **USED IN:** `src/components/ChildDetail.tsx`

#### `Task`

- **DEFINED IN:** `src/types.ts:53-69`
- **DEFINITION:**

  ```ts
  interface Task {
    id: string;
    householdId: string;
    familyId?: string;
    name: string;
    baselineMinutes: number;
    status?: TaskStatus;
    rejectionComment?: string;
    assigneeId?: string | null;
    catalogItemId?: string | null;
    valueCents?: number;
    createdAt?: string;
    isRecurring?: boolean;
    multiplier?: number;     // 1.0 default
    bonusCents?: number;     // Extra manually added value
    emoji?: string;
  }
  ```

- **USED IN:** Every component and service.
- **NOTE:** `Task` ≠ `Chore`. `ChoreCatalogItem` is a **template**; `Task` is an **instance**.
- **AMOUNTS:** `valueCents` is stored in **cents** (integer). `multiplier` is a float (1.0 / 1.5 / 2.0).

#### `ChoreCatalogItem`

- **DEFINED IN:** `src/types.ts:71-83`
- **DEFINITION:**

  ```ts
  interface ChoreCatalogItem {
    id: string;
    householdId: string;
    familyId?: string;
    name: string;
    baselineMinutes: number;
    isRecurring?: boolean;
    multiplier?: number;     // 1.0 default
    valueCents?: number;
    createdAt?: string;
    updatedAt?: string;
    emoji?: string;
  }
  ```

- **USED IN:** `src/services/householdService.ts`, `src/components/CatalogManagerModal.tsx`, `src/App.tsx`

#### `Transaction`

- **DEFINED IN:** `src/types.ts:93-109`
- **DEFINITION:**

  ```ts
  interface Transaction {
    id: string;
    householdId: string;
    familyId?: string;
    date: string;
    amount: number;              // dollars (legacy, derived from amountCents)
    amountCents?: number;        // cents — source of truth
    memo: string;
    type: 'EARNING' | 'ADVANCE' | 'ADJUSTMENT' | 'WITHDRAWAL_REQUEST' | 'GOAL_ALLOCATION';
    status?: 'PENDING' | 'PAID' | 'REJECTED';
    category?: AdvanceCategory;
    profileId?: string;
    profileName?: string;
    taskId?: string;
    balanceAfter?: number;
    balanceAfterCents?: number;
  }
  ```

- **USED IN:** `src/utils.ts`, `src/utils/calculations.ts`, `src/services/householdService.ts`, `src/services/ledgerService.ts`, `src/components/ChildDetail.tsx`, `src/components/ChildDashboard.tsx`
- **AMOUNTS:** `amountCents` is the source of truth (integer cents). `amount` is a legacy dollars field derived from `amountCents`. `balanceAfterCents` / `balanceAfter` follow the same pattern.

#### `SavingsGoal`

- **DEFINED IN:** `src/types.ts:111-118`
- **DEFINITION:**

  ```ts
  interface SavingsGoal {
    id: string;
    name: string;
    targetAmountCents: number;
    currentAmountCents: number;
    status: 'ACTIVE' | 'CLAIMED';
    createdAt?: string;
  }
  ```

- **USED IN:** `src/types.ts`, `src/components/ChildDashboard.tsx`, `src/services/householdService.ts`

#### `Profile`

- **DEFINED IN:** `src/types.ts:120-140`
- **DEFINITION:**

  ```ts
  interface Profile {
    id: string;
    householdId: string;
    familyId?: string;
    name: string;
    role: Role;
    pinHash?: string;
    loginUsername?: string;
    loginUsernameCanonical?: string;
    avatarColor?: string;
    gradeLevel: string;
    subjects: Subject[];
    rates: Record<Grade, number>;
    currentHourlyRate: number;
    balance: number;
    balanceCents?: number;
    goals?: SavingsGoal[];
    setupStatus?: ProfileSetupStatus;
    inviteLastSentAt?: string | null;
    setupCompletedAt?: string | null;
  }
  ```

- **USED IN:** `src/App.tsx`, `src/services/householdService.ts`, `src/components/AuthScreen.tsx`, `src/components/PinModal.tsx`
- **AMOUNTS:** `balanceCents` is the source of truth. `balance` is derived (cents / 100). `rates` values are in **dollars** per hour per grade.

#### `Child`

- **DEFINED IN:** `src/types.ts:142-164`
- **DEFINITION:**

  ```ts
  interface Child {
    id: string;
    householdId: string;
    familyId?: string;
    name: string;
    avatarColor?: string;
    pin?: string;
    loginUsername?: string;
    loginUsernameCanonical?: string;
    gradeLevel: string;
    subjects: Subject[];
    balance: number;
    balanceCents?: number;
    history?: Transaction[];
    goals?: SavingsGoal[];
    customTasks: Task[];
    rates: Record<Grade, number>;
    currentHourlyRate: number;
    role: Role;
    setupStatus?: ProfileSetupStatus;
    inviteLastSentAt?: string | null;
    setupCompletedAt?: string | null;
  }
  ```

### 1.3 Key Q&A

| Question | Answer |
|---|---|
| **Is `Child` the same as `Profile`?** | **No.** `Child` extends `Profile` conceptually but adds `pin`, `history`, `customTasks`, and `avatarColor` differs. `Profile` is the Firestore-mapped type; `Child` is the UI-enriched type built by `getChildren()` which merges a profile + tasks + transactions. |
| **Is `Task` the same as `Chore`?** | **No.** `ChoreCatalogItem` is a **reusable template** in `chore_catalog`. `Task` is an **assigned instance** in `tasks` or `profiles/{id}/tasks`. |
| **Is `amount` stored in dollars or cents?** | Both. `amountCents` / `valueCents` / `balanceCents` / `bonusCents` are **cents** (integer). `amount` / `balance` are dollars (float). **`*Cents` fields are the source of truth.** |
| **Is `householdId` the same as `familyId`?** | **Yes, always.** `familyId` is a legacy alias. Every mapper sets `familyId = householdId`. `type Family = Household`. |
| **Are grade levels stored as strings, numbers, or enums?** | **Strings.** Free-form strings like `'5th Grade'`, `'Kindergarten'`, `'Adult'`, `'Unknown'`. Not the `Grade` enum (that's for letter grades A+…F). |

---

## SECTION 2: CONSTANTS & ENUMS

### 2.1 Task Statuses

#### Firestore Values (persisted)

```
DRAFT | OPEN | ASSIGNED | PENDING_APPROVAL | PENDING_PAYMENT | PENDING_WITHDRAWAL | PAID | REJECTED | DELETED
```

#### `parseTaskStatus()` Allowlist (`src/utils.ts:39-54`)

```
DRAFT | OPEN | ASSIGNED | PENDING_APPROVAL | PENDING_PAYMENT | PAID | DELETED
```

**⚠ Missing:** `REJECTED`, `PENDING_WITHDRAWAL`  
**Default fallback:** `'OPEN'`

#### UI-Only Local States

- `IN_PROGRESS` — Used in `ChildDetail.tsx` and `ChildDashboard.tsx` via `useState` for local UI state only. **Never persisted to Firestore.**

### 2.2 Firestore Collection Paths

| Path | Used In |
|---|---|
| `households` | `householdService.ts` |
| `households/{householdId}/profiles` | `householdService.ts` (via `getProfilesCollectionRef()`) |
| `households/{householdId}/profiles/{profileId}/tasks` | `householdService.ts`, `ChildDetail.tsx`, `ChildDashboard.tsx` |
| `households/{householdId}/profiles/{profileId}/transactions` | `householdService.ts`, `ledgerService.ts` |
| `households/{householdId}/tasks` | `householdService.ts` (via `getTasksCollectionRef()`) — root-level open/"unassigned" tasks |
| `households/{householdId}/transactions` | `householdService.ts` (via `getTransactionsCollectionRef()`) — legacy root transactions |
| `households/{householdId}/chore_catalog` | `householdService.ts` (via `getChoreCatalogCollectionRef()`) |
| `households/{householdId}/gradeConfigs` | `householdService.ts` (`getGradeConfigs` / `saveGradeConfigs`) |
| `households/{householdId}/notification_events/{eventId}` | `notificationService.ts` |
| `users/{userId}/households` | `householdService.ts` (membership lookup) |
| `invites` | `householdService.ts` (root-level collection) |

**Naming consistency:** All collection names use `snake_case` (`chore_catalog`, `notification_events`) or `camelCase` (`gradeConfigs`). No inconsistencies found with casing.

### 2.3 Multipliers

- Stored as `number` on `Task.multiplier` and `ChoreCatalogItem.multiplier`.
- Valid UI values: `1.0`, `1.5`, `2.0` (selected via button group in `AssignTaskModal.tsx`).
- Default: `1.0`.
- Compared as plain numbers (`=== 1.0`, `=== 1.5`, `=== 2.0`).

### 2.4 Grade Levels (School Year)

Free-form `string` values used in `AddChildModal.tsx` and `SettingsModal.tsx`:

```
Kindergarten | 1st Grade | 2nd Grade | 3rd Grade | 4th Grade | 5th Grade |
6th Grade | 7th Grade | 8th Grade | 9th Grade | 10th Grade | 11th Grade | 12th Grade
```

Additional values set programmatically: `'Adult'` (admin profiles), `'Unknown'` (fallback).

### 2.5 Rate Maps (`Record<Grade, number>`)

| Constant | File | Values (dollars/hr) |
|---|---|---|
| `GRADE_VALUES` | `src/constants.ts:5-17` | A+=5.00, A=4.75, A-=4.50, B+=4.25, B=4.00, B-=3.75, C+=3.50, C/C-/D/F=0.00 |
| `DEFAULT_RATES` | `src/constants.ts:19-31` | **Identical** to `GRADE_VALUES` — fully duplicate |

### 2.6 Other Magic Values

| Value | Location | Purpose |
|---|---|---|
| `'homework-active-profile'` | `householdService.ts:43`, `App.tsx:86` | localStorage key for persisted session |
| `24` (hours) | `householdService.ts:44` | Default invite/setup expiry |
| `10` | `householdService.ts:45` | Default activity feed limit |
| `3` | `householdService.ts:46` | Callable retry limit |
| `250` (ms) | `householdService.ts:47` | Backoff base for retries |
| `4` digits | Multiple | PIN length validation (`/^\d{4}$/`) |
| `3-24` chars | `childCredentials.ts:1` | Username length (`/^[a-z0-9._-]{3,24}$/`) |

---

## SECTION 3: UTILS FUNCTIONS

### `src/utils/calculations.ts`

| Function | Signature | Purpose | Used In |
|---|---|---|---|
| `roundToCents` | `(value: number) => number` | Round dollars to nearest cent integer | Internal only |
| `normalizeCents` | `(value: number) => number` | Sanitize non-finite to 0, then round | Internal + `ledgerService.ts` |
| `dollarsToCents` | `(amount: number) => number` | Convert dollars → cents | `householdService.ts`, `App.tsx`, `ledgerService.ts`, `TransactionModal.tsx` |
| `centsToDollars` | `(amountCents: number) => number` | Convert cents → dollars | `utils.ts`, `householdService.ts`, `PayNowModal.tsx`, `TransactionModal.tsx`, `ledgerService.ts` |
| `calculateHourlyRateFromGrades` | `(subjects: Subject[], rates: Record<Grade, number>) => number` | Sum per-subject dollar rates → single hourly rate | `utils.ts` (wrapper) |
| `calculateEffectiveHourlyRate` | `(amount: number, durationMinutes: number) => number` | Task effectiveness hourly rate | Not imported anywhere currently |
| `calculateTaskValueCents` | `(minutes: number, hourlyRateCents: number, multiplier?: number, bonusCents?: number) => number` | **Input:** all in cents. **Output:** cent | `ChildDetail.tsx` |
| `calculateTaskValue` | `(minutes: number, hourlyRate: number, multiplier?: number, bonusCents?: number) => number` | **Input:** hourlyRate in dollars. **Output:** dollars | `ChildDetail.tsx`, `ChildDashboard.tsx` |
| `getTransactionAmountCents` | `(transaction: Transaction) => number` | Normalize transaction to cents | Not imported anywhere currently |
| `formatCurrency` | `(amount: number) => string` | Format dollars to `$X.XX` | `AddChildModal.tsx`, `PayNowModal.tsx`, `TransactionModal.tsx`, `ChildDetail.tsx`, `ChildDashboard.tsx`, `App.tsx` |

### `src/utils.ts`

| Function | Signature | Purpose | Used In |
|---|---|---|---|
| `getNextGrade` | `(current: Grade) => Grade` | Cycle to next Grade enum value | Not imported anywhere |
| `getTaskIcon` | `(name: string) => string` | Emoji from task name keywords | Internal |
| `getTaskIconForTask` | `(task: Task) => string` | Emoji preferring `task.emoji` | `ChildDetail.tsx`, `ChildDashboard.tsx`, `App.tsx` |
| `parseTaskStatus` | `(value: unknown) => TaskStatus` | Safe parse to TaskStatus | `householdService.ts`, `utils.ts` (mapTask) |
| `mapTransaction` | `(transactionId, householdId, source) => Transaction` | Map Firestore doc → Transaction | `ChildDashboard.tsx`, `App.tsx` |
| `mapTask` | `(taskId, householdId, source) => Task` | Map Firestore doc → Task | `householdService.ts`, `App.tsx` |
| `buildRateMapFromGradeConfigs` | `(configs: GradeConfig[]) => Record<Grade, number>` | Convert GradeConfig[] → rate map | `App.tsx`, `UpdateGradesModal.tsx` |
| `calculateHourlyRate` | **(overloaded)** `(subjects, rates) => number` OR `(amount, durationMinutes) => number` | Wrapper with overloads | `ChildDetail.tsx`, `ChildDashboard.tsx`, `App.tsx` |
| `parseCurrencyInputToCents` | `(value: string) => number` | Parse `"$12.50"` → `1250` | `AddAdvanceModal.tsx` |

Re-exports from `./utils/calculations`: `roundToCents`, `normalizeCents`, `dollarsToCents`, `centsToDollars`, `calculateHourlyRateFromGrades`, `calculateEffectiveHourlyRate`, `calculateTaskValueCents`, `calculateTaskValue`, `getTransactionAmountCents`, `formatCurrency`.

### ⚠ Flagged Issues

1. **`calculateHourlyRate`** — The ONE canonical signature is the overloaded version in `src/utils.ts:143-154`. Overload 1: `(subjects: Subject[], rates: Record<Grade, number>) => number`. Overload 2: `(amount: number, durationMinutes: number) => number`. Implementation delegates to `calculateHourlyRateFromGrades` or inline math.

2. **`calculateTaskValueCents`** — Input: `hourlyRateCents` (cents), `minutes`, `multiplier`, `bonusCents`. Output: **cents**. Both input and output are cents.

3. **`buildRateMapFromGradeConfigs`** — **⚠ CONFLICT #1:** Accesses `config.ratePerHour` but `GradeConfig` only has `{ grade: Grade; valueCents: number }`. This will produce `undefined` values at runtime.

4. **`parseCurrencyInputToCents`** — Handles: strips non-numeric chars except `.`, parses as float, multiplies by 100. Handles `"$12.50"`, `"12.50"`, `"12"`, `""` (→ 0).

---

## SECTION 4: COMPONENT MAP

### `AuthScreen.tsx`

- **PURPOSE:** Firebase Auth sign-in / sign-up
- **PROPS:** `{ onAuthenticated: (user, household, profile) => void }`
- **LOCAL STATE:** email, password, isSignUp, error, loading
- **FIREBASE READS:** `households/{id}`, `users/{uid}/households`
- **FIREBASE WRITES:** Creates household & profile on first sign-up
- **PARENT:** `App.tsx`

### `ChildCard.tsx`

- **PURPOSE:** Summary card for a single child on the parent dashboard
- **PROPS:** `{ child: Child, onClick: () => void, isSelected: boolean }`
- **LOCAL STATE:** None
- **FIREBASE READS:** None (data passed via props)
- **FIREBASE WRITES:** None
- **PARENT:** `App.tsx` (DashboardPage)

### `ChildDetail.tsx`

- **PURPOSE:** Full detail view for a child (parent perspective) — Vault, Hustle, Audit Queue, Transaction History
- **PROPS:** `{ child, isParent, standardTasks?, availableTasks?, onUpdateGrades, onInviteChild, onEditSettings, onSubmitTask, onApproveTask, onApproveAndDeposit, onRejectTask, onPayTask, onClaimTask, onEditTask, onDeleteTask, onAddAdvance? }`
- **LOCAL STATE:** taskStates, showAdvanceModal, showCashModal, showBoostModal, advanceAmount, advanceCategory, advanceMemo, payNowTask, liveTransactions, confirmDeleteTask, expandedAudit
- **FIREBASE READS:** `households/{id}/profiles/{profileId}/transactions` (realtime via `onSnapshot`)
- **FIREBASE WRITES:** Via `updateTaskStatus()`, `ledgerService`
- **MODALS:** AddAdvanceModal, TransactionModal, PayNowModal
- **PARENT:** `App.tsx` (DashboardPage)

### `ChildDashboard.tsx`

- **PURPOSE:** Child-facing dashboard after child login — Vault, Bounties, Hustle
- **PROPS:** `{ child, availableTasks, householdId, onSubmitTask, onClaimTask, onSignOut }`
- **LOCAL STATE:** showWithdrawModal, withdrawAmount, showGoalModal, goals form state, liveTransactions, liveGoals
- **FIREBASE READS:** `households/{id}/profiles/{profileId}/transactions`, `profiles/{profileId}/goals`
- **FIREBASE WRITES:** Via `householdService` (withdrawals, goals)
- **PARENT:** `App.tsx`

### `AddChildModal.tsx`

- **PURPOSE:** 3-step wizard to add a new child profile
- **PROPS:** `{ isOpen, onClose, onAdd: (data: NewChildData) => void }`
- **LOCAL STATE:** step, name, gradeLevel, subjects
- **FIREBASE READS:** None
- **FIREBASE WRITES:** None (data returned to parent)
- **PARENT:** `App.tsx`

### `AssignTaskModal.tsx`

- **PURPOSE:** Create or edit a task assignment
- **PROPS:** `{ isOpen, onClose, onAssign, child, standardTasks, catalogItems, editTask?, onEditCatalogItem?, onDeleteCatalogItem? }`
- **LOCAL STATE:** taskName, baselineMinutes, multiplier, saveToCatalog, selectedCatalogItem, emoji, bonusCents
- **FIREBASE READS:** None
- **FIREBASE WRITES:** None (data returned to parent)
- **PARENT:** `App.tsx` (DashboardPage)

### `CatalogManagerModal.tsx`

- **PURPOSE:** CRUD for chore catalog items (templates)
- **PROPS:** `{ isOpen, onClose, catalogItems, onEditItem, onDeleteItem }`
- **LOCAL STATE:** editingItem, editName, editMinutes
- **FIREBASE READS:** None
- **FIREBASE WRITES:** None (delegates to parent)
- **PARENT:** `App.tsx` (DashboardPage)

### `UpdateGradesModal.tsx`

- **PURPOSE:** Update grade configs and per-child subject grades
- **PROPS:** `{ isOpen, onClose, child, householdId, gradeConfigs, onSave }`
- **LOCAL STATE:** subjects, configs (grade rate editing)
- **FIREBASE READS:** None
- **FIREBASE WRITES:** None (delegates to parent)
- **PARENT:** `App.tsx` (DashboardPage)

### `AddAdvanceModal.tsx`

- **PURPOSE:** Issue an advance (deduction) to a child
- **PROPS:** `{ isOpen, onClose, child, onSubmit }`
- **LOCAL STATE:** amount, category, memo
- **FIREBASE READS:** None
- **FIREBASE WRITES:** None (delegates to parent)
- **PARENT:** `ChildDetail.tsx`

### `TransactionModal.tsx`

- **PURPOSE:** Record cash payment for a task
- **PROPS:** `{ isOpen, onClose, type, child, onSubmit }`
- **LOCAL STATE:** amount, memo
- **FIREBASE READS:** None
- **FIREBASE WRITES:** None (delegates to parent)
- **PARENT:** `ChildDetail.tsx`

### `PayNowModal.tsx`

- **PURPOSE:** Payment method selector (Deposit vs Cash)
- **PROPS:** `{ isOpen, onClose, task, childName, onDeposit, onCash }`
- **LOCAL STATE:** None
- **FIREBASE READS:** None
- **FIREBASE WRITES:** None
- **PARENT:** `ChildDetail.tsx`

### `SettingsModal.tsx`

- **PURPOSE:** Edit child profile (name, username, grade level, PIN reset, delete)
- **PROPS:** `{ isOpen, onClose, child, onSave, onResetPin?, onDelete, onImportAll?, onResetAll? }`
- **LOCAL STATE:** activeTab, name, username, gradeLevel, showDeleteConfirm, resetPinValue
- **FIREBASE READS:** None
- **FIREBASE WRITES:** None (delegates to parent)
- **PARENT:** `App.tsx`

### `PinModal.tsx`

- **PURPOSE:** PIN entry for profile switching / child auth
- **PROPS:** `{ isOpen, onClose, onSubmit, profile, householdId, onSetupPin? }`
- **LOCAL STATE:** pin, isVerifying, error
- **FIREBASE READS:** None
- **FIREBASE WRITES:** Via `verifyProfilePin`
- **PARENT:** `App.tsx`

### `OpenTaskCard.tsx`

- **PURPOSE:** Card for unassigned "bounty" tasks
- **PROPS:** `{ task, children, onAssign, householdId }`
- **LOCAL STATE:** selectedChild, showAssignPrompt
- **FIREBASE READS:** None
- **FIREBASE WRITES:** None
- **PARENT:** `App.tsx` (DashboardPage)

### `FamilyActivityFeed.tsx`

- **PURPOSE:** Recent household activity log
- **PROPS:** `{ familyId: string }`
- **LOCAL STATE:** None (uses React Query)
- **FIREBASE READS:** Via `householdService.getHouseholdActivity(familyId)`
- **FIREBASE WRITES:** None
- **PARENT:** `App.tsx`

### `AdminSetupRail.tsx`

- **PURPOSE:** Onboarding stepper for new admin users
- **PROPS:** `{ children, householdId, onAddChild, onCreateTask }`
- **LOCAL STATE:** None
- **FIREBASE READS:** None
- **FIREBASE WRITES:** None
- **PARENT:** `App.tsx`

### `LandingPage.tsx`

- **PURPOSE:** Marketing/intro page before auth
- **PROPS:** `{ onGetStarted: () => void }`
- **PARENT:** `App.tsx`

### `IntroScreen.tsx`

- **PURPOSE:** Animated intro/splash screen
- **PARENT:** `App.tsx`

### `Modal.tsx`

- **PURPOSE:** Generic reusable modal wrapper
- **PROPS:** `{ isOpen, onClose, children, title? }`
- **PARENT:** Various components

### `ErrorBoundary.tsx`

- **PURPOSE:** React error boundary
- **PARENT:** `App.tsx`

### `ThemeSwitch.tsx` / `ThemeToggle.tsx`

- **PURPOSE:** Light/dark mode toggle buttons
- **PARENT:** `App.tsx`

### `SyncModal.tsx`

- **PURPOSE:** Data sync status modal
- **PARENT:** `App.tsx`

---

## SECTION 5: FIREBASE SCHEMA

```
households/{householdId}
  ├─ name: string
  ├─ ownerUserId: string
  ├─ createdAt: Timestamp
  ├─ updatedAt: Timestamp
  │
  ├─ profiles/{profileId}
  │   ├─ householdId: string
  │   ├─ name: string
  │   ├─ role: 'ADMIN' | 'CHILD' | 'MEMBER'
  │   ├─ pinHash: string
  │   ├─ loginUsername?: string
  │   ├─ loginUsernameCanonical?: string
  │   ├─ avatarColor?: string
  │   ├─ gradeLevel: string
  │   ├─ subjects: Subject[]
  │   ├─ rates: Record<Grade, number>  (dollars per hour)
  │   ├─ currentHourlyRate: number     (dollars)
  │   ├─ balanceCents: number          (cents — source of truth)
  │   ├─ balance: number               (dollars — derived)
  │   ├─ goals?: SavingsGoal[]
  │   ├─ setupStatus: ProfileSetupStatus
  │   ├─ inviteLastSentAt: Timestamp | null
  │   ├─ setupCompletedAt: Timestamp | null
  │   ├─ fcmTokens?: string[]
  │   ├─ fcmTokenUpdatedAt?: Timestamp
  │   │
  │   ├─ tasks/{taskId}
  │   │   ├─ householdId: string
  │   │   ├─ name: string
  │   │   ├─ baselineMinutes: number
  │   │   ├─ status: TaskStatus
  │   │   ├─ assigneeId: string
  │   │   ├─ catalogItemId?: string
  │   │   ├─ valueCents?: number       (cents)
  │   │   ├─ multiplier: number        (1.0 / 1.5 / 2.0)
  │   │   ├─ bonusCents: number        (cents)
  │   │   ├─ emoji?: string
  │   │   ├─ rejectionComment?: string
  │   │   ├─ isRecurring?: boolean
  │   │   └─ createdAt: Timestamp | string
  │   │
  │   └─ transactions/{transactionId}
  │       ├─ householdId: string
  │       ├─ profileId: string
  │       ├─ profileName?: string
  │       ├─ amountCents: number       (cents — source of truth)
  │       ├─ amount?: number           (dollars — legacy)
  │       ├─ memo: string
  │       ├─ type: 'EARNING' | 'ADVANCE' | 'ADJUSTMENT' | 'WITHDRAWAL_REQUEST' | 'GOAL_ALLOCATION'
  │       ├─ status?: 'PENDING' | 'PAID' | 'REJECTED'
  │       ├─ category?: AdvanceCategory
  │       ├─ taskId?: string
  │       ├─ goalId?: string
  │       ├─ balanceAfterCents: number
  │       ├─ balanceAfter?: number
  │       ├─ date: Timestamp
  │       └─ createdAt: Timestamp
  │
  ├─ tasks/{taskId}                     (root-level, unassigned/open tasks)
  │   └─ (same shape as profile tasks above)
  │
  ├─ transactions/{transactionId}       (legacy root-level transactions)
  │   └─ (same shape as profile transactions above)
  │
  ├─ chore_catalog/{choreId}
  │   ├─ name: string
  │   ├─ baselineMinutes: number
  │   ├─ isRecurring?: boolean
  │   ├─ multiplier?: number
  │   ├─ valueCents?: number
  │   ├─ createdAt: Timestamp
  │   └─ updatedAt: Timestamp
  │
  ├─ gradeConfigs/{grade}               (one doc per Grade enum value)
  │   └─ valueCents: number             (cents per hour for that grade)
  │
  └─ notification_events/{eventId}
      ├─ type: 'TASK_ASSIGNED' | 'TASK_PENDING_APPROVAL' | 'TASK_PAID'
      ├─ householdId: string
      ├─ taskId: string
      ├─ targetProfileId?: string
      └─ createdAt: Timestamp

users/{userId}
  └─ households/{householdId}
      ├─ householdId: string
      ├─ role: Role
      ├─ profileId: string
      └─ updatedAt: Timestamp

invites/{inviteId}                      (root-level collection)
  ├─ token: string
  ├─ householdId: string
  ├─ role: 'ADMIN' | 'MEMBER'
  └─ createdAt: Timestamp
```

---

## SECTION 6: KNOWN CONFLICTS & FIXES

### CONFLICT 1: `buildRateMapFromGradeConfigs` accesses non-existent property ⚠ BUILD-BREAKING

- **Description:** `src/utils.ts:134` reads `config.ratePerHour` but `GradeConfig` is `{ grade: Grade; valueCents: number }`. There is no `ratePerHour` property. This produces `undefined` in the resulting map and will cause incorrect rate calculations at runtime.
- **Files affected:** `src/utils.ts`, `src/components/UpdateGradesModal.tsx`, `src/App.tsx`
- **Fix:** Change `config.ratePerHour` → `centsToDollars(config.valueCents)` (since `rates` are stored in dollars, we must convert from cents).

### CONFLICT 2: `parseTaskStatus` missing valid statuses ⚠ DATA-LOSS RISK

- **Description:** `src/utils.ts:39-54` does not include `'REJECTED'` or `'PENDING_WITHDRAWAL'` in its allowlist. Any task or transaction with status `REJECTED` will be silently downgraded to `'OPEN'` when mapTask() is called.
- **Files affected:** `src/utils.ts`, `src/services/householdService.ts` (mapTask uses parseTaskStatus)
- **Fix:** Add `'REJECTED'` and `'PENDING_WITHDRAWAL'` to the `supported` array.

### CONFLICT 3: Duplicate `mapTransaction` with divergent logic

- **Description:** `mapTransaction` exists in BOTH `src/utils.ts:66-104` AND `src/services/householdService.ts:520-560`. The `utils.ts` version accepts `WITHDRAWAL_REQUEST` and `GOAL_ALLOCATION` as valid `type` values (via passthrough). The `householdService.ts` version restricts `type` to only `'ADVANCE' | 'ADJUSTMENT' | 'EARNING'` — silently defaulting everything else to `'EARNING'`. This means `WITHDRAWAL_REQUEST` and `GOAL_ALLOCATION` transactions lose their type when loaded via the service's mapper.
- **Files affected:** `src/utils.ts`, `src/services/householdService.ts`
- **Fix:** Update `householdService.ts` mapTransaction to accept all 5 valid transaction types from the `Transaction` interface.

### CONFLICT 4: Duplicate `GRADE_VALUES` / `DEFAULT_RATES`

- **Description:** `src/constants.ts` defines both `GRADE_VALUES` and `DEFAULT_RATES` with identical values.
- **Impact:** Low (no bug, just DRY violation).
- **Fix:** Remove one; keep `DEFAULT_RATES` and alias `GRADE_VALUES = DEFAULT_RATES`.

### CONFLICT 5: `IN_PROGRESS` used in UI but not in `TaskStatus` type

- **Description:** Components use `'IN_PROGRESS'` as a local UI state but this value is not part of the `TaskStatus` union type, creating confusion about what states are valid.
- **Impact:** Low (intentionally local-only).
- **Recommendation:** Add a comment to the `TaskStatus` type documenting that `IN_PROGRESS` is UI-only.

### CONFLICT 6: Dual-currency fields on `Profile`

- **Description:** `Profile.balance` (dollars) and `Profile.balanceCents` (cents) both exist. Code sometimes reads `balance` and sometimes `balanceCents`.
- **Impact:** Medium. `balanceCents` is always set as source of truth by `mapProfile()`, and `balance` is derived. But both are on the interface, inviting confusion.
- **Recommendation:** Long-term, deprecate `balance` on the interface. Short-term, document which is canonical (already noted above).

---

## APPENDIX: SERVICE FUNCTION REFERENCE

### `householdService` (exported object — `src/services/householdService.ts`)

Key methods:

- `getCurrentHousehold(userId?)` → `Household | null`
- `createHouseholdForUser(userId, name, userName)` → `{ household, profile }`
- `getChildren(householdId)` → `Child[]`
- `getOpenTasks(householdId)` → `Task[]`
- `getDraftTasks(householdId)` → `Task[]`
- `getChoreCatalog(householdId)` → `ChoreCatalogItem[]`
- `createChild(householdId, child)` → `Child`
- `createProfile(householdId, payload)` → `Profile`
- `createTask(householdId, task, options?)` → `Task`
- `assignExistingTask(householdId, profileId, task)` → `void`
- `updateTaskById(taskId, updates, profileId?)` → `void`
- `deleteTaskById(taskId, profileId?)` → `void`
- `updateChildById(childId, updates)` → `void`
- `addEarning(profileId, taskId, amountCents, memo, householdId)` → `void`
- `addAdvance(profileId, amountCents, memo, category, householdId)` → `void`
- `rejectTask(householdId, taskId, comment, assigneeId)` → `void`
- `boostTask(householdId, taskId, bonusCentsDelta, assigneeId)` → `void`
- `updateTaskStatus(householdId, taskId, status, profileId?)` → `void`
- `getGradeConfigs(householdId)` → `GradeConfig[]`
- `saveGradeConfigs(householdId, configs)` → `void`
- `requestWithdrawal(profileId, amountCents, memo, householdId)` → `void`
- `transferToGoal(profileId, goalId, amountCents, householdId)` → `void`
- `addSavingsGoal(...)`, `updateSavingsGoal(...)`, `deleteSavingsGoal(...)`, `claimGoal(...)`
- `confirmWithdrawalPayout(profileId, transactionId, amountCents, householdId)` → `void`
- `childLogin(input)` → `ChildLoginResponse`
- `adminResetChildPin(input)` → `void`
- `generateProfileSetupLink(...)`, `validateProfileSetupLink(...)`, `completeProfileSetup(...)`

### Standalone exports from `householdService.ts`

- `updateTaskStatus(householdId, taskId, status, profileId?)` — re-export
- `verifyProfilePin(householdId, profileId, pin)` — re-export
- `setProfilePin(householdId, profileId, pin)` — re-export
- `saveGradeConfigs(householdId, configs)` — re-export
- `buildChildLoginPayload(input)`, `buildAdminResetPinPayload(input)`, `createProfileWritePayload(input)`

### `ledgerService` (exported object — `src/services/ledgerService.ts`)

- `recordTaskPayment(input: TaskPaymentInput)` → `LedgerMutationResult`
- `recordAdvance(input: AdvanceInput)` → `LedgerMutationResult`
- `recordManualAdjustment(input: AdjustmentInput)` → `LedgerMutationResult`
- `recordWithdrawalRequest(input)` → `LedgerMutationResult`
- `recordGoalAllocation(input)` → `LedgerMutationResult`
- `finalizeWithdrawal(input)` → `LedgerMutationResult`

### `notificationService` (exported object — `src/services/notificationService.ts`)

- `initializePushNotifications(householdId, profileId)` → `void`
- `notifyTaskAssigned(input)` → `void`
- `notifyTaskPendingApproval(input)` → `void`
- `notifyTaskPaid(input)` → `void`

---

*End of MASTER_CONTRACT.md*
