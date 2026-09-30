/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "512mb",
    },
  },
  // Allow large video uploads to API routes
  serverExternalPackages: ["@xenova/transformers", "sharp"],
  // ffmpeg.wasm loads core from CDN via blob URLs; no COOP required for single-thread
  headers: async () => [
    {
      source: "/fonts/:path*",
      headers: [
        { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        { key: "Access-Control-Allow-Origin", value: "*" },
      ],
    },
  ],
};

export default nextConfig;
