import { describe, expect, it } from 'vitest';
import { buildAdminResetPinPayload, buildChildLoginPayload } from '@/services/householdService';

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
