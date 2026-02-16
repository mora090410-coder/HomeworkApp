import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ChildCard from '@/components/ChildCard';
import { Grade, type Child } from '@/types';

const makeChild = (setupStatus: Child['setupStatus']): Child => ({
  id: 'child-1',
  householdId: 'household-1',
  familyId: 'household-1',
  name: 'Emily',
  gradeLevel: '9th Grade',
  subjects: [{ id: 's1', name: 'Math', grade: Grade.A }],
  balance: 0,
  balanceCents: 0,
  history: [],
  customTasks: [],
  rates: {
    [Grade.A_PLUS]: 5,
    [Grade.A]: 4.75,
    [Grade.A_MINUS]: 4.5,
    [Grade.B_PLUS]: 4.25,
    [Grade.B]: 4,
    [Grade.B_MINUS]: 3.75,
    [Grade.C_PLUS]: 3.5,
    [Grade.C]: 0,
    [Grade.C_MINUS]: 0,
    [Grade.D]: 0,
    [Grade.F]: 0,
  },
  role: 'CHILD',
  setupStatus,
});

describe('ChildCard setup status', () => {
  it('shows setup pending badge for PROFILE_CREATED children', () => {
    render(
      <ChildCard
        child={makeChild('PROFILE_CREATED')}
        siblings={[]}
        onEditSettings={vi.fn()}
        onUpdateGrades={vi.fn()}
        onInviteChild={vi.fn()}
        onAssignTask={vi.fn()}
        onDeleteTask={vi.fn()}
        onEditTask={vi.fn()}
        onReassignTask={vi.fn()}
        onApproveTask={vi.fn()}
        onRejectTask={vi.fn()}
        onPayTask={vi.fn()}
        onUndoApproval={vi.fn()}
      />,
    );

    expect(screen.getByText('Setup Pending')).toBeInTheDocument();
  });
});
