import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import SettingsModal from '@/components/SettingsModal';
import { Child, Grade } from '@/types';

const childFixture: Child = {
  id: 'child-1',
  householdId: 'household-1',
  familyId: 'household-1',
  name: 'Emma',
  gradeLevel: '5th Grade',
  subjects: [{ id: 'sub-1', name: 'Math', grade: Grade.B }],
  balance: 0,
  balanceCents: 0,
  currentHourlyRate: 4,
  history: [],
  customTasks: [],
  rates: {
    [Grade.A_PLUS]: 5,
    [Grade.A]: 4.75,
    [Grade.A_MINUS]: 4.5,
    [Grade.B_PLUS]: 4.25,
    [Grade.B]: 4,
    [Grade.B_MINUS]: 3.75,
    [Grade.C_PLUS]: 0,
    [Grade.C]: 0,
    [Grade.C_MINUS]: 0,
    [Grade.D]: 0,
    [Grade.F]: 0,
  },
  role: 'CHILD',
  loginUsername: 'emma_01',
};

describe('SettingsModal child credentials controls', () => {
  it('shows username and reset pin controls', () => {
    render(
      <SettingsModal
        isOpen
        onClose={() => undefined}
        child={childFixture}
        onSave={() => undefined}
        onDelete={() => undefined}
      />,
    );

    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset pin/i })).toBeInTheDocument();
  });
});
