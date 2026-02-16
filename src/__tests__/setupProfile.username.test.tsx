import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/householdService', () => {
  return {
    householdService: {
      validateProfileSetupLink: vi.fn().mockResolvedValue({
        householdId: 'household-1',
        profile: {
          id: 'profile-1',
          name: 'Emma',
          role: 'CHILD',
        },
      }),
      completeProfileSetup: vi.fn().mockResolvedValue(undefined),
    },
  };
});

import App from '@/src/App';

describe('setup profile route username field', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/setup-profile/profile-1?token=setup-token&householdId=household-1');
  });

  it('shows username field in setup profile flow', async () => {
    render(<App />);

    expect(await screen.findByLabelText(/setup username/i)).toBeInTheDocument();
  });
});
