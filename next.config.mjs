import { withNextVideo } from "next-video/process";
/** @type {import('next').NextConfig} */

const nextConfig = {
  images: {
    domains: [
      'ptsbrkwalysbchtdharj.supabase.co',
      'lh3.googleusercontent.com',
    ],
  },
  async rewrites() {
    return [
      {
        source: '/',
        destination: 'https://capable-experiment-119185.framer.app/', // Framer page
      },
      {
        source: '/:path*',
        destination: '/:path*',
      },
    ];
  },
};

export default withNextVideo(nextConfig);
