import { describe, expect, it } from 'vitest';
import { createProfileWritePayload } from '@/services/householdService';

describe('profile write payloads', () => {
  it('defaults new child profiles to PROFILE_CREATED', () => {
    const payload = createProfileWritePayload({
      householdId: 'household-1',
      name: 'Emily',
    });

    expect(payload.setupStatus).toBe('PROFILE_CREATED');
    expect(payload.inviteLastSentAt).toBeNull();
    expect(payload.setupCompletedAt).toBeNull();
  });
});
