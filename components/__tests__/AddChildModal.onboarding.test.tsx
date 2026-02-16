import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AddChildModal from '@/components/AddChildModal';

describe('AddChildModal onboarding', () => {
  it('does not render a PIN field in step 1', () => {
    render(<AddChildModal isOpen onClose={vi.fn()} onAdd={vi.fn()} />);

    expect(screen.queryByText(/pin/i)).not.toBeInTheDocument();
  });
});
