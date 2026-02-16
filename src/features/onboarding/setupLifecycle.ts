import type { ProfileSetupStatus } from '@/types';

export interface InviteSentTransition {
  setupStatus: 'INVITE_SENT';
  inviteLastSentAt: string;
}

export interface SetupCompleteTransition {
  setupStatus: 'SETUP_COMPLETE';
  setupCompletedAt: string;
}

export const markInviteSent = (
  _current: ProfileSetupStatus,
  atIso: string,
): InviteSentTransition => ({
  setupStatus: 'INVITE_SENT',
  inviteLastSentAt: atIso,
});

export const markSetupComplete = (
  _current: ProfileSetupStatus,
  atIso: string,
): SetupCompleteTransition => ({
  setupStatus: 'SETUP_COMPLETE',
  setupCompletedAt: atIso,
});
