import { describe, expect, it } from 'vitest';
import { isUsernameFormatValid, normalizeUsernameForLookup } from '../childAuthUtils';

describe('child auth utils', () => {
  it('normalizes lookup usernames', () => {
    expect(normalizeUsernameForLookup('  KID.One ')).toBe('kid.one');
  });

  it('validates username format', () => {
    expect(isUsernameFormatValid('ok_name')).toBe(true);
    expect(isUsernameFormatValid('no spaces')).toBe(false);
  });
});
