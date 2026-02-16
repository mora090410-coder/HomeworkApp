interface ShouldBypassPinVerificationInput {
  persistedRole?: 'ADMIN' | 'CHILD' | 'MEMBER';
  persistedProfileId?: string;
  activeProfileId?: string;
}

export const shouldBypassPinVerification = (
  input: ShouldBypassPinVerificationInput,
): boolean => {
  return (
    input.persistedRole === 'CHILD' &&
    typeof input.persistedProfileId === 'string' &&
    input.persistedProfileId.length > 0 &&
    input.persistedProfileId === input.activeProfileId
  );
};
