import { describe, expect, it } from 'vitest';
import { shouldBypassPinVerification } from '@/src/features/auth/sessionGate';

describe('session gate', () => {
  it('bypasses pin verification for persisted child login session', () => {
    expect(
      shouldBypassPinVerification({
        persistedRole: 'CHILD',
        persistedProfileId: 'child-1',
        activeProfileId: 'child-1',
      }),
    ).toBe(true);
  });

  it('does not bypass for non-child or mismatched profile', () => {
    expect(
      shouldBypassPinVerification({
        persistedRole: 'ADMIN',
        persistedProfileId: 'admin-1',
        activeProfileId: 'admin-1',
      }),
    ).toBe(false);
    expect(
      shouldBypassPinVerification({
        persistedRole: 'CHILD',
        persistedProfileId: 'child-1',
        activeProfileId: 'child-2',
      }),
    ).toBe(false);
  });
});
