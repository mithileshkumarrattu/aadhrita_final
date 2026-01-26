import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mvgr.student',
  appName: 'MVGR Student App',
  webDir: 'public',
  server: {
    url: 'https://mvgrcampus.vercel.app/',
    cleartext: true,
    androidScheme: 'https'
  }
};

export default config;
