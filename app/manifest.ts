import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Black Brains',
    short_name: 'Black Brains',
    description: 'Premium AI-driven cybersecurity platform for automated website security testing and reporting.',
    start_url: '/',
    display: 'standalone',
    background_color: '#060b14',
    theme_color: '#060b14',
    icons: [
      {
        src: '/imgs/logo1234.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}