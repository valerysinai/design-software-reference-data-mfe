import { federation } from '@module-federation/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'referenceDataMfe',
      filename: 'remoteEntry.js',
      dts: false,
      exposes: {
        './App': './src/App.tsx',
        './ParameterizationHub': './src/ParameterizationHub.tsx',
      },
      shared: {
        react: { singleton: true, requiredVersion: '^18.3.1' },
        'react-dom': { singleton: true, requiredVersion: '^18.3.1' },
        'react-router-dom': { singleton: true, requiredVersion: '^6.26.0' },
      },
    }),
  ],
  server: {
    port: 5105,
  },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.{ts,tsx}'],
    // The suite mounts the MFE repeatedly in jsdom; a single worker avoids
    // resource contention and makes the standard npm test command stable.
    maxWorkers: 1,
  },
});
