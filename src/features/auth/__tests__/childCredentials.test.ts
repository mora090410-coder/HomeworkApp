import { describe, expect, it } from 'vitest';
import { isValidChildUsername, normalizeChildUsername } from '@/features/auth/childCredentials';

describe('child credential helpers', () => {
  it('normalizes username casing and whitespace', () => {
    expect(normalizeChildUsername('  Emma.Rose  ')).toBe('emma.rose');
  });

  it('rejects invalid usernames and accepts supported format', () => {
    expect(isValidChildUsername('ab')).toBe(false);
    expect(isValidChildUsername('bad name')).toBe(false);
    expect(isValidChildUsername('emily_01')).toBe(true);
  });
});
