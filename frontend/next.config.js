/** @type {import('next').NextConfig} */
const BACKEND_URL = process.env.BACKEND_URL || 'http://backend:4000';

module.exports = {
  output: 'standalone', // menghasilkan server minimal -> image runtime kecil
  poweredByHeader: false,
  async rewrites() {
    // Browser hanya bicara ke :3000; request /api/* diteruskan ke service "backend" lewat network Docker.
    return [{ source: '/api/:path*', destination: `${BACKEND_URL}/api/:path*` }];
  },
};
