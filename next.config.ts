import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "heartbeatofgod.foundation" }],
        destination: "https://heartbeatofgod.ca/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.heartbeatofgod.foundation" }],
        destination: "https://heartbeatofgod.ca/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "hbgmedia.heartbeatofgod.foundation" }],
        destination: "https://heartbeatofgod.ca/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
