import type { StorybookConfig } from '@storybook/nextjs';

const config: StorybookConfig = {
  "stories": [
    "../src/**/*.mdx",
    "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"
  ],
  "addons": [
    "@storybook/addon-docs",
    "@storybook/addon-onboarding"
  ],
  "framework": {
    "name": "@storybook/nextjs",
    "options": {}
  },
  webpackFinal: async (config) => {
    // Ignore Node.js polyfills that cause issues in Storybook
    config.resolve = config.resolve || {};
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "fs": false,
      "net": false,
      "tls": false,
      "crypto": false,
      "stream": false,
      "url": false,
      "zlib": false,
      "http": false,
      "https": false,
      "assert": false,
      "os": false,
      "path": false
    };
    return config;
  }
};
export default config;