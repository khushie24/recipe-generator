import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yourname.ingredientscanner',
  appName: 'Ingredient Scanner',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
