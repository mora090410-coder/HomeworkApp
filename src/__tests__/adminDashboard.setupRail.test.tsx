import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AdminSetupRail from '@/components/AdminSetupRail';

describe('AdminSetupRail', () => {
  it('shows first-run setup messaging and CTA', () => {
    render(<AdminSetupRail completedSteps={0} onStartAddChild={vi.fn()} />);

    expect(screen.getByText(/Set up your first child in under 2 minutes/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add First Child/i })).toBeInTheDocument();
  });
});
