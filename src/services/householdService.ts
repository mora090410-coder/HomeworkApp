import { householdService as baseHouseholdService } from '../../services/householdService';

export const householdService = baseHouseholdService;

export const verifyProfilePin = async (profileId: string, pin: string): Promise<boolean> => {
  return baseHouseholdService.verifyProfilePin(profileId, pin);
};

export const setProfilePin = async (profileId: string, pin: string): Promise<void> => {
  await baseHouseholdService.setProfilePin(profileId, pin);
};
