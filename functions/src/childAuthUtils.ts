const USERNAME_PATTERN = /^[a-z0-9._-]{3,24}$/;

export const normalizeUsernameForLookup = (value: string): string => {
  return value.trim().toLowerCase();
};

export const isUsernameFormatValid = (value: string): boolean => {
  return USERNAME_PATTERN.test(normalizeUsernameForLookup(value));
};
