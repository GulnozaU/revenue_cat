/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "512mb",
    },
  },
  // Allow large video uploads to API routes
  serverExternalPackages: ["@xenova/transformers", "sharp"],
};

export default nextConfig;
