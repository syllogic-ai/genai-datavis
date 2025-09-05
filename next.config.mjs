import { withNextVideo } from "next-video/process";
/** @type {import('next').NextConfig} */

const nextConfig = {
  images: {
    domains: ['ptsbrkwalysbchtdharj.supabase.co', 'lh3.googleusercontent.com'],
  },
};

export default withNextVideo(nextConfig);