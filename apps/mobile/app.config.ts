import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * app.json, plus the Firebase file of the Android app (push notifications). It stays out of the
 * repo: EAS hands it to the build through the GOOGLE_SERVICES_JSON file variable, a local copy is
 * used otherwise.
 */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  android: {
    ...config.android,
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
  },
});
