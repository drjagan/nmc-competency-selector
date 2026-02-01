/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable server-side SQLite with better-sqlite3
  serverExternalPackages: ['better-sqlite3'],

  // Experimental features
  experimental: {
    // Enable server actions
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },
};

export default nextConfig;
