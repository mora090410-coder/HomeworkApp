const CHILD_USERNAME_PATTERN = /^[a-z0-9._-]{3,24}$/;

export const normalizeChildUsername = (input: string): string => {
  return input.trim().toLowerCase();
};

export const isValidChildUsername = (input: string): boolean => {
  return CHILD_USERNAME_PATTERN.test(normalizeChildUsername(input));
};
