/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',  // 静态导出，适合 Netlify
  trailingSlash: true,
  images: {
    unoptimized: true
  }
}

module.exports = nextConfig
