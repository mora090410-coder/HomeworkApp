import { householdService as baseHouseholdService } from '../../services/householdService';

export const householdService = baseHouseholdService;

export const verifyProfilePin = async (
  householdId: string,
  profileId: string,
  pin: string,
): Promise<boolean> => {
  return baseHouseholdService.verifyProfilePinInHousehold(householdId, profileId, pin);
};

export const setProfilePin = async (
  householdId: string,
  profileId: string,
  pin: string,
): Promise<void> => {
  await baseHouseholdService.setProfilePinInHousehold(householdId, profileId, pin);
};

export const saveGradeConfigs = async (
  householdId: string,
  configs: GradeConfig[],
): Promise<void> => {
  return baseHouseholdService.saveGradeConfigs(householdId, configs);
};
