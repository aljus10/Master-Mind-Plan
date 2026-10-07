import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aljus10.mastermindplan',
  appName: 'Master Mind Plan',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    StatusBar: {
      backgroundColor: '#09090b',
      style: 'DARK'
    }
  }
};

export default config;
