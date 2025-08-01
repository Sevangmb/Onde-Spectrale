import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Performance optimizations
  experimental: {
    optimizePackageImports: ['@radix-ui/react-icons', 'lucide-react'],
  },
  // Webpack configuration to handle Node.js modules
  webpack: (config: any, { isServer }: { isServer: boolean }) => {
    // Handle Node.js built-in modules for client-side
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
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
        util: false,
        buffer: false,
        process: false,
        dns: false,
        http2: false,
        async_hooks: false,
        perf_hooks: false,
      };
    }

    // Enable bundle analyzer when ANALYZE=true
    if (process.env.ANALYZE === 'true') {
      config.resolve.alias = {
        ...config.resolve.alias,
        // Alias for better tree shaking
      };
    }

    return config;
  },
};

export default nextConfig;
