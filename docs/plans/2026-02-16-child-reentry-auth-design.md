# Child Re-Entry Auth Design

**Date:** 2026-02-16  
**Owner:** Product + Engineering  
**Scope:** Child cross-device re-entry with parent-admin role separation

---

## 1. Objective

Implement a family-first authentication model where:

- Parent/Admin logs in with account credentials and manages household controls.
- Child logs in separately with parent-managed `username + 4-digit PIN`.
- Child login works on any device (phone, iPad, laptop) after initial setup.
- Parent can reset child PIN from admin dashboard.

## 2. Approved Product Decisions

1. Primary access model: each child has own device usage pattern.
2. Child credentials: parent-created username + PIN (no child email required).
3. Recovery: parent reset from admin dashboard.
4. Architecture: hybrid auth with server-issued child session token.

## 3. Chosen Architecture

### 3.1 Parent/Admin Path

- Keep existing Firebase email/password auth for parent/admin.
- Continue role-aware routing to admin dashboard.

### 3.2 Child Path

- Add dedicated child sign-in surface in login UI.
- Child submits `username + PIN`.
- Backend verifies profile credentials and returns Firebase custom token.
- Client signs in with custom token and routes directly to child view.

### 3.3 Role-Gated Entry

- `ADMIN` role enters admin dashboard.
- `CHILD` role enters child-only dashboard.

## 4. Data Model Changes

Add child login metadata on profile documents (`households/{householdId}/profiles/{profileId}`):

- `loginUsername`: parent-managed username.
- `loginUsernameCanonical`: normalized lowercase username for lookup.
- `pinHash`: existing PIN hash field (reused).

Keep setup lifecycle fields:

- `setupStatus`: `PROFILE_CREATED | INVITE_SENT | SETUP_COMPLETE`
- `inviteLastSentAt`
- `setupCompletedAt`

## 5. Backend Contract

### 5.1 `childLogin` Callable

Input:

- `username` (required)
- `pin` (required)
- `householdId` (optional hint)

Behavior:

- Resolve child profile by canonical username (household-scoped preferred; global fallback rejected on ambiguity).
- Validate `pinHash`.
- Issue Firebase custom token with claims:
  - `role: "CHILD"`
  - `householdId`
  - `profileId`
- Return `{ token, householdId, profileId, role }`.

Errors:

- Generic user-facing auth error: `Username or PIN is incorrect.`
- No username existence leakage.

### 5.2 `adminResetChildPin` Callable

Input:

- `householdId`
- `profileId`
- `newPin`

Behavior:

- Require authenticated caller.
- Validate caller has admin membership in household.
- Validate target profile role is `CHILD`.
- Update `pinHash`.

## 6. Setup Flow Changes

`/setup-profile/:id` completion adds username capture:

- Child sets avatar color.
- Child chooses username.
- Child creates and confirms PIN.
- Backend writes username + PIN hash + setup completion metadata atomically.

Success copy updates to clearly instruct child:

- "Use Child Sign In with your username and PIN on any device."

## 7. UX Flow

### 7.1 Login Screen

- Parent/Admin sign-in remains email/password.
- Child sign-in is separate mode:
  - Username input.
  - PIN keypad/secure field.

### 7.2 Child Re-entry

- Launch app -> Child Sign In -> username + PIN -> child view.
- No parent credential required on child device.

### 7.3 Parent Controls

From admin profile management:

- Edit child username.
- Reset child PIN.

## 8. Security and Reliability

- PIN stored as SHA-256 hash (current project pattern).
- Auth errors remain generic.
- Existing exponential backoff helper retained for callable requests.
- Input validation on both client and callable endpoints.

## 9. Backward Compatibility

Existing child profiles without username remain usable through profile picker path for now.

- Parent prompted to assign usernames to enable cross-device child login.
- No destructive migration required.

## 10. Testing Strategy

### 10.1 Backend

- `childLogin` success.
- `childLogin` invalid credentials.
- `childLogin` ambiguous username handling.
- `adminResetChildPin` admin permission enforcement.
- `adminResetChildPin` updates hash for child profile only.

### 10.2 Frontend

- Auth screen exposes child sign-in mode.
- Child login requests callable and signs in with custom token.
- Setup route requires valid username with PIN.
- Success copy reflects child sign-in instructions.

### 10.3 Regression

- Parent email login still routes to admin dashboard.
- Existing setup lifecycle behavior remains intact.

## 11. Rollout

1. Deploy cloud functions (`childLogin`, `adminResetChildPin`) first.
2. Deploy web app updates.
3. Manual verification on fresh child device and admin device.

## 12. Out of Scope (This Iteration)

- Child credential disable/lockout controls.
- Multi-factor or parental approval session handoff.
- Full migration script forcing usernames for all historical profiles.
