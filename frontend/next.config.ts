import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/auth/:path*',
        destination: 'http://ec2-34-236-216-5.compute-1.amazonaws.com:4001/api/auth/:path*',
      },
      {
        source: '/api/appointments/:path*',
        destination: 'http://ec2-34-236-216-5.compute-1.amazonaws.com:4002/api/appointments/:path*',
      },
      {
        source: '/api/notifications/:path*',
        destination: 'http://ec2-34-236-216-5.compute-1.amazonaws.com:4003/api/notifications/:path*',
      },
      {
        source: '/api/messages/:path*',
        destination: 'http://ec2-34-236-216-5.compute-1.amazonaws.com:4003/api/messages/:path*',
      },
      {
        source: '/socket.io/:path*',
        destination: 'http://ec2-34-236-216-5.compute-1.amazonaws.com:4003/socket.io/:path*',
      }
    ];
  },
};

export default nextConfig;
