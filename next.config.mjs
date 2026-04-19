import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

if (process.env.NODE_ENV !== 'production') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // API v1 proxying is handled by app/api/v1 route handlers.
    return [];
  },
};

export default withNextIntl(nextConfig);



