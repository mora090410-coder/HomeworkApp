import { describe, expect, it } from 'vitest';
import { markInviteSent, markSetupComplete } from '../setupLifecycle';
import type { ProfileSetupStatus } from '@/types';

describe('setup lifecycle', () => {
  it('transitions to INVITE_SENT when invite is generated', () => {
    const next = markInviteSent('PROFILE_CREATED', '2026-02-16T00:00:00.000Z');

    expect(next.setupStatus).toBe('INVITE_SENT');
    expect(next.inviteLastSentAt).toBe('2026-02-16T00:00:00.000Z');
  });

  it('transitions to SETUP_COMPLETE when child finishes setup', () => {
    const next = markSetupComplete('INVITE_SENT', '2026-02-16T00:00:00.000Z');

    expect(next.setupStatus).toBe('SETUP_COMPLETE');
    expect(next.setupCompletedAt).toBe('2026-02-16T00:00:00.000Z');
  });

  it('accepts any current lifecycle status value', () => {
    const current: ProfileSetupStatus = 'PROFILE_CREATED';
    const next = markInviteSent(current, '2026-02-16T01:00:00.000Z');

    expect(next.setupStatus).toBe('INVITE_SENT');
  });
});
