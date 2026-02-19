import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import AuthScreen from '@/components/AuthScreen';

describe('AuthScreen child mode', () => {
  it('renders child sign-in mode controls', () => {
    render(
      <MemoryRouter>
        <AuthScreen onSuccess={() => undefined} initialMode="LOGIN" />
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: /child sign in/i })).toBeInTheDocument();
  });
});
