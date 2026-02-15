export interface FunctionsConfig {
  timezone: string;
  appName: string;
}

export const functionsConfig: FunctionsConfig = {
  timezone: process.env.FUNCTIONS_TIMEZONE?.trim() || 'America/Chicago',
  appName: process.env.APP_NAME?.trim() || 'HomeWork',
};
