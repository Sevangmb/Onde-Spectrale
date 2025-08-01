import type { StorybookConfig } from '@storybook/nextjs';

const config: StorybookConfig = {
  "stories": [
    "../src/**/*.mdx",
    "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"
  ],
  "addons": [
    "@storybook/addon-docs",
    "@storybook/addon-onboarding",
    "@storybook/addon-controls",
    "@storybook/addon-actions",
    "@storybook/addon-viewport",
    "@storybook/addon-backgrounds",
    "@storybook/addon-measure",
    "@storybook/addon-outline"
  ],
  "framework": {
    "name": "@storybook/nextjs",
    "options": {}
  },
  webpackFinal: async (config) => {
    config.resolve = {
      ...config.resolve,
      alias: {
        ...config.resolve?.alias,
        '@/app/actions': require.resolve('../src/app/__mocks__/actions.ts'),
        '@/app/actions-enhanced': require.resolve('../src/app/__mocks__/actions-enhanced.ts'),
      },
      fallback: {
        ...config.resolve?.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
        http2: false,
        dns: false,
        async_hooks: false,
        buffer: false,
        perf_hooks: false,
        process: false,
        util: false,
        worker_threads: false,
        '@opentelemetry/exporter-jaeger': false,
        'node:util': false,
        'node:zlib': false,
        'node:net': false,
        'node:path': false,
        'node:perf_hooks': false,
        'node:process': false,
        'node:stream/web': false,
        'node:stream': false,
        'node:url': false,
      },
    };
    return config;
  }
};
export default config;