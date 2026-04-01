import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

const API_BASE_URL = process.env.API_BASE_URL;

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    if (!API_BASE_URL) {
      return [];
    }

    return [
      {
        source: '/api/v1/:path*',
        destination: `${API_BASE_URL}/api/v1/:path*`,
      },
    ];
  },
};

export default withNextIntl(nextConfig);



